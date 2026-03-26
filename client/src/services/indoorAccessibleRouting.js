import { indoorMaps } from "../../indoorData";
import { MinCostHeap } from "../utils/MinCostHeap";

/**
 * UTILITIES
 */
const floorKeyToString = (floor) => String(floor);

function getFloorPlanData(floorEntry, floorId) {
  const floorPlanModule = floorEntry?.data;
  if (!floorPlanModule || typeof floorPlanModule !== "object") return null;
  // Try exact floor key (e.g., "H-1"), then fall back to the first available object
  return floorPlanModule[floorId] ?? floorPlanModule[Object.keys(floorPlanModule)[0]] ?? null;
}

// Center of a room rectangle (normalized 0–1 coords), for “nearest waypoint” fallback.
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
  if (waypointId) return String(waypointId);

  const rooms = Array.isArray(floorGraph.floorPlan.rooms) ? floorGraph.floorPlan.rooms : [];
  const matchedRoom = rooms.find(
    (r) => String(r?.id).toLowerCase() === String(roomId).toLowerCase()
  );
  if (matchedRoom?.nearestWaypoint) return String(matchedRoom.nearestWaypoint);

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
    const code = text.charCodeAt(end - 1);
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
    const code = text.charCodeAt(i);
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

// Walkable edges from waypoint.connections on one floor.
function connectSameFloorWaypoints(adjacencyList, floorId, waypoint, waypointById, rules) {
  (Array.isArray(waypoint.connections) ? waypoint.connections : []).forEach((toId) => {
    const toWaypointId = String(toId);
    const toWaypoint = waypointById.get(toWaypointId);
    if (!toWaypoint) return;

    const edgeWeight =
      dist(waypoint.position, toWaypoint.position) + nodePenalty(toWaypoint.type, rules);
    addEdge(adjacencyList, `${floorId}::${waypoint.id}`, `${floorId}::${toWaypointId}`, edgeWeight);
  });
}

function pickClosestTransferWaypoint(waypoint, candidates) {
  return candidates.reduce((prev, curr) =>
    dist(waypoint.position, curr.position) < dist(waypoint.position, prev.position) ? curr : prev
  );
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

function buildMultiFloorGraph({ campus, buildingCode, rules }) {
  const buildingData = indoorMaps?.[campus]?.[buildingCode];
  if (!buildingData) return null;

  const floorGraphs = new Map();
  const adjacencyList = new Map();
  const floorAliases = new Map(); // normalized alias -> graph floor key ("7", "8", ...)

  // 1. Process all floors to ensure transit floors are available
  for (const floorId of Object.keys(buildingData)) {
    const floorPlan = getFloorPlanData(buildingData[floorId], floorId);
    if (!Array.isArray(floorPlan?.waypoints)) continue;

    const waypointById = new Map();
    // Precompute lookups so we don't scan all waypoints per transfer edge.
    // Map: waypointTypeLower -> waypoints[]
    const waypointsByType = new Map();
    for (const w of floorPlan.waypoints) {
      if (!w?.id) continue;

      waypointById.set(String(w.id), w);

      const t = String(w.type || "").toLowerCase();
      if (!waypointsByType.has(t)) waypointsByType.set(t, []);
      waypointsByType.get(t).push(w);
    }

    floorGraphs.set(floorId, { floorPlan, waypointById, waypointsByType });
    addFloorAliases(floorAliases, floorId, floorPlan);
  }

  enrichFloorAliases(floorAliases);
  const resolveFloorId = createFloorResolver(floorAliases);

  // 2. Link all points (Horizontal and Vertical)
  for (const [floorId, { floorPlan, waypointById }] of floorGraphs.entries()) {
    for (const waypoint of floorPlan.waypoints) {
      if (!waypoint?.id) continue;
      const pointType = String(waypoint.type || "").toLowerCase();

      connectSameFloorWaypoints(adjacencyList, floorId, waypoint, waypointById, rules);
      const isTransferPoint = pointType === "elevator" || pointType === "staircase";
      if (isTransferPoint) {
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
  return { adjacencyList, floorGraphs, resolveFloorId };
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
  return { success: true, path: path.reverse(), cost: distances.get(goalNode) };
}

/**
 * MAIN EXPORT
 */
export function generateAccessibleIndoorPath({ campus, buildingCode, from, to } = {}) {
  // avoidStairs: block stair vertical edges. elevatorBonus / stairsPenalty tweak relative edge costs.
  const rules = { avoidStairs: true, stairsPenalty: 2.0, elevatorBonus: -0.1, floorTransferCost: 1.0 };

  const graph = buildMultiFloorGraph({ campus, buildingCode, rules });
  if (!graph) return { success: false, meta: { reason: "INVALID_BUILDING" } };

  const fromFloorId = graph.resolveFloorId(from?.floor) ?? floorKeyToString(from?.floor);
  const toFloorId = graph.resolveFloorId(to?.floor) ?? floorKeyToString(to?.floor);
  const startWaypointId = findNearestWaypointId(
    graph.floorGraphs,
    fromFloorId,
    from?.room,
    from?.waypointId
  );
  const goalWaypointId = findNearestWaypointId(
    graph.floorGraphs,
    toFloorId,
    to?.room,
    to?.waypointId
  );

  if (!startWaypointId || !goalWaypointId) {
    return { success: false, meta: { reason: "LOCATION_NOT_FOUND" } };
  }

  // Use the normalized floor IDs for node keys to match the graph keys exactly.
  const startKey = `${fromFloorId}::${startWaypointId}`;
  const goalKey = `${toFloorId}::${goalWaypointId}`;
  const result = dijkstra(startKey, goalKey, graph.adjacencyList);

  if (!result.success) return { success: false, meta: { reason: "NO_PATH" } };

  // Turn raw node keys back into waypoint objects for the caller / UI.
  const path = result.path
    .map((nodeKey) => {
      const [floorId, waypointId] = nodeKey.split("::");
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

