import { indoorMaps } from "../data/indoorData";
import { MinCostHeap } from "../utils/MinCostHeap";
import { extractFloorPlan } from "../utils/floorPlanUtils";
import { trailingAsciiDigitSuffix } from "../utils/trailingDigits";

// Cache graph build per building+rules
const GRAPH_CACHE = new Map();

/**
 * UTILITIES
 */
// Center of a room rectangle (normalized 0–1 coords), for "nearest waypoint" fallback.
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

// Hallway/corridor walkable polygons for routing 

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
  return {
    x: bounds.x - eps,
    y: bounds.y - eps,
    w: bounds.w + 2 * eps,
    h: bounds.h + 2 * eps,
  };
}

/**
 * Guardrail code to ensure the floor is one coherent navigable network. (Will rarely get used, unless the maps are not well connected)
 * ties every room door (and exits/transfers) into hallway hub waypoints and
 * chain hubs along each hallway polygon so the floor is one coherent navigable network.
 */

function ensureHallwaySpanningConnections(floorPlan) {
  const rooms = Array.isArray(floorPlan?.rooms) ? floorPlan.rooms : [];
  const waypoints = Array.isArray(floorPlan?.waypoints) ? floorPlan.waypoints : [];
  if (!waypoints.length) return;

  const hallwayRooms = rooms.filter((r) => isHallwayPolygon(r) && r.bounds);
  if (!hallwayRooms.length) return;

  const hallwayWaysForSnap = hallwayRooms.filter((r) => r?.bounds);
  const idToWp = new Map(waypoints.filter((w) => w?.id).map((w) => [String(w.id), w]));

  const hallGroups = hallwayRooms.map((hr) => {
    const expanded = expandBounds(hr.bounds, 0.06) || hr.bounds;
    const hubs = new Map();
    for (const w of waypoints) {
      if (!w?.id || !w?.position) continue;
      if (pointInBounds(w.position, expanded, 0.002)) {
        hubs.set(String(w.id), w);
      }
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
  });

  const allHubIds = new Set();
  for (const g of hallGroups) {
    for (let i = 0; i < g.hubs.length; i += 1) {
      const w = g.hubs[i];
      allHubIds.add(String(w.id));
      if (i + 1 < g.hubs.length) addBidirectionalConnection(w, g.hubs[i + 1]);
    }
  }

  for (let gi = 0; gi < hallGroups.length; gi += 1) {
    for (let gj = gi + 1; gj < hallGroups.length; gj += 1) {
      const a = hallGroups[gi].hubs;
      const b = hallGroups[gj].hubs;
      if (!a.length || !b.length) continue;
      let bestA = null;
      let bestB = null;
      let bestD = Infinity;
      for (const wa of a) {
        for (const wb of b) {
          const d = dist(wa.position, wb.position);
          if (d < bestD) {
            bestD = d;
            bestA = wa;
            bestB = wb;
          }
        }
      }
      if (bestA && bestB && bestD < 0.42) {
        const [snapA, snapB] = snapToHallwaySpine(bestA.position, bestB.position, hallwayWaysForSnap);
        if (hallwayEdgeAllowed(snapA, snapB, hallwayWaysForSnap) || bestD < 0.2) {
          addBidirectionalConnection(bestA, bestB);
        }
      }
    }
  }

  const nearestHallHubForWaypoint = (wp) => {
    let best = null;
    let bestD = Infinity;
    for (const id of allHubIds) {
      const h = idToWp.get(id);
      if (!h?.position || !wp?.position) continue;
      const d = dist(wp.position, h.position);
      if (d < bestD) {
        bestD = d;
        best = h;
      }
    }
    if (best) return { hub: best, d: bestD };
    return { hub: null, d: Infinity };
  };

  const maybeLinkToHall = (wp, maxDist = 0.35) => {
    if (!wp?.id || !wp?.position) return;
    let touchesHall = false;
    for (const hid of wp.connections || []) {
      if (allHubIds.has(String(hid))) {
        touchesHall = true;
        break;
      }
    }
    if (touchesHall) return;
    const { hub, d } = nearestHallHubForWaypoint(wp);
    if (!hub || d > maxDist) return;
    const [snapA, snapB] = snapToHallwaySpine(wp.position, hub.position, hallwayWaysForSnap);
    if (hallwayEdgeAllowed(snapA, snapB, hallwayWaysForSnap) || d < 0.12) {
      addBidirectionalConnection(wp, hub);
    }
  };

  for (const room of rooms) {
    if (isHallwayPolygon(room)) continue;
    const wid = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
    if (!wid || !idToWp.has(wid)) continue;
    maybeLinkToHall(idToWp.get(wid), 0.38);
  }

  for (const wp of waypoints) {
    if (!wp?.id) continue;
    const t = String(wp.type || "").toLowerCase();
    if (t === "exit" || t === "staircase" || t === "elevator") {
      maybeLinkToHall(wp, 0.45);
    }
  }

  for (const g of hallGroups) {
    if (g.hubs.length) continue;
    const c = roomCenter({ bounds: g.bounds });
    if (!c) continue;
    const nearestId = nearestWaypointIdByPosition(waypoints, c);
    const nw = nearestId ? idToWp.get(nearestId) : null;
    if (nw) {
      for (const room of rooms) {
        if (isHallwayPolygon(room)) continue;
        const wid = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
        const wp = wid ? idToWp.get(wid) : null;
        if (wp) addBidirectionalConnection(wp, nw);
      }
    }
  }
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
  if (!Array.isArray(hallwayRooms) || hallwayRooms.length === 0) return true;
  // Keep interior samples inside hallway; allow endpoint slack for door points at room thresholds.
  const SAMPLES = 12;
  for (let i = 1; i < SAMPLES; i += 1) {
    const t = i / SAMPLES;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    const eps = t <= 0.15 || t >= 0.85 ? 0.03 : 0.002;
    if (!pointInAnyBounds(p, hallwayRooms, eps)) return false;
  }
  return true;
}

// Resolve room -> graph waypoint id: explicit waypoint id, or room.nearestWaypoint,
// or closest waypoint to the room's bounds center.
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
  const waypoints = Array.isArray(floorGraph.floorPlan.waypoints)
    ? floorGraph.floorPlan.waypoints
    : [];
  if (!roomBoundsCenter || waypoints.length === 0) return null;

  const closestWaypoint = waypoints.reduce((prev, curr) =>
    dist(roomBoundsCenter, curr.position) < dist(roomBoundsCenter, prev.position) ? curr : prev
  );
  return closestWaypoint?.id ? String(closestWaypoint.id) : null;
}

