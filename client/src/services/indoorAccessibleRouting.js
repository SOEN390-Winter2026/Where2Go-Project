import { indoorMaps } from "../data/indoorData";
import { MinCostHeap } from "../utils/MinCostHeap";
import { extractFloorPlan } from "../utils/floorPlanUtils";
import { trailingAsciiDigitSuffix } from "../utils/trailingDigits";

const MAX_FREE_EDGE_DIST = 0.12;
const GRAPH_CACHE = new Map();
// Room types that represent vertical/horizontal transfer points.
// Synthetic waypoints for these rooms must keep their type so the routing
// engine builds floor-transfer edges for them (Bug 1 fix).
const TRANSFER_ROOM_TYPES = new Set(["elevator", "escalator", "staircase", "exit"]);

function roomCenter(room) {
  const { x, y, w, h } = room?.bounds || {};
  if (x == null || y == null || w == null || h == null) return null;
  return { x: x + w / 2, y: y + h / 2 };
}

function dist(a, b) {
  const dx = (a?.x ?? 0) - (b?.x ?? 0);
  const dy = (a?.y ?? 0) - (b?.y ?? 0);
  return Math.hypot(dx, dy);
}

function isHallwayRoom(room) {
  const t = String(room?.type || "").toLowerCase();
  return t === "hallway" || t === "corridor";
}

function isHallwayPolygon(room) {
  if (!room?.bounds) return false;
  if (isHallwayRoom(room)) return true;
  const id = String(room?.id || "").toLowerCase().trim();
  const label = String(room?.label || "").toLowerCase().trim();
  return id === "hallway" || label === "hallway";
}

function pointInBounds(point, bounds, eps = 0) {
  if (!point || !bounds) return false;
  return (
    point.x >= bounds.x - eps &&
    point.x <= bounds.x + bounds.w + eps &&
    point.y >= bounds.y - eps &&
    point.y <= bounds.y + bounds.h + eps
  );
}

function pointInAnyBounds(point, rooms, eps = 0) {
  for (const room of rooms) {
    if (pointInBounds(point, room?.bounds, eps)) return true;
  }
  return false;
}

function expandBounds(bounds, eps) {
  if (!bounds) return null;
  return { x: bounds.x - eps, y: bounds.y - eps, w: bounds.w + 2 * eps, h: bounds.h + 2 * eps };
}

function collectHubsForHallwayPolygon(hr, waypoints, idToWp) {
  const expanded = expandBounds(hr.bounds, 0.06) || hr.bounds;
  const hubs = new Map();
  for (const w of waypoints) {
    if (!w?.id || !w?.position) continue;
    if (pointInBounds(w.position, expanded, 0.002)) hubs.set(String(w.id), w);
  }
  const nw = hr?.nearestWaypoint ? String(hr.nearestWaypoint) : null;
  if (nw && idToWp.has(nw)) hubs.set(nw, idToWp.get(nw));
  const list = [...hubs.values()];
  const b = hr.bounds;
  if (list.length >= 2) {
    if (b.h >= b.w) list.sort((a, c) => (a.position?.y ?? 0) - (c.position?.y ?? 0));
    else list.sort((a, c) => (a.position?.x ?? 0) - (c.position?.x ?? 0));
  }
  return { bounds: hr.bounds, hubs: list };
}

function collectAllHallHubIdsAndChainAlongPolygons(hallGroups) {
  const allHubIds = new Set();
  for (const g of hallGroups) {
    for (let i = 0; i < g.hubs.length; i += 1) {
      const w = g.hubs[i];
      allHubIds.add(String(w.id));
      if (i + 1 < g.hubs.length) addBidirectionalConnection(w, g.hubs[i + 1]);
    }
  }
  return allHubIds;
}

function findClosestHubPairBetweenGroups(hubsA, hubsB) {
  let bestA = null; let bestB = null; let bestD = Infinity;
  for (const wa of hubsA) {
    for (const wb of hubsB) {
      const d = dist(wa.position, wb.position);
      if (d < bestD) { bestD = d; bestA = wa; bestB = wb; }
    }
  }
  return { bestA, bestB, bestD };
}

function tryBridgeHallGroups(hallGroups, hallwayWaysForSnap) {
  for (let gi = 0; gi < hallGroups.length; gi += 1) {
    for (let gj = gi + 1; gj < hallGroups.length; gj += 1) {
      const a = hallGroups[gi].hubs; const b = hallGroups[gj].hubs;
      if (!a.length || !b.length) continue;
      const { bestA, bestB, bestD } = findClosestHubPairBetweenGroups(a, b);
      if (!bestA || !bestB || bestD >= 0.42) continue;
      const [snapA, snapB] = snapToHallwaySpine(bestA.position, bestB.position, hallwayWaysForSnap);
      if (hallwayEdgeAllowed(snapA, snapB, hallwayWaysForSnap) || bestD < 0.2) {
        addBidirectionalConnection(bestA, bestB);
      }
    }
  }
}

function findNearestHallHub(wp, allHubIds, idToWp) {
  let best = null; let bestD = Infinity;
  for (const id of allHubIds) {
    const h = idToWp.get(id);
    if (!h?.position || !wp?.position) continue;
    const d = dist(wp.position, h.position);
    if (d < bestD) { bestD = d; best = h; }
  }
  return best ? { hub: best, d: bestD } : { hub: null, d: Infinity };
}

