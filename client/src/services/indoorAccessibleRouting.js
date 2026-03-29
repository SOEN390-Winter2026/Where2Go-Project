import { indoorMaps } from "../data/indoorData";
import { MinCostHeap } from "../utils/MinCostHeap";
import { extractFloorPlan } from "../utils/floorPlanUtils";

// Cache graph build per building+rules
const GRAPH_CACHE = new Map();

// Cache graph build per building+rules
const GRAPH_CACHE = new Map();

/**
 * UTILITIES
 */
const floorKeyToString = String;

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
  const text = String(value ?? "");
  let end = text.length;
  while (end > 0) {
    const code = text.codePointAt(end - 1);
    if (code < 48 || code > 57) break; // not 0-9
    end -= 1;
  }
  const digits = text.slice(end);
  return digits.length ? digits : "";
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
  const fromKey = `${floorId}::${waypoint.id}`;
  (Array.isArray(waypoint.connections) ? waypoint.connections : []).forEach((toId) => {
    const toWaypointId = String(toId);
    const toWaypoint = waypointById.get(toWaypointId);
    if (!toWaypoint) return;

    const toKey = `${floorId}::${toWaypointId}`;
    const wFwd = dist(waypoint.position, toWaypoint.position) + nodePenalty(toWaypoint.type, rules);
    const wRev = dist(waypoint.position, toWaypoint.position) + nodePenalty(waypoint.type, rules);
    addEdge(adjacencyList, fromKey, toKey, wFwd);
    addEdge(adjacencyList, toKey, fromKey, wRev);
  });
}


function bridgeDisconnectedComponentsOnFloor(adjacencyList, floorId, floorPlan, waypointById, rules) {
  const wps = (floorPlan.waypoints || []).filter((w) => w?.id);
  if (wps.length < 2) return;

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

    if (!bestA || !bestB || !Number.isFinite(bestD) || bestD >= 1e9) continue;
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

/**
 * - Ensure every room has a usable entry waypoint.
 * - Ensure each exit waypoint is linked to the local graph so inter-building routes can leave/enter.
 */
function ensureRoomAndExitConnectivity(floorPlan, floorId) {
  if (!Array.isArray(floorPlan?.waypoints)) return;
  const rooms = Array.isArray(floorPlan?.rooms) ? floorPlan.rooms : [];
  const waypoints = floorPlan.waypoints;
  const idSet = new Set(waypoints.filter((w) => w?.id).map((w) => String(w.id)));

  let syntheticCount = 0;

  // Ensure each room has an accessible doorway waypoint.
  for (const room of rooms) {
    if (!room?.id) continue;
    const center = roomCenter(room);
    if (!center) continue;
    const nearestId = room?.nearestWaypoint ? String(room.nearestWaypoint) : null;
    if (nearestId && idSet.has(nearestId)) continue;

    const syntheticId = `__room_${String(floorId)}_${syntheticCount++}`;
    const nearestExisting = nearestWaypointIdByPosition(waypoints, center);
    const wp = {
      id: syntheticId,
      type: "door",
      floor: floorPlan.floor ?? floorId,
      position: center,
      connections: nearestExisting ? [nearestExisting] : [],
    };
    waypoints.push(wp);
    idSet.add(syntheticId);
    room.nearestWaypoint = syntheticId;

    if (nearestExisting) {
      const neighbor = waypoints.find((x) => String(x?.id) === nearestExisting);
      if (neighbor) {
        if (!Array.isArray(neighbor.connections)) neighbor.connections = [];
        if (!neighbor.connections.includes(syntheticId)) neighbor.connections.push(syntheticId);
      }
    }
  }

  // Ensure exits have at least one walkable link.
  for (const wp of waypoints) {
    if (!wp?.id || String(wp.type || "").toLowerCase() !== "exit") continue;
    if (Array.isArray(wp.connections) && wp.connections.length > 0) continue;

    const nearest = nearestWaypointIdByPosition(waypoints, wp.position, wp.id);
    if (!nearest) continue;
    wp.connections = [nearest];
    const neighbor = waypoints.find((x) => String(x?.id) === nearest);
    if (neighbor) {
      if (!Array.isArray(neighbor.connections)) neighbor.connections = [];
      if (!neighbor.connections.includes(String(wp.id))) neighbor.connections.push(String(wp.id));
    }
  }
}

function buildFloorGraphsAndAliases(buildingData, floorAliases) {
  const floorGraphs = new Map();

  for (const floorId of Object.keys(buildingData)) {
    // use extractFloorPlan
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

  (waypoint.floorsReachable || []).forEach((targetFloorId) => {
    const targetStr = resolveFloorId(targetFloorId);
    if (!targetStr || targetStr === floorId || !floorGraphs.has(targetStr)) return;

    const targetFloorGraph = floorGraphs.get(targetStr);
    // Precomputed lookup: avoid scanning all waypoints for every transfer edge.
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
  }
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    bridgeDisconnectedComponentsOnFloor(adjacencyList, floorId, floorPlan, waypointById, rules);
  }
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
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
  return { success: true, path: path.toReversed(), cost: distances.get(goalNode) };
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

  const fromFloorId = graph.resolveFloorId(from.floor) ?? floorKeyToString(from.floor);
  const toFloorId = graph.resolveFloorId(to.floor) ?? floorKeyToString(to.floor);
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