// Extract trailing digits from a string: e.g. "H-7" -> "7".
// This lets us treat "7" and "H-7" as aliases for the same graph floor key.
function getTrailingDigits(value) {
  return trailingAsciiDigitSuffix(value);
}

// Lowercase letters+digits only (strips spaces/dashes for loose matching).
function normalizeFloorAlias(value) {
  const text = String(value ?? "").toLowerCase();
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const code = text.codePointAt(i);
    const isDigit = code >= 48 && code <= 57;
    const isLowerAlpha = code >= 97 && code <= 122;
    if (isDigit || isLowerAlpha) out += text[i];
  }
  return out;
}

/**
 * GRAPH BUILDING — nodes are "floorId::waypointId"; edges are Euclidean distance + penalties below.
 */
function nodePenalty(nodeType, rules) {
  const type = String(nodeType || "").toLowerCase();
  if (type === "staircase") return rules.avoidStairs ? Infinity : rules.stairsPenalty;
  if (type === "elevator") return rules.elevatorBonus;
  return 0;
}

function addEdge(adjacencyList, fromKey, toKey, weight) {
  if (!Number.isFinite(weight)) return;
  if (!adjacencyList.has(fromKey)) adjacencyList.set(fromKey, []);
  adjacencyList.get(fromKey).push({ to: toKey, w: weight });
}

// Map user-facing floor strings to the graph floor key (the object key in `indoorMaps`).
//
// Example:
// - `indoorMaps` stores floors under keys like "7" and "8"
// - the floor plan may also have a `floor` string like "H-7"
// - both "7" and "H-7" resolve to the same graph floor key "7"
function addFloorAliases(floorAliases, floorId, floorPlan) {
  const addAlias = (value) => {
    if (value == null) return;
    floorAliases.set(String(value).toLowerCase(), floorId);
  };
  addAlias(floorId);
  addAlias(floorPlan?.floor);
}

// Extra lookup keys for the same graph floor key:
// - compact form: normalize "H-7" -> "h7" (strip spaces/dashes, lowercase)
// - trailing digit: getTrailingDigits("H-7") -> "7"
function enrichFloorAliases(floorAliases) {
  for (const [alias, canonicalFloorId] of Array.from(floorAliases.entries())) {
    const compactAlias = normalizeFloorAlias(alias);
    floorAliases.set(compactAlias, canonicalFloorId);
    const trailingNumber = getTrailingDigits(alias);
    if (trailingNumber) floorAliases.set(trailingNumber, canonicalFloorId);
  }
}