function waypointTouchesHallHub(wp, allHubIds) {
  for (const hid of wp.connections || []) {
    if (allHubIds.has(String(hid))) return true;
  }
  return false;
}

/**
 * FIX (Bug 4): Restrict the unconditional short-distance bypass to transfer-type
 * waypoints only. Regular waypoints (corridor, door, intersection) must have a
 * valid hallway path to avoid linking through walls.
 */
function maybeLinkWaypointToHallHub(wp, maxDist, allHubIds, idToWp, hallwayWaysForSnap) {
  if (!wp?.id || !wp?.position) return;
  if (waypointTouchesHallHub(wp, allHubIds)) return;
  const { hub, d } = findNearestHallHub(wp, allHubIds, idToWp);
  if (!hub || d > maxDist) return;
  const [snapA, snapB] = snapToHallwaySpine(wp.position, hub.position, hallwayWaysForSnap);
  const typeLow = String(wp.type || "").toLowerCase();
  const isTransfer = TRANSFER_ROOM_TYPES.has(typeLow);
  if (hallwayEdgeAllowed(snapA, snapB, hallwayWaysForSnap) || (isTransfer && d < 0.25)) {
    addBidirectionalConnection(wp, hub);
  }
}

function linkNonHallRoomDoorsToHalls(rooms, idToWp, allHubIds, hallwayWaysForSnap) {
  for (const room of rooms) {
    if (isHallwayPolygon(room)) continue;
    const wid = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
    if (!wid || !idToWp.has(wid)) continue;
    maybeLinkWaypointToHallHub(idToWp.get(wid), 0.38, allHubIds, idToWp, hallwayWaysForSnap);
  }
}

function linkExitStairElevatorWaypointsToHalls(waypoints, allHubIds, idToWp, hallwayWaysForSnap) {
  for (const wp of waypoints) {
    if (!wp?.id) continue;
    const t = String(wp.type || "").toLowerCase();
    if (t !== "exit" && t !== "staircase" && t !== "elevator" && t !== "escalator") continue;
    maybeLinkWaypointToHallHub(wp, 0.45, allHubIds, idToWp, hallwayWaysForSnap);
  }
}

function tryLinkRoomDoorwayToHub(room, hubWaypoint, idToWp) {
  if (isHallwayPolygon(room)) return;
  const wid = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
  const wp = wid ? idToWp.get(wid) : null;
  if (wp) addBidirectionalConnection(wp, hubWaypoint);
}

function linkAllNonHallRoomDoorsToHub(hubWaypoint, rooms, idToWp) {
  for (const room of rooms) { tryLinkRoomDoorwayToHub(room, hubWaypoint, idToWp); }
}

function fallbackBridgeEmptyHallGroup(g, rooms, waypoints, idToWp) {
  if (g.hubs.length) return;
  const c = roomCenter({ bounds: g.bounds });
  if (!c) return;
  const nearestId = nearestWaypointIdByPosition(waypoints, c);
  const hubWaypoint = nearestId ? idToWp.get(nearestId) : null;
  if (!hubWaypoint) return;
  linkAllNonHallRoomDoorsToHub(hubWaypoint, rooms, idToWp);
}

function fallbackLinkRoomsWhenHallHasNoHubs(hallGroups, rooms, waypoints, idToWp) {
  for (const g of hallGroups) { fallbackBridgeEmptyHallGroup(g, rooms, waypoints, idToWp); }
}

function ensureHallwaySpanningConnections(floorPlan) {
  const rooms = Array.isArray(floorPlan?.rooms) ? floorPlan.rooms : [];
  const waypoints = Array.isArray(floorPlan?.waypoints) ? floorPlan.waypoints : [];
  if (!waypoints.length) return;
  const hallwayRooms = rooms.filter((r) => isHallwayPolygon(r) && r.bounds);
  if (!hallwayRooms.length) return;
  const hallwayWaysForSnap = hallwayRooms.filter((r) => r?.bounds);
  const idToWp = new Map(waypoints.filter((w) => w?.id).map((w) => [String(w.id), w]));
  const hallGroups = hallwayRooms.map((hr) => collectHubsForHallwayPolygon(hr, waypoints, idToWp));
  const allHubIds = collectAllHallHubIdsAndChainAlongPolygons(hallGroups);
  tryBridgeHallGroups(hallGroups, hallwayWaysForSnap);
  linkNonHallRoomDoorsToHalls(rooms, idToWp, allHubIds, hallwayWaysForSnap);
  linkExitStairElevatorWaypointsToHalls(waypoints, allHubIds, idToWp, hallwayWaysForSnap);
  fallbackLinkRoomsWhenHallHasNoHubs(hallGroups, rooms, waypoints, idToWp);
}

function snapToHallwaySpine(from, to, hallwayRooms) {
  if (!Array.isArray(hallwayRooms) || hallwayRooms.length === 0) return [from, to];
  for (const room of hallwayRooms) {
    const b = room?.bounds;
    if (!b) continue;
    const spineY = b.y + b.h / 2;
    const inHallX = (p) => p?.x >= b.x && p?.x <= b.x + b.w;
    if (inHallX(from) && inHallX(to)) {
      return [{ x: from.x, y: spineY }, { x: to.x, y: spineY }];
    }
  }
  return [from, to];
}

