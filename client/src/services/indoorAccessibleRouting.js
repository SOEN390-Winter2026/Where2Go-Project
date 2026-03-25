import { indoorMaps } from "../../indoorData";

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
 * GRAPH BUILDING
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

function connectTransferWaypoints({
  adjacencyList,
  floorId,
  waypoint,
  pointType,
  floorGraphs,
  resolveFloorId,
  rules,
}) {
  if (pointType === "staircase" && rules.avoidStairs) return;

  (waypoint.floorsReachable || []).forEach((targetFloorId) => {
    const targetStr = resolveFloorId(targetFloorId);
    if (!targetStr || targetStr === floorId || !floorGraphs.has(targetStr)) return;

    const targetFloorGraph = floorGraphs.get(targetStr);
    const candidates = targetFloorGraph.floorPlan.waypoints.filter(
      (w) => w?.id && String(w.type).toLowerCase() === pointType
    );
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
  const floorAliases = new Map(); // normalized alias -> canonical floorId

  // 1. Process all floors to ensure transit floors are available
  for (const floorId of Object.keys(buildingData)) {
    const floorPlan = getFloorPlanData(buildingData[floorId], floorId);
    if (!Array.isArray(floorPlan?.waypoints)) continue;

    const waypointById = new Map(
      floorPlan.waypoints.filter(w => w?.id).map(w => [String(w.id), w])
    );
    floorGraphs.set(floorId, { floorPlan, waypointById });
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

/**
 * PATHFINDING (Optimized Dijkstra)
 */
function dijkstra(startNode, goalNode, adjacencyList) {
  const distances = new Map([[startNode, 0]]);
  const previous = new Map();
  const openSet = [{ nodeKey: startNode, cost: 0 }];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.cost - b.cost);
    const { nodeKey: curr, cost: d } = openSet.shift();

    if (curr === goalNode) break;
    if (d > (distances.get(curr) ?? Infinity)) continue;

    for (const { to, w } of (adjacencyList.get(curr) || [])) {
      const newCost = d + w;
      if (newCost < (distances.get(to) ?? Infinity)) {
        distances.set(to, newCost);
        previous.set(to, curr);
        openSet.push({ nodeKey: to, cost: newCost });
      }
    }
  }

  if (!distances.has(goalNode)) return { success: false };
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
  const rules = { avoidStairs: true, stairsPenalty: 2.0, elevatorBonus: -0.1, floorTransferCost: 1.0 };

  const graph = buildMultiFloorGraph({ campus, buildingCode, rules });
  if (!graph) return { success: false, meta: { reason: "INVALID_BUILDING" } };

  const findNearestWaypointId = (floorId, roomId, waypointId) => {
    const floorGraph = graph.floorGraphs.get(floorId);
    if (!floorGraph) return null;
    if (waypointId) return String(waypointId);

    const rooms = Array.isArray(floorGraph.floorPlan.rooms) ? floorGraph.floorPlan.rooms : [];
    const matchedRoom = rooms.find(
      (r) => String(r?.id).toLowerCase() === String(roomId).toLowerCase()
    );
    if (matchedRoom?.nearestWaypoint) return String(matchedRoom.nearestWaypoint);

    const roomBoundsCenter = roomCenter(matchedRoom);
    const waypoints = Array.isArray(floorGraph.floorPlan.waypoints) ? floorGraph.floorPlan.waypoints : [];
    if (!roomBoundsCenter || waypoints.length === 0) return null;

    const closestWaypoint = waypoints.reduce((prev, curr) =>
      dist(roomBoundsCenter, curr.position) < dist(roomBoundsCenter, prev.position) ? curr : prev
    );
    return closestWaypoint?.id ? String(closestWaypoint.id) : null;
  };

  const fromFloorId = graph.resolveFloorId(from?.floor) ?? floorKeyToString(from?.floor);
  const toFloorId = graph.resolveFloorId(to?.floor) ?? floorKeyToString(to?.floor);
  const startWaypointId = findNearestWaypointId(fromFloorId, from?.room, from?.waypointId);
  const goalWaypointId = findNearestWaypointId(toFloorId, to?.room, to?.waypointId);

  if (!startWaypointId || !goalWaypointId) {
    return { success: false, meta: { reason: "LOCATION_NOT_FOUND" } };
  }

  // Use the normalized floor IDs for node keys to match the graph keys exactly.
  const startKey = `${fromFloorId}::${startWaypointId}`;
  const goalKey = `${toFloorId}::${goalWaypointId}`;
  const result = dijkstra(startKey, goalKey, graph.adjacencyList);

  if (!result.success) return { success: false, meta: { reason: "NO_PATH" } };

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