// Turn user input (e.g. "H-7", "7", "h7") into the graph floor key used by the routing graph.
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
      const fromKey = `${floorId}::${from.id}`;
      const toKey = `${floorId}::${to.id}`;
      const edgeDist = dist(snapA, snapB);
      addEdge(adjacencyList, fromKey, toKey, edgeDist + nodePenalty(to.type, rules));
      addEdge(adjacencyList, toKey, fromKey, edgeDist + nodePenalty(from.type, rules));
    }
  }
}


function pickClosestNodesBetweenComponents(anchorSample, compSample, euclidBetweenKeys) {
  let bestA = null;
  let bestB = null;
  let bestD = Infinity;
  for (const a of anchorSample) {
    for (const b of compSample) {
      const d = euclidBetweenKeys(a, b);
      if (d < bestD) {
        bestD = d;
        bestA = a;
        bestB = b;
      }
    }
  }
  return { bestA, bestB, bestD };
}

function isBridgeCandidateAllowed({
  bestA,
  bestB,
  bestD,
  hasHallwayRooms,
  waypointById,
  idFromKey,
  hallwayRooms,
}) {
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
        m.get(from).add(to);
        m.get(to).add(from);
      }
    }
    return m;
  }

  function componentsFrom(adj) {
    const keys = wps.map((w) => nodeKey(w.id));
    const visited = new Set();
    const out = [];
    for (const start of keys) {
      if (visited.has(start)) continue;
      const comp = [];
      const stack = [start];
      visited.add(start);
      while (stack.length) {
        const u = stack.pop();
        comp.push(u);
        for (const v of adj.get(u) || []) {
          if (!visited.has(v)) {
            visited.add(v);
            stack.push(v);
          }
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
    const out = [];
    const step = Math.ceil(comp.length / MAX_SAMPLE_PER_COMPONENT);
    for (let i = 0; i < comp.length; i += step) out.push(comp[i]);
    return out;
  };

  let anchor = comps[0];
  for (const comp of comps) {
    if (comp.length > anchor.length) anchor = comp;
  }

  for (const comp of comps) {
    if (comp === anchor) continue;
    const anchorSample = sampleNodes(anchor);
    const compSample = sampleNodes(comp);
    const { bestA, bestB, bestD } = pickClosestNodesBetweenComponents(
      anchorSample,
      compSample,
      euclidBetweenKeys
    );
    if (
      !isBridgeCandidateAllowed({
        bestA,
        bestB,
        bestD,
        hasHallwayRooms,
        waypointById,
        idFromKey,
        hallwayRooms,
      })
    ) continue;
    const wAB = edgeWeightBetween(bestA, bestB);
    const wBA = edgeWeightBetween(bestB, bestA);
    addEdge(adjacencyList, bestA, bestB, wAB);
    addEdge(adjacencyList, bestB, bestA, wBA);
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
  // Map: waypointTypeLower -> waypoints[]
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
  let best = null;
  let bestD = Infinity;
  for (const w of waypoints) {
    if (!w?.id || !w?.position) continue;
    if (excludeId && String(w.id) === String(excludeId)) continue;
    const d = dist(position, w.position);
    if (d < bestD) {
      bestD = d;
      best = String(w.id);
    }
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

function ensureRoomDoorwayWaypoint(room, floorPlan, floorId, idSet, syntheticState) {
  if (!room?.id) return;
  const center = roomCenter(room);
  if (!center) return;
  const nearestId = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
  if (nearestId && idSet.has(nearestId)) return;

  const syntheticId = `__room_${String(floorId)}_${syntheticState.count++}`;
  const nearestExisting = nearestWaypointIdByPosition(floorPlan.waypoints, center);
  const wp = {
    id: syntheticId,
    type: "door",
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

function populateMissingWaypointConnections(floorPlan) {
  const waypoints = Array.isArray(floorPlan?.waypoints) ? floorPlan.waypoints : [];
  if (waypoints.length < 2) return;

  const hallwayRooms = (floorPlan?.rooms || []).filter((r) => r?.bounds && isHallwayPolygon(r));
  const hasHallways = hallwayRooms.length > 0;
  const MAX_LINK_DIST = hasHallways ? 0.11 : 0.08;
  const MAX_NEIGHBORS = 3;
  const idToWaypoint = new Map(waypoints.filter((w) => w?.id).map((w) => [String(w.id), w]));

  for (const from of waypoints) {
    if (!from?.id || !from?.position) continue;
    if (!Array.isArray(from.connections)) from.connections = [];
    // Keep authored topology intact; only fill sparse nodes.
    if (from.connections.length > 0) continue;

    const neighbors = [];
    for (const to of waypoints) {
      if (!to?.id || !to?.position) continue;
      if (String(from.id) === String(to.id)) continue;
      const d = dist(from.position, to.position);
      if (!Number.isFinite(d) || d > MAX_LINK_DIST) continue;
      const [snapA, snapB] = snapToHallwaySpine(from.position, to.position, hallwayRooms);
      if (!hallwayEdgeAllowed(snapA, snapB, hallwayRooms)) continue;
      neighbors.push({ id: String(to.id), d });
    }

    neighbors.sort((a, b) => a.d - b.d);
    for (const n of neighbors.slice(0, MAX_NEIGHBORS)) {
      const to = idToWaypoint.get(n.id);
      if (!to) continue;
      addBidirectionalConnection(from, to);
    }
  }
}

/**
 * - Ensure every room has a usable entry waypoint.
 * - Ensure each exit waypoint is linked to the local graph so inter-building routes can leave/enter.
 */
function ensureRoomAndExitConnectivity(floorPlan, floorId) {
  if (!Array.isArray(floorPlan?.waypoints)) return;
  const rooms = Array.isArray(floorPlan?.rooms) ? floorPlan.rooms : [];
  const waypoints = floorPlan.waypoints;
  const idSet = new Set(waypoints.filter((w) => w?.id).map((w) => String(w.id)));
  const syntheticState = { count: 0 };

  // Ensure each room has an accessible doorway waypoint.
  for (const room of rooms) {
    ensureRoomDoorwayWaypoint(room, floorPlan, floorId, idSet, syntheticState);
  }

  // Ensure exits have at least one walkable link.
  for (const wp of waypoints) {
    ensureExitWaypointLink(wp, waypoints);
  }

  // Deterministically fill empty waypoint connections from floor geometry.
  // This avoids hand-editing every JSON while keeping authored links untouched.
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
        ? srcFloorPlan.rooms.map((r) => ({
            ...r,
            bounds: r?.bounds ? { ...r.bounds } : r?.bounds,
          }))
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

// Elevator/stair links between floors: match the nearest same-type waypoint on the target floor
function connectTransferWaypoints({
  adjacencyList,
  floorId,
  waypoint,
  pointType,
  floorGraphs,
  resolveFloorId,
  rules,
}) {
  // No stair edges at all when accessibility mode avoids stairs.
  if (pointType === "staircase" && rules.avoidStairs) return;

  let floorsReachable = waypoint.floorsReachable || [];

  // If no floorsReachable specified, infer adjacent floors
  if (floorsReachable.length === 0) {
    const allFloorIds = Array.from(floorGraphs.keys()).map(id => parseInt(id)).filter(id => !isNaN(id)).sort((a, b) => a - b);
    const currentFloorNum = parseInt(floorId);
    if (!isNaN(currentFloorNum)) {
      const prevFloor = allFloorIds.find(f => f === currentFloorNum - 1);
      const nextFloor = allFloorIds.find(f => f === currentFloorNum + 1);
      floorsReachable = [prevFloor, nextFloor].filter(f => f != null).map(f => f.toString());
    }
  }

  floorsReachable.forEach((targetFloorId) => {
    const targetStr = resolveFloorId(targetFloorId);
    if (!targetStr || targetStr === floorId || !floorGraphs.has(targetStr)) return;

    const targetFloorGraph = floorGraphs.get(targetStr);
    // avoid scanning all waypoints for every transfer edge.
    const candidates = targetFloorGraph.waypointsByType?.get(pointType) ?? [];
    if (candidates.length === 0) return;

    const sameShaftMatch = pickClosestTransferWaypoint(waypoint, candidates);
    const edgeWeight = rules.floorTransferCost + nodePenalty(pointType, rules);
    addEdge(adjacencyList, `${floorId}::${waypoint.id}`, `${targetStr}::${sameShaftMatch.id}`, edgeWeight);
  });
}

function linkAllFloorWaypoints({ floorGraphs, adjacencyList, resolveFloorId, rules }) {
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    for (const waypoint of floorPlan.waypoints) {
      if (!waypoint?.id) continue;
      connectSameFloorWaypoints(adjacencyList, floorId, waypoint, waypointById, rules);
    }
    connectLocalProximityWaypoints(adjacencyList, floorId, floorPlan, rules);
  }
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    bridgeDisconnectedComponentsOnFloor(adjacencyList, floorId, floorPlan, waypointById, rules);
  }
  for (const [floorId, { floorPlan }] of floorGraphs.entries()) {
    for (const waypoint of floorPlan.waypoints) {
      if (!waypoint?.id) continue;
      const pointType = String(waypoint.type || "").toLowerCase();
      const isTransferPoint = pointType === "elevator" || pointType === "staircase";
      if (!isTransferPoint) continue;

      connectTransferWaypoints({
        adjacencyList,
        floorId,
        waypoint,
        pointType,
        floorGraphs,
        resolveFloorId,
        rules,
      });
    }
  }
}

function buildMultiFloorGraph({ campus, buildingCode, rules }) {
  const buildingData = indoorMaps?.[campus]?.[buildingCode];
  if (!buildingData) return null;

  const adjacencyList = new Map();
  const floorAliases = new Map(); // normalized alias -> graph floor key ("7", "8", ...)

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
    // Stale entry: we already found a shorter path to curr (lazy heap — no decrease-key).
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
  // Walk predecessors from goal back to start, then reverse.
  const path = [];
  let step = goalNode;
  while (step) {
    path.push(step);
    step = previous.get(step);
  }
  const reversed = path.slice().reverse();
  return { success: true, path: reversed, cost: distances.get(goalNode) };
}

function isBlank(value) {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/** Which required fields are missing on an endpoint (`room` satisfied by `waypointId`). */
function missingEndpointFields(endpoint) {
  if (endpoint == null || typeof endpoint !== "object") {
    return ["floor", "room"];
  }
  const missing = [];
  if (isBlank(endpoint.floor)) missing.push("floor");
  if (isBlank(endpoint.room) && isBlank(endpoint.waypointId)) missing.push("room");
  return missing;
}

function buildInvalidInputMeta(details) {
  return { success: false, meta: { reason: "INVALID_INPUT", details } };
}

//builds the LOCATION_NOT_FOUND error detail object
function buildLocationNotFoundMeta(startWaypointId, goalWaypointId, from, to, fromFloorId, toFloorId) {
  const details = {};
  if (!startWaypointId) {
    details.from = {
      floor: from.floor,
      room: from.room ?? null,
      waypointId: from.waypointId ?? null,
      resolvedFloorId: fromFloorId,
    };
  }
  if (!goalWaypointId) {
    details.to = {
      floor: to.floor,
      room: to.room ?? null,
      waypointId: to.waypointId ?? null,
      resolvedFloorId: toFloorId,
    };
  }
  return { success: false, meta: { reason: "LOCATION_NOT_FOUND", details } };
}

/**
 * MAIN EXPORT
 * @param {object} [opts]
 * @param {boolean} [opts.avoidStairs=true] When true, stairwells are not used for vertical moves.
 */
export function generateAccessibleIndoorPath({ campus, buildingCode, from, to, avoidStairs = true } = {}) {
  const rules = {
    avoidStairs: !!avoidStairs,
    stairsPenalty: 2,
    elevatorBonus: -0.1,
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
  const startWaypointId = findNearestWaypointId(
    graph.floorGraphs,
    fromFloorId,
    from.room,
    from.waypointId
  );
  const goalWaypointId = findNearestWaypointId(
    graph.floorGraphs,
    toFloorId,
    to.room,
    to.waypointId
  );

  if (!startWaypointId || !goalWaypointId) {
    return buildLocationNotFoundMeta(startWaypointId, goalWaypointId, from, to, fromFloorId, toFloorId);
  }

  // Use the normalized floor IDs for node keys to match the graph keys exactly.
  const startKey = `${fromFloorId}::${startWaypointId}`;
  const goalKey = `${toFloorId}::${goalWaypointId}`;
  const result = dijkstra(startKey, goalKey, graph.adjacencyList);

  if (!result.success) return { success: false, meta: { reason: "NO_PATH" } };

  const path = result.path
    .map((nodeKey) => {
      const sep = nodeKey.indexOf("::");
      const floorId = sep === -1 ? nodeKey : nodeKey.slice(0, sep);
      const waypointId = sep === -1 ? "" : nodeKey.slice(sep + 2);
      const floorGraph = graph.floorGraphs.get(floorId);
      const waypoint = floorGraph?.waypointById?.get(waypointId);
      if (!waypoint) return null;
      return {
        floor: floorId,
        id: waypointId,
        type: waypoint.type ?? null,
        position: waypoint.position ?? null,
      };
    })
    .filter(Boolean);

  return { success: true, path, cost: result.cost };
}