function hallwayEdgeAllowed(from, to, hallwayRooms) {
  if (!Array.isArray(hallwayRooms) || hallwayRooms.length === 0) {
    return dist(from, to) <= MAX_FREE_EDGE_DIST;
  }
  const SAMPLES = 12;
  for (let i = 1; i < SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const eps = t <= 0.15 || t >= 0.85 ? 0.03 : 0.002;
    if (!pointInAnyBounds(p, hallwayRooms, eps)) return false;
  }
  return true;
}

export function findNearestWaypointId(floorGraphs, floorId, roomId, waypointId) {
  const floorGraph = floorGraphs?.get?.(floorId);
  if (!floorGraph) return null;
  if (waypointId) {
    const wid = String(waypointId);
    if (floorGraph.waypointById?.has?.(wid)) return wid;
  }
  const rooms = Array.isArray(floorGraph.floorPlan.rooms) ? floorGraph.floorPlan.rooms : [];
  const matchedRoom = rooms.find(
    (r) => String(r?.id).toLowerCase() === String(roomId).toLowerCase()
  );
  if (matchedRoom?.nearestWaypoint) {
    const wid = String(matchedRoom.nearestWaypoint);
    if (floorGraph.waypointById?.has?.(wid)) return wid;
  }
  const roomBoundsCenter = roomCenter(matchedRoom);
  const waypoints = Array.isArray(floorGraph.floorPlan.waypoints) ? floorGraph.floorPlan.waypoints : [];
  if (!roomBoundsCenter || waypoints.length === 0) return null;
  const closestWaypoint = waypoints.reduce((prev, curr) =>
    dist(roomBoundsCenter, curr.position) < dist(roomBoundsCenter, prev.position) ? curr : prev
  );
  return closestWaypoint?.id ? String(closestWaypoint.id) : null;
}

function getTrailingDigits(value) { return trailingAsciiDigitSuffix(value); }

function normalizeFloorAlias(value) {
  const text = String(value ?? "").toLowerCase();
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i);
    if ((code >= 48 && code <= 57) || (code >= 97 && code <= 122)) out += text[i];
  }
  return out;
}

function nodePenalty(nodeType, rules) {
  const type = String(nodeType || "").toLowerCase();
  if (type === "staircase") return rules.avoidStairs ? Infinity : rules.stairsPenalty;
  if (type === "elevator")  return rules.elevatorBonus;
  if (type === "escalator") return rules.avoidStairs ? Infinity : 0;
  return 0;
}

function addEdge(adjacencyList, fromKey, toKey, weight) {
  if (!Number.isFinite(weight)) return;
  if (!adjacencyList.has(fromKey)) adjacencyList.set(fromKey, []);
  adjacencyList.get(fromKey).push({ to: toKey, w: weight });
}

function addFloorAliases(floorAliases, floorId, floorPlan) {
  const addAlias = (value) => {
    if (value == null) return;
    floorAliases.set(String(value).toLowerCase(), floorId);
  };
  addAlias(floorId);
  addAlias(floorPlan?.floor);
}

function enrichFloorAliases(floorAliases) {
  for (const [alias, canonicalFloorId] of Array.from(floorAliases.entries())) {
    const compactAlias = normalizeFloorAlias(alias);
    floorAliases.set(compactAlias, canonicalFloorId);
    const trailingNumber = getTrailingDigits(alias);
    if (trailingNumber) floorAliases.set(trailingNumber, canonicalFloorId);
  }
}

function createFloorResolver(floorAliases) {
  return (value) => {
    if (value == null) return null;
    const raw = String(value).toLowerCase();
    return (
      floorAliases.get(raw) ??
      floorAliases.get(normalizeFloorAlias(raw)) ??
      floorAliases.get(getTrailingDigits(raw)) ??
      null
    );
  };
}

function connectSameFloorWaypoints(adjacencyList, floorId, waypoint, waypointById, rules) {
  const sourceKey = `${floorId}::${waypoint.id}`;
  (Array.isArray(waypoint.connections) ? waypoint.connections : []).forEach((toId) => {
    const toWaypointId = String(toId);
    const toWaypoint = waypointById.get(toWaypointId);
    if (!toWaypoint) return;
    const targetKey = `${floorId}::${toWaypointId}`;
    const wFwd = dist(waypoint.position, toWaypoint.position) + nodePenalty(toWaypoint.type, rules);
    const wRev = dist(waypoint.position, toWaypoint.position) + nodePenalty(waypoint.type, rules);
    addEdge(adjacencyList, sourceKey, targetKey, wFwd);
    addEdge(adjacencyList, targetKey, sourceKey, wRev);
  });
}

function connectLocalProximityWaypoints(adjacencyList, floorId, floorPlan, rules) {
  const wps = (floorPlan?.waypoints || []).filter((w) => w?.id && w?.position);
  if (wps.length < 2) return;
  const hallwayRooms = (floorPlan?.rooms || []).filter((r) => r?.bounds && isHallwayPolygon(r));
  const MAX_LOCAL_DIST = 0.08;
  const MAX_NEIGHBORS = 4;
  for (const from of wps) {
    const candidates = [];
    for (const to of wps) {
      if (String(from.id) === String(to.id)) continue;
      const d = dist(from.position, to.position);
      if (!Number.isFinite(d) || d > MAX_LOCAL_DIST) continue;
      candidates.push({ to, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    for (const { to } of candidates.slice(0, MAX_NEIGHBORS)) {
      const [snapA, snapB] = snapToHallwaySpine(from.position, to.position, hallwayRooms);
      if (!hallwayEdgeAllowed(snapA, snapB, hallwayRooms)) continue;
      const forwardFromKey = `${floorId}::${from.id}`;
      const forwardToKey = `${floorId}::${to.id}`;
      const edgeDist = dist(snapA, snapB);
      addEdge(adjacencyList, forwardFromKey, forwardToKey, edgeDist + nodePenalty(to.type, rules));
      addEdge(adjacencyList, forwardToKey, forwardFromKey, edgeDist + nodePenalty(from.type, rules));
    }
  }
}

function pickClosestNodesBetweenComponents(anchorSample, compSample, euclidBetweenKeys) {
  let bestA = null; let bestB = null; let bestD = Infinity;
  for (const a of anchorSample) {
    for (const b of compSample) {
      const d = euclidBetweenKeys(a, b);
      if (d < bestD) { bestD = d; bestA = a; bestB = b; }
    }
  }
  return { bestA, bestB, bestD };
}

function isBridgeCandidateAllowed({ bestA, bestB, bestD, hasHallwayRooms, waypointById, idFromKey, hallwayRooms }) {
  if (!bestA || !bestB || !Number.isFinite(bestD) || bestD >= 1e9) return false;
  if (!hasHallwayRooms) return true;
  if (bestD > 0.14) return false;
  const wa = waypointById.get(idFromKey(bestA));
  const wb = waypointById.get(idFromKey(bestB));
  if (!wa?.position || !wb?.position) return false;
  const [snapA, snapB] = snapToHallwaySpine(wa.position, wb.position, hallwayRooms);
  return hallwayEdgeAllowed(snapA, snapB, hallwayRooms);
}

function bridgeDisconnectedComponentsOnFloor(adjacencyList, floorId, floorPlan, waypointById, rules) {
  const wps = (floorPlan.waypoints || []).filter((w) => w?.id);
  if (wps.length < 2) return;
  const hallwayRooms = (floorPlan?.rooms || []).filter((r) => r?.bounds && isHallwayPolygon(r));
  const hasHallwayRooms = hallwayRooms.length > 0;
  const nodeKey = (id) => `${floorId}::${id}`;
  const idFromKey = (key) => key.slice(key.indexOf("::") + 2);

  function undirectedNeighbors() {
    const m = new Map();
    for (const w of wps) m.set(nodeKey(w.id), new Set());
    for (const [from, edges] of adjacencyList.entries()) {
      if (!from.startsWith(`${floorId}::`)) continue;
      for (const { to } of edges) {
        if (!m.has(from)) m.set(from, new Set());
        if (!m.has(to)) m.set(to, new Set());
        m.get(from).add(to); m.get(to).add(from);
      }
    }
    return m;
  }

  function componentsFrom(adj) {
    const keys = wps.map((w) => nodeKey(w.id));
    const visited = new Set(); const out = [];
    for (const start of keys) {
      if (visited.has(start)) continue;
      const comp = []; const stack = [start];
      visited.add(start);
      while (stack.length) {
        const u = stack.pop(); comp.push(u);
        for (const v of adj.get(u) || []) {
          if (!visited.has(v)) { visited.add(v); stack.push(v); }
        }
      }
      out.push(comp);
    }
    return out;
  }

  function edgeWeightBetween(u, v) {
    const uu = waypointById.get(idFromKey(u));
    const vv = waypointById.get(idFromKey(v));
    if (!uu?.position || !vv?.position) return Infinity;
    return dist(uu.position, vv.position) + nodePenalty(vv.type, rules);
  }

  function euclidBetweenKeys(u, v) {
    const uu = waypointById.get(idFromKey(u));
    const vv = waypointById.get(idFromKey(v));
    if (!uu?.position || !vv?.position) return Infinity;
    return dist(uu.position, vv.position);
  }

  const adj = undirectedNeighbors();
  const comps = componentsFrom(adj);
  if (comps.length <= 1) return;

  const MAX_SAMPLE_PER_COMPONENT = 80;
  const sampleNodes = (comp) => {
    if (comp.length <= MAX_SAMPLE_PER_COMPONENT) return comp;
    const out = []; const step = Math.ceil(comp.length / MAX_SAMPLE_PER_COMPONENT);
    for (let i = 0; i < comp.length; i += step) out.push(comp[i]);
    return out;
  };

  let anchor = comps[0];
  for (const comp of comps) { if (comp.length > anchor.length) anchor = comp; }

  for (const comp of comps) {
    if (comp === anchor) continue;
    const { bestA, bestB, bestD } = pickClosestNodesBetweenComponents(
      sampleNodes(anchor), sampleNodes(comp), euclidBetweenKeys
    );
    if (!isBridgeCandidateAllowed({ bestA, bestB, bestD, hasHallwayRooms, waypointById, idFromKey, hallwayRooms })) continue;
    addEdge(adjacencyList, bestA, bestB, edgeWeightBetween(bestA, bestB));
    addEdge(adjacencyList, bestB, bestA, edgeWeightBetween(bestB, bestA));
    anchor = anchor.concat(comp);
  }
}

function pickClosestTransferWaypoint(waypoint, candidates) {
  return candidates.reduce((prev, curr) =>
    dist(waypoint.position, curr.position) < dist(waypoint.position, prev.position) ? curr : prev
  );
}

function indexFloorWaypoints(floorPlan) {
  const waypointById = new Map();
  const waypointsByType = new Map();
  for (const w of floorPlan.waypoints) {
    if (!w?.id) continue;
    waypointById.set(String(w.id), w);
    const t = String(w.type || "").toLowerCase();
    if (!waypointsByType.has(t)) waypointsByType.set(t, []);
    waypointsByType.get(t).push(w);
  }
  return { waypointById, waypointsByType };
}

function nearestWaypointIdByPosition(waypoints, position, excludeId = null) {
  let best = null; let bestD = Infinity;
  for (const w of waypoints) {
    if (!w?.id || !w?.position) continue;
    if (excludeId && String(w.id) === String(excludeId)) continue;
    const d = dist(position, w.position);
    if (d < bestD) { bestD = d; best = String(w.id); }
  }
  return best;
}

function hasConnection(from, toId) {
  if (!Array.isArray(from?.connections)) return false;
  return from.connections.some((id) => String(id) === String(toId));
}

function addBidirectionalConnection(a, b) {
  if (!a?.id || !b?.id) return;
  if (!Array.isArray(a.connections)) a.connections = [];
  if (!Array.isArray(b.connections)) b.connections = [];
  if (!hasConnection(a, b.id)) a.connections.push(String(b.id));
  if (!hasConnection(b, a.id)) b.connections.push(String(a.id));
}

/**
 * FIX (Bug 1): Preserve the room's transfer type in the synthetic waypoint.
 * Previously every synthetic waypoint was typed "door", which meant escalator/elevator
 * room waypoints were never given floor-transfer edges by linkElevatorAndStairTransfersForAllFloors.
 *
 * FIX (Bug 4 partial): For non-transfer rooms, only connect to a waypoint that is
 * reachable without crossing a wall. This prevents room-center synthetic waypoints from
 * routing through walls to the nearest hallway hub.
 */
function ensureRoomDoorwayWaypoint(room, floorPlan, floorId, idSet, syntheticState) {
  if (!room?.id) return;
  const center = roomCenter(room);
  if (!center) return;
  const nearestId = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
  if (nearestId && idSet.has(nearestId)) return;

  const roomTypeLower = String(room.type || "").toLowerCase();
  const isTransfer = TRANSFER_ROOM_TYPES.has(roomTypeLower);
  const syntheticType = isTransfer ? roomTypeLower : "door";

  const syntheticId = `__room_${String(floorId)}_${syntheticState.count++}`;

  let nearestExisting = null;
  const hallwayRoomsHere = Array.isArray(floorPlan.rooms)
    ? floorPlan.rooms.filter((r) => r?.bounds && isHallwayPolygon(r))
    : [];

  if (isTransfer || hallwayRoomsHere.length === 0) {
    // Transfer-type rooms live inside their own polygons — just use nearest waypoint.
    nearestExisting = nearestWaypointIdByPosition(floorPlan.waypoints, center);
  } else {
    // Regular rooms: prefer a connection that doesn't cross a wall.
    let bestD = Infinity;
    for (const wp of floorPlan.waypoints) {
      if (!wp?.id || !wp?.position) continue;
      const d = dist(center, wp.position);
      if (d >= bestD) continue;
      const [sA, sB] = snapToHallwaySpine(center, wp.position, hallwayRoomsHere);
      if (hallwayEdgeAllowed(sA, sB, hallwayRoomsHere)) {
        bestD = d; nearestExisting = String(wp.id);
      }
    }
    // If no wall-free connection found, fall back to nearest anyway.
    if (!nearestExisting) nearestExisting = nearestWaypointIdByPosition(floorPlan.waypoints, center);
  }

  const wp = {
    id: syntheticId, type: syntheticType,
    floor: floorPlan.floor ?? floorId,
    position: center,
    connections: nearestExisting ? [nearestExisting] : [],
  };
  floorPlan.waypoints.push(wp);
  idSet.add(syntheticId);
  room.nearestWaypoint = syntheticId;

  if (!nearestExisting) return;
  const neighbor = floorPlan.waypoints.find((x) => String(x?.id) === nearestExisting);
  if (!neighbor) return;
  if (!Array.isArray(neighbor.connections)) neighbor.connections = [];
  if (!neighbor.connections.includes(syntheticId)) neighbor.connections.push(syntheticId);
}

function ensureExitWaypointLink(wp, waypoints) {
  if (!wp?.id || String(wp.type || "").toLowerCase() !== "exit") return;
  if (Array.isArray(wp.connections) && wp.connections.length > 0) return;
  const nearest = nearestWaypointIdByPosition(waypoints, wp.position, wp.id);
  if (!nearest) return;
  wp.connections = [nearest];
  const neighbor = waypoints.find((x) => String(x?.id) === nearest);
  if (!neighbor) return;
  if (!Array.isArray(neighbor.connections)) neighbor.connections = [];
  if (!neighbor.connections.includes(String(wp.id))) neighbor.connections.push(String(wp.id));
}

function ensureTransferWaypointLink(wp, waypoints) {
  if (!wp?.id) return;
  const t = String(wp.type || "").toLowerCase();
  if (t !== "staircase" && t !== "elevator" && t !== "escalator") return;
  if (Array.isArray(wp.connections) && wp.connections.length > 0) return;
  const TRANSFER_TYPES = new Set(["staircase", "elevator", "escalator"]);
  const nonTransfer = waypoints.filter(
    (w) => w?.id && w?.position && !TRANSFER_TYPES.has(String(w.type || "").toLowerCase())
  );
  const nearest = nearestWaypointIdByPosition(nonTransfer, wp.position, null);
  if (!nearest) return;
  if (!Array.isArray(wp.connections)) wp.connections = [];
  wp.connections.push(nearest);
  const neighbor = waypoints.find((x) => String(x?.id) === nearest);
  if (!neighbor) return;
  if (!Array.isArray(neighbor.connections)) neighbor.connections = [];
  if (!neighbor.connections.includes(String(wp.id))) neighbor.connections.push(String(wp.id));
}

function isKnnNeighborCandidate(from, to, maxLinkDist, hallwayRooms) {
  if (!to?.id || !to?.position) return false;
  if (String(from.id) === String(to.id)) return false;
  const d = dist(from.position, to.position);
  if (!Number.isFinite(d) || d > maxLinkDist) return false;
  const [snapA, snapB] = snapToHallwaySpine(from.position, to.position, hallwayRooms);
  return hallwayEdgeAllowed(snapA, snapB, hallwayRooms);
}

function collectSortedKnnNeighborIds(from, waypoints, maxLinkDist, hallwayRooms) {
  const neighbors = [];
  for (const to of waypoints) {
    if (!isKnnNeighborCandidate(from, to, maxLinkDist, hallwayRooms)) continue;
    neighbors.push({ id: String(to.id), d: dist(from.position, to.position) });
  }
  neighbors.sort((a, b) => a.d - b.d);
  return neighbors;
}

function connectKnnNeighborsForWaypoint(from, waypoints, maxLinkDist, maxNeighbors, hallwayRooms, idToWaypoint) {
  const neighbors = collectSortedKnnNeighborIds(from, waypoints, maxLinkDist, hallwayRooms);
  for (const n of neighbors.slice(0, maxNeighbors)) {
    const to = idToWaypoint.get(n.id);
    if (!to) continue;
    addBidirectionalConnection(from, to);
  }
}

function populateMissingWaypointConnections(floorPlan) {
  const waypoints = Array.isArray(floorPlan?.waypoints) ? floorPlan.waypoints : [];
  if (waypoints.length < 2) return;
  const hallwayRooms = (floorPlan?.rooms || []).filter((r) => r?.bounds && isHallwayPolygon(r));
  const hasHallways = hallwayRooms.length > 0;
  const maxLinkDist = hasHallways ? 0.11 : 0.08;
  const maxNeighbors = 3;
  const idToWaypoint = new Map(waypoints.filter((w) => w?.id).map((w) => [String(w.id), w]));
  for (const from of waypoints) {
    if (!from?.id || !from?.position) continue;
    if (!Array.isArray(from.connections)) from.connections = [];
    if (from.connections.length > 0) continue;
    connectKnnNeighborsForWaypoint(from, waypoints, maxLinkDist, maxNeighbors, hallwayRooms, idToWaypoint);
  }
}

function ensureRoomAndExitConnectivity(floorPlan, floorId) {
  if (!Array.isArray(floorPlan?.waypoints)) return;
  const rooms = Array.isArray(floorPlan?.rooms) ? floorPlan.rooms : [];
  const waypoints = floorPlan.waypoints;
  const idSet = new Set(waypoints.filter((w) => w?.id).map((w) => String(w.id)));
  const syntheticState = { count: 0 };
  for (const room of rooms) { ensureRoomDoorwayWaypoint(room, floorPlan, floorId, idSet, syntheticState); }
  for (const wp of waypoints) { ensureExitWaypointLink(wp, waypoints); ensureTransferWaypointLink(wp, waypoints); }
  populateMissingWaypointConnections(floorPlan);
  ensureHallwaySpanningConnections(floorPlan);
}

function buildFloorGraphsAndAliases(buildingData, floorAliases) {
  const floorGraphs = new Map();
  for (const floorId of Object.keys(buildingData)) {
    const srcFloorPlan = extractFloorPlan(buildingData[floorId]?.data, floorId);
    if (!Array.isArray(srcFloorPlan?.waypoints)) continue;
    const floorPlan = {
      ...srcFloorPlan,
      rooms: Array.isArray(srcFloorPlan.rooms)
        ? srcFloorPlan.rooms.map((r) => ({ ...r, bounds: r?.bounds ? { ...r.bounds } : r?.bounds }))
        : srcFloorPlan.rooms,
      waypoints: srcFloorPlan.waypoints.map((w) => ({
        ...w,
        position: w?.position ? { ...w.position } : w?.position,
        connections: Array.isArray(w?.connections) ? [...w.connections] : [],
        floorsReachable: Array.isArray(w?.floorsReachable) ? [...w.floorsReachable] : w?.floorsReachable,
      })),
    };
    ensureRoomAndExitConnectivity(floorPlan, floorId);
    const { waypointById, waypointsByType } = indexFloorWaypoints(floorPlan);
    floorGraphs.set(floorId, { floorPlan, waypointById, waypointsByType });
    addFloorAliases(floorAliases, floorId, floorPlan);
  }
  return floorGraphs;
}

// FIX: `continue` → `return` (continue is only valid inside a loop).
// FIX: removed stray `}` that cut the function short before floorsReachable.forEach.
// FIX: added escalator guard and processing.
function connectTransferWaypoints({ adjacencyList, floorId, waypoint, pointType, floorGraphs, resolveFloorId, rules }) {
  if (pointType === "staircase" && rules.avoidStairs) return;
  if (pointType === "escalator" && rules.avoidStairs) return;
  if (pointType !== "elevator" && pointType !== "staircase" && pointType !== "escalator") return;

  let floorsReachable = waypoint.floorsReachable || [];

  if (floorsReachable.length === 0) {
    const currentFloorStr = String(floorId).toLowerCase();
    const currentDigits = trailingAsciiDigitSuffix(currentFloorStr);
    const currentNum = currentDigits ? Number.parseInt(currentDigits, 10) : NaN;

    // The non-digit prefix of the current floor key, e.g.:
    //   "1"  → prefix ""    (pure numeric, main floors)
    //   "9"  → prefix ""
    //   "s1" → prefix "s"   (sub-basement)
    //   "s2" → prefix "s"
    //   "h9" → prefix "h"   (Hall-style keys)
    // We only infer adjacency within the same prefix group so that sub-basement
    // floors ("S1","S2") are never incorrectly linked to main floors ("1".."9")
    // due to a trailing-digit collision (both "1" and "S1" have digit "1").
    const currentPrefix = currentDigits
      ? currentFloorStr.slice(0, currentFloorStr.length - currentDigits.length)
      : currentFloorStr;

    if (!Number.isNaN(currentNum)) {
      const allFloorIds = Array.from(floorGraphs.keys())
        .map(id => {
          const idStr = String(id).toLowerCase();
          const digits = trailingAsciiDigitSuffix(idStr);
          if (!digits) return null;
          const prefix = idStr.slice(0, idStr.length - digits.length);
          if (prefix !== currentPrefix) return null; // different stack — skip
          return { key: id, num: Number.parseInt(digits, 10) };
        })
        .filter(Boolean)
        .sort((a, b) => a.num - b.num);

      let prevEntry = null;
      for (const f of allFloorIds) { if (f.num < currentNum) prevEntry = f; }
      const nextEntry = allFloorIds.find(f => f.num > currentNum);
      floorsReachable = [prevEntry?.key, nextEntry?.key].filter(Boolean);
    }
  }

  floorsReachable.forEach((targetFloorId) => {
    const targetStr = resolveFloorId(targetFloorId);
    if (!targetStr || targetStr === floorId || !floorGraphs.has(targetStr)) return;
    const targetFloorGraph = floorGraphs.get(targetStr);
    const candidates = targetFloorGraph.waypointsByType?.get(pointType) ?? [];
    if (candidates.length === 0) return;
    const sameShaftMatch = pickClosestTransferWaypoint(waypoint, candidates);
    const edgeWeight = rules.floorTransferCost + nodePenalty(pointType, rules);
    addEdge(adjacencyList, `${floorId}::${waypoint.id}`, `${targetStr}::${sameShaftMatch.id}`, edgeWeight);
  });
}

function linkSameFloorEdgesForAllFloors(floorGraphs, adjacencyList, rules) {
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    for (const waypoint of floorPlan.waypoints) {
      if (!waypoint?.id) continue;
      connectSameFloorWaypoints(adjacencyList, floorId, waypoint, waypointById, rules);
    }
    connectLocalProximityWaypoints(adjacencyList, floorId, floorPlan, rules);
  }
}

function bridgeDisconnectedComponentsForAllFloors(floorGraphs, adjacencyList, rules) {
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    bridgeDisconnectedComponentsOnFloor(adjacencyList, floorId, floorPlan, waypointById, rules);
  }
}

// FIX: added "escalator" so escalator waypoints get floor-transfer edges built.
function linkElevatorAndStairTransfersForAllFloors(floorGraphs, adjacencyList, resolveFloorId, rules) {
  for (const [floorId, { floorPlan }] of floorGraphs.entries()) {
    for (const waypoint of floorPlan.waypoints) {
      if (!waypoint?.id) continue;
      const pointType = String(waypoint.type || "").toLowerCase();
      if (pointType !== "elevator" && pointType !== "staircase" && pointType !== "escalator") continue;
      connectTransferWaypoints({ adjacencyList, floorId, waypoint, pointType, floorGraphs, resolveFloorId, rules });
    }
  }
}

function linkAllFloorWaypoints({ floorGraphs, adjacencyList, resolveFloorId, rules }) {
  linkSameFloorEdgesForAllFloors(floorGraphs, adjacencyList, rules);
  bridgeDisconnectedComponentsForAllFloors(floorGraphs, adjacencyList, rules);
  linkElevatorAndStairTransfersForAllFloors(floorGraphs, adjacencyList, resolveFloorId, rules);
}

function buildMultiFloorGraph({ campus, buildingCode, rules }) {
  const buildingData = indoorMaps?.[campus]?.[buildingCode];
  if (!buildingData) return null;
  const adjacencyList = new Map();
  const floorAliases = new Map();
  const floorGraphs = buildFloorGraphsAndAliases(buildingData, floorAliases);
  enrichFloorAliases(floorAliases);
  const resolveFloorId = createFloorResolver(floorAliases);
  linkAllFloorWaypoints({ floorGraphs, adjacencyList, resolveFloorId, rules });
  return { adjacencyList, floorGraphs, resolveFloorId };
}

function graphCacheKey({ campus, buildingCode, rules }) {
  return `${String(campus)}::${String(buildingCode)}::avoidStairs=${rules.avoidStairs ? "1" : "0"}`;
}

function getCachedMultiFloorGraph({ campus, buildingCode, rules }) {
  const key = graphCacheKey({ campus, buildingCode, rules });
  if (GRAPH_CACHE.has(key)) return GRAPH_CACHE.get(key);
  const graph = buildMultiFloorGraph({ campus, buildingCode, rules });
  if (graph) GRAPH_CACHE.set(key, graph);
  return graph;
}

function dijkstra(startNode, goalNode, adjacencyList) {
  const distances = new Map([[startNode, 0]]);
  const previous = new Map();
  const open = new MinCostHeap();
  open.push({ nodeKey: startNode, cost: 0 });
  while (open.length > 0) {
    const { nodeKey: curr, cost: d } = open.pop();
    if (curr === goalNode) break;
    if (d > (distances.get(curr) ?? Infinity)) continue;
    for (const { to, w } of adjacencyList.get(curr) || []) {
      const newCost = d + w;
      if (newCost < (distances.get(to) ?? Infinity)) {
        distances.set(to, newCost);
        previous.set(to, curr);
        open.push({ nodeKey: to, cost: newCost });
      }
    }
  }
  if (!distances.has(goalNode)) return { success: false };
  const path = [];
  let step = goalNode;
  while (step) { path.push(step); step = previous.get(step); }
  return { success: true, path: path.slice().reverse(), cost: distances.get(goalNode) };
}

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function missingEndpointFields(endpoint) {
  if (endpoint == null || typeof endpoint !== "object") return ["floor", "room"];
  const missing = [];
  if (isBlank(endpoint.floor)) missing.push("floor");
  if (isBlank(endpoint.room) && isBlank(endpoint.waypointId)) missing.push("room");
  return missing;
}

function buildInvalidInputMeta(details) {
  return { success: false, meta: { reason: "INVALID_INPUT", details } };
}

function buildLocationNotFoundMeta(startWaypointId, goalWaypointId, from, to, fromFloorId, toFloorId) {
  const details = {};
  if (!startWaypointId) details.from = { floor: from.floor, room: from.room ?? null, waypointId: from.waypointId ?? null, resolvedFloorId: fromFloorId };
  if (!goalWaypointId) details.to = { floor: to.floor, room: to.room ?? null, waypointId: to.waypointId ?? null, resolvedFloorId: toFloorId };
  return { success: false, meta: { reason: "LOCATION_NOT_FOUND", details } };
}

export function generateAccessibleIndoorPath({ campus, buildingCode, from, to, avoidStairs = true } = {}) {
  const rules = {
    avoidStairs: !!avoidStairs,
    stairsPenalty: 2,
    elevatorBonus: avoidStairs ? 0 : 10,
    floorTransferCost: 1,
  };

  const rootMissing = [];
  if (isBlank(campus)) rootMissing.push("campus");
  if (isBlank(buildingCode)) rootMissing.push("buildingCode");
  const fromMissing = missingEndpointFields(from);
  const toMissing = missingEndpointFields(to);

  if (rootMissing.length || fromMissing.length || toMissing.length) {
    const details = {};
    if (rootMissing.length) details.missingFields = rootMissing;
    if (fromMissing.length) details.from = { missingFields: fromMissing };
    if (toMissing.length) details.to = { missingFields: toMissing };
    return buildInvalidInputMeta(details);
  }

  const graph = getCachedMultiFloorGraph({ campus, buildingCode, rules });
  if (!graph) return { success: false, meta: { reason: "INVALID_BUILDING" } };

  const fromFloorId = graph.resolveFloorId(from.floor) ?? String(from.floor);
  const toFloorId = graph.resolveFloorId(to.floor) ?? String(to.floor);
  const startWaypointId = findNearestWaypointId(graph.floorGraphs, fromFloorId, from.room, from.waypointId);
  const goalWaypointId = findNearestWaypointId(graph.floorGraphs, toFloorId, to.room, to.waypointId);

  if (!startWaypointId || !goalWaypointId) {
    return buildLocationNotFoundMeta(startWaypointId, goalWaypointId, from, to, fromFloorId, toFloorId);
  }

  const result = dijkstra(`${fromFloorId}::${startWaypointId}`, `${toFloorId}::${goalWaypointId}`, graph.adjacencyList);
  if (!result.success) return { success: false, meta: { reason: "NO_PATH" } };

  const path = result.path
    .map((nodeKey) => {
      const sep = nodeKey.indexOf("::");
      const floorId = sep === -1 ? nodeKey : nodeKey.slice(0, sep);
      const waypointId = sep === -1 ? "" : nodeKey.slice(sep + 2);
      const floorGraph = graph.floorGraphs.get(floorId);
      const waypoint = floorGraph?.waypointById?.get(waypointId);
      if (!waypoint) return null;
      return { floor: floorId, id: waypointId, type: waypoint.type ?? null, position: waypoint.position ?? null };
    })
    .filter(Boolean);

  return { success: true, path, cost: result.cost };
}

/**
 * FIX: rulesB.elevatorBonus was 0; corrected to 10 to match generateAccessibleIndoorPath
 * cost rules for non-accessible mode. The cache key only encodes avoidStairs so a wrong
 * elevatorBonus would silently persist and serve incorrect edge weights.
 */
export function warmupIndoorGraph(campus, buildingCode) {
  if (!campus || !buildingCode) return;
  const rulesA = { avoidStairs: true,  stairsPenalty: 2, elevatorBonus: 0,  floorTransferCost: 1 };
  const rulesB = { avoidStairs: false, stairsPenalty: 2, elevatorBonus: 10, floorTransferCost: 1 };
  getCachedMultiFloorGraph({ campus, buildingCode, rules: rulesA });
  getCachedMultiFloorGraph({ campus, buildingCode, rules: rulesB });
}