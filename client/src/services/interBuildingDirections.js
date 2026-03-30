import { API_BASE_URL } from "../config";
import { indoorMaps } from "../../indoorData";
import { generateAccessibleIndoorPath } from "./indoorAccessibleRouting";
import { findClosestExitPair, exitPositionToLatLng, getExitWaypoints } from "../utils/Buildingexits";
import { decodePolylineToCoords } from "./routeServices";
import { trailingAsciiDigitSuffix } from "../utils/trailingDigits";

function normalizeCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

function resolveIndoorCode(campus, buildingCode) {
  const c = normalizeCode(buildingCode);
  const campusData = indoorMaps?.[campus] ?? {};
  const keys = Object.keys(campusData);
  if (campusData[c]) return c;

  const exact = keys.find((k) => normalizeCode(k) === c);
  if (exact) return exact;

  const pref = keys.find((k) => {
    const nk = normalizeCode(k);
    return nk.startsWith(c) || c.startsWith(nk);
  });
  return pref ?? c;
}

function hasIndoorFloorPlans(campus, buildingCode) {
  return Boolean(indoorMaps?.[campus]?.[resolveIndoorCode(campus, buildingCode)]);
}

function blank(v) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

/** Turn indoor graph path into short instruction lines. */
export function formatIndoorPathSteps(path) {
  if (!path?.length) return [];
  const lines = [];
  let prevFloor = path[0]?.floor;

  for (let i = 0; i < path.length; i += 1) {
    const wp = path[i];
    const typeLow = String(wp.type || "area").toLowerCase();

    if (i === 0) {
      lines.push(`Start on floor ${wp.floor}.`);
      continue;
    }

    if (String(wp.floor) !== String(prevFloor)) {
      lines.push(`Continue to floor ${wp.floor}.`);
      prevFloor = wp.floor;
    }

    if (typeLow === "elevator") lines.push("Use the elevator.");
    else if (typeLow === "staircase") lines.push("Use the stairs.");
    else if (typeLow === "exit") lines.push("Go through the exit.");
  }

  return lines.filter((line, idx) => idx === 0 || line !== lines[idx - 1]);
}

function computeApproxIndoorMeters(path) {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let meters = 0;
  for (let i = 1; i < path.length; i += 1) {
    const a = path[i - 1];
    const b = path[i];
    const sameFloor = String(a?.floor) === String(b?.floor);
    const ap = a?.position;
    const bp = b?.position;
    if (sameFloor && ap && bp) {
      const dx = (bp.x ?? 0) - (ap.x ?? 0);
      const dy = (bp.y ?? 0) - (ap.y ?? 0);
      // Floor plans are normalized [0..1]
      meters += Math.hypot(dx, dy) * 120;
    } else if (!sameFloor) {
      meters += 8;
    }
  }
  if (meters <= 0) return 0;
  return Math.max(5, Math.round(meters / 5) * 5);
}

function buildIndoorNarrative({ path, buildingCode, startRoom, endRoom, endFloor, heading }) {
  const core = formatIndoorPathSteps(path);
  const lines = [];
  if (heading) lines.push(heading);
  if (startRoom) {
    lines.push(`Start in room ${startRoom} in ${buildingCode}.`);
  }
  const approxMeters = computeApproxIndoorMeters(path);
  if (approxMeters > 0) {
    lines.push(`Walk about ${approxMeters} m inside ${buildingCode}.`);
  }
  lines.push(...core);
  if (endRoom) {
    lines.push(`Continue to room ${endRoom} on floor ${endFloor}.`);
  }
  return lines;
}

/** Single-segment success: indoor routing within one building between two rooms. */
function indoorRoomToRoomOk(buildingCode, path, { startRoom, endRoom, endFloor }) {
  return {
    ok: true,
    segments: [
      {
        kind: "indoor",
        buildingCode,
        summary: `Inside ${buildingCode} — room to room`,
        steps: buildIndoorNarrative({
          path,
          buildingCode,
          startRoom,
          endRoom,
          endFloor,
        }),
        path,
      },
    ],
  };
}

async function fetchOutdoorWalkingSegment(originLatLng, destLatLng) {
  function normalizePolyline(route) {
    if (typeof route?.polyline === "string") return route.polyline;
    return (
      route?.polyline?.encodedPolyline ??
      route?.polyline?.points ??
      route?.overview_polyline?.points ??
      route?.overviewPolyline?.points ??
      null
    );
  }

  function normalizeStepPolyline(step) {
    if (typeof step?.polyline === "string") return step.polyline;
    return (
      step?.polyline?.encodedPolyline ??
      step?.polyline?.points ??
      step?.overview_polyline?.points ??
      step?.overviewPolyline?.points ??
      null
    );
  }

  const clientTime = encodeURIComponent(new Date().toISOString());
  const url =
    `${API_BASE_URL}/directions?originLat=${originLatLng.latitude}&originLng=${originLatLng.longitude}` +
    `&destLat=${destLatLng.latitude}&destLng=${destLatLng.longitude}&clientTime=${clientTime}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, message: data?.error?.message || "Outdoor directions failed" };
  }
  const routes = data.routes || [];
  const walk = routes.find((r) => r.mode === "walking") || routes[0];
  if (!walk) {
    return { ok: false, message: "No outdoor route found" };
  }
  const steps = (walk.steps || [])
    .map((s) => {
      const instruction = s?.instruction;
      const distanceText = s?.distance?.text || s?.distanceText || "";
      if (!instruction) return null;
      if (!distanceText) return instruction;
      return `${instruction} (${distanceText})`;
    })
    .filter(Boolean);
  const summary = [];
  if (walk.duration?.text && walk.distance?.text) {
    summary.push(`Walk about ${walk.distance.text} (${walk.duration.text}).`);
  }

  const fullCoords = decodePolylineToCoords(normalizePolyline(walk));
  const walkSegments = (walk.steps || [])
    .map((s) => {
      const coords = decodePolylineToCoords(normalizeStepPolyline(s));
      if (!coords.length) return null;
      return { coords, isWalk: true, vehicle: null };
    })
    .filter(Boolean);

  return {
    ok: true,
    mode: walk.mode,
    durationText: walk.duration?.text || "",
    distanceText: walk.distance?.text || "",
    steps: [...summary, ...steps],
    coords: fullCoords,
    segments: walkSegments,
  };
}

function computeIndoorWithStairsFallback({ campus, buildingCode, from, to, avoidStairs }) {
  let indoor = generateAccessibleIndoorPath({
    campus,
    buildingCode,
    from,
    to,
    avoidStairs,
  });
  if (!indoor.success && avoidStairs && indoor.meta?.reason === "NO_PATH") {
    indoor = generateAccessibleIndoorPath({
      campus,
      buildingCode,
      from,
      to,
      avoidStairs: false,
    });
  }
  return indoor;
}

function distance2(a, b) {
  const dx = (a?.latitude ?? 0) - (b?.latitude ?? 0);
  const dy = (a?.longitude ?? 0) - (b?.longitude ?? 0);
  return dx * dx + dy * dy;
}

function floorDistancePenalty(roomFloor, exitFloor) {
  const rf = String(roomFloor ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ef = String(exitFloor ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!rf || !ef) return 2;
  if (rf === ef) return 0;
  const rd = trailingAsciiDigitSuffix(rf);
  const ed = trailingAsciiDigitSuffix(ef);
  if (rd && ed && rd === ed) return 0;
  return 1;
}

function buildSortedExitPairs(fromB, toB, campus, buildings, from, to) {
  const fromExits = getExitWaypoints(fromB, campus);
  const toExits = getExitWaypoints(toB, campus);
  const pairs = [];
  for (const fe of fromExits) {
    const a = exitPositionToLatLng(fe, buildings);
    if (!a) continue;
    for (const te of toExits) {
      const b = exitPositionToLatLng(te, buildings);
      if (!b) continue;
      const fromPenalty = floorDistancePenalty(from?.floor, fe?.floor);
      const toPenalty = floorDistancePenalty(to?.floor, te?.floor);
      pairs.push({
        from: fe,
        to: te,
        a,
        b,
        d2: distance2(a, b),
        floorPenalty: fromPenalty + toPenalty,
      });
    }
  }
  return pairs.sort((x, y) => {
    if (x.floorPenalty !== y.floorPenalty) return x.floorPenalty - y.floorPenalty;
    return x.d2 - y.d2;
  });
}

function extractFloorPlan(dataField, floorKey) {
  if (!dataField || typeof dataField !== "object") return null;
  const key = String(floorKey);
  if (dataField[key] !== undefined) return dataField[key];
  const suffixMatch = Object.keys(dataField).find((k) => k.endsWith(key));
  if (suffixMatch) return dataField[suffixMatch];
  return dataField[Object.keys(dataField)[0]] ?? null;
}

function pickGroundFloorKey(campus, buildingCode) {
  const data = indoorMaps?.[campus]?.[buildingCode];
  if (!data) return null;
  const keys = Object.keys(data);
  if (keys.length === 0) return null;
  const sorted = keys.slice().sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  return sorted[0];
}

function roomCenter(room) {
  const { x, y, w, h } = room?.bounds || {};
  if (x == null || y == null || w == null || h == null) return null;
  return { x: x + w / 2, y: y + h / 2 };
}

function getFloorPlan(campus, buildingCode, floor) {
  const b = indoorMaps?.[campus]?.[buildingCode];
  const entry = b?.[floor] ?? b?.[Number(floor)];
  return extractFloorPlan(entry?.data, floor);
}

function findRoomById(plan, roomId) {
  const rooms = Array.isArray(plan?.rooms) ? plan.rooms : [];
  return rooms.find((r) => String(r?.id).toLowerCase() === String(roomId).toLowerCase()) || null;
}

function nearestWaypointByPosition(plan, pos) {
  const wps = Array.isArray(plan?.waypoints) ? plan.waypoints : [];
  let best = null;
  let bestD = Infinity;
  for (const w of wps) {
    if (!w?.id || !w?.position) continue;
    const dx = w.position.x - pos.x;
    const dy = w.position.y - pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = w;
    }
  }
  return best;
}

function resolveEndpointWaypoint(campus, buildingCode, floor, room, waypointId) {
  const plan = getFloorPlan(campus, buildingCode, floor);
  if (!plan) return null;
  const wps = Array.isArray(plan.waypoints) ? plan.waypoints : [];
  if (waypointId) {
    const byId = wps.find((w) => String(w?.id) === String(waypointId));
    if (byId) return byId;
  }
  if (room) {
    const r = findRoomById(plan, room);
    if (r?.nearestWaypoint) {
      const byNearest = wps.find((w) => String(w?.id) === String(r.nearestWaypoint));
      if (byNearest) return byNearest;
    }
    const c = roomCenter(r);
    if (c) return nearestWaypointByPosition(plan, c);
  }
  return null;
}

function nearestTransferWaypoint(campus, buildingCode, floor, fromPos, avoidStairs) {
  const plan = getFloorPlan(campus, buildingCode, floor);
  const wps = Array.isArray(plan?.waypoints) ? plan.waypoints : [];
  const allowed = new Set(avoidStairs ? ["elevator"] : ["elevator", "staircase"]);
  const candidates = wps.filter((w) => allowed.has(String(w?.type || "").toLowerCase()));
  if (!candidates.length) return null;
  return nearestWaypointByPosition({ waypoints: candidates }, fromPos);
}

function wpToPathNode(floor, w) {
  if (!w) return null;
  return {
    floor: String(floor),
    id: String(w.id),
    type: w.type ?? null,
    position: w.position ?? null,
  };
}

function buildHeuristicIndoorPath({ campus, buildingCode, from, to, avoidStairs }) {
  const fromWp = resolveEndpointWaypoint(campus, buildingCode, from.floor, from.room, from.waypointId);
  const toWp = resolveEndpointWaypoint(campus, buildingCode, to.floor, to.room, to.waypointId);
  if (!fromWp || !toWp) return null;

  const fromFloor = String(from.floor);
  const toFloor = String(to.floor);
  if (fromFloor === toFloor) {
    const a = wpToPathNode(fromFloor, fromWp);
    const b = wpToPathNode(toFloor, toWp);
    if (!a || !b) return null;
    return [a, b];
  }

  const fromTransfer = nearestTransferWaypoint(
    campus,
    buildingCode,
    from.floor,
    fromWp.position,
    avoidStairs
  );
  const toTransfer = nearestTransferWaypoint(
    campus,
    buildingCode,
    to.floor,
    toWp.position,
    avoidStairs
  );
  if (!fromTransfer || !toTransfer) return null;

  const nodes = [
    wpToPathNode(fromFloor, fromWp),
    wpToPathNode(fromFloor, fromTransfer),
    wpToPathNode(toFloor, toTransfer),
    wpToPathNode(toFloor, toWp),
  ].filter(Boolean);
  return nodes.length >= 2 ? nodes : null;
}

function collectTransferWaypointIds(campus, buildingCode, floor, avoidStairs) {
  const b = indoorMaps?.[campus]?.[buildingCode];
  const entry = b?.[floor] ?? b?.[Number(floor)];
  const plan = extractFloorPlan(entry?.data, floor);
  if (!Array.isArray(plan?.waypoints)) return [];
  const allowed = new Set(avoidStairs ? ["elevator"] : ["elevator", "staircase"]);
  return plan.waypoints
    .filter((w) => w?.id && allowed.has(String(w.type || "").toLowerCase()))
    .map((w) => ({ id: String(w.id), pos: w.position }));
}

function roomCenterFor(campus, buildingCode, floor, roomId) {
  const b = indoorMaps?.[campus]?.[buildingCode];
  const entry = b?.[floor] ?? b?.[Number(floor)];
  const plan = extractFloorPlan(entry?.data, floor);
  if (!Array.isArray(plan?.rooms)) return null;
  const r = plan.rooms.find((x) => String(x?.id).toLowerCase() === String(roomId).toLowerCase());
  return roomCenter(r);
}

function sortByDistFrom(point, candidates) {
  if (!point) return candidates;
  return candidates.slice().sort((a, b) => {
    const dax = (a?.pos?.x ?? 0) - point.x;
    const day = (a?.pos?.y ?? 0) - point.y;
    const dbx = (b?.pos?.x ?? 0) - point.x;
    const dby = (b?.pos?.y ?? 0) - point.y;
    return dax * dax + day * day - (dbx * dbx + dby * dby);
  });
}

/**
 * Build a single plan: indoor-only when both endpoints share a building;
 * otherwise indoor → outdoor (between exits) → indoor.
 *
 * @param {object} p
 * @param {string} p.campus - "SGW" | "Loyola"
 * @param {{ building: string, floor: string, room: string }} p.from
 * @param {{ building: string, floor: string, room: string }} p.to
 * @param {Array<{ code: string, coordinates?: Array }>} p.buildings - server buildings (for exit lat/lng)
 * @param {boolean} [p.avoidStairs] - passed to indoor routing
 * @returns {Promise<{ ok: true, segments: object[] } | { ok: false, code: string, message: string }>}
 */
export async function buildInterBuildingDirections({
  campus,
  from,
  to,
  buildings = [],
  avoidStairs = true,
} = {}) {
  if (blank(campus) || blank(from?.building) || blank(to?.building)) {
    return { ok: false, code: "INVALID_INPUT", message: "Select campus, start building, and destination building." };
  }
  if (blank(from?.floor) || blank(from?.room) || blank(to?.floor) || blank(to?.room)) {
    return { ok: false, code: "INVALID_INPUT", message: "Select floor and room for both start and destination." };
  }

  const fromB = resolveIndoorCode(campus, from.building);
  const toB = resolveIndoorCode(campus, to.building);
  const indoorOpts = { avoidStairs };

  if (!hasIndoorFloorPlans(campus, fromB)) {
    return {
      ok: false,
      code: "NO_INDOOR_MAP",
      message: `No indoor floor plans for ${fromB}. Open indoor maps from a building that has plans.`,
    };
  }
  if (!hasIndoorFloorPlans(campus, toB)) {
    return {
      ok: false,
      code: "NO_INDOOR_MAP",
      message: `No indoor floor plans for ${toB}. Only buildings with floor data in the app can be start or destination for combined directions.`,
    };
  }

  if (fromB === toB) {
    const indoor = computeIndoorWithStairsFallback({
      campus,
      buildingCode: fromB,
      from: { floor: from.floor, room: from.room },
      to: { floor: to.floor, room: to.room },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (!indoor.success) {
      const fallbackPath = buildHeuristicIndoorPath({
        campus,
        buildingCode: fromB,
        from: { floor: from.floor, room: from.room },
        to: { floor: to.floor, room: to.room },
        avoidStairs: indoorOpts.avoidStairs,
      });
      if (fallbackPath) {
        return indoorRoomToRoomOk(fromB, fallbackPath, {
          startRoom: from.room,
          endRoom: to.room,
          endFloor: to.floor,
        });
      }
      return {
        ok: false,
        code: indoor.meta?.reason || "NO_INDOOR_PATH",
        message: "Could not find an indoor path between these rooms.",
        details: indoor.meta,
      };
    }
    return indoorRoomToRoomOk(fromB, indoor.path, {
      startRoom: from.room,
      endRoom: to.room,
      endFloor: to.floor,
    });
  }

  const exitPair = findClosestExitPair(fromB, campus, toB, campus, buildings);
  const fallbackPairs = buildSortedExitPairs(fromB, toB, campus, buildings, from, to);
  if ((!exitPair?.from || !exitPair.to) && fallbackPairs.length === 0) {
    return {
      ok: false,
      code: "NO_EXITS",
      message: "No mapped building exits for this pair. Indoor routing between buildings needs exit waypoints in the floor data.",
    };
  }
  const pairs = [];
  if (exitPair?.from && exitPair?.to) {
    const a = exitPositionToLatLng(exitPair.from, buildings);
    const b = exitPositionToLatLng(exitPair.to, buildings);
    if (a && b) pairs.push({ from: exitPair.from, to: exitPair.to, a, b, d2: distance2(a, b) });
  }
  for (const p of fallbackPairs) {
    if (!pairs.some((x) => x.from.waypointId === p.from.waypointId && x.to.waypointId === p.to.waypointId)) {
      pairs.push(p);
    }
  }

  let lastFailure = { code: "NO_INDOOR_PATH", message: "Could not find a path between these buildings." };
  const MAX_PAIR_TRIES = 30;
  for (const p of pairs.slice(0, MAX_PAIR_TRIES)) {
    const legOut = computeIndoorLegToExit(from, fromB, p.from, campus, indoorOpts);
    if (!legOut.ok) {
      lastFailure = { code: legOut.code || "NO_INDOOR_PATH", message: legOut.message, details: legOut.details };
      continue;
    }

    const legIn = computeIndoorLegFromExit(to, toB, p.to, campus, indoorOpts);
    if (!legIn.ok) {
      lastFailure = { code: legIn.code || "NO_INDOOR_PATH", message: legIn.message, details: legIn.details };
      continue;
    }

    const outdoor = await fetchOutdoorWalkingSegment(p.a, p.b);
    if (!outdoor.ok) {
      lastFailure = { code: "OUTDOOR_FAILED", message: outdoor.message || "Outdoor segment failed" };
      continue;
    }

    return {
      ok: true,
      segments: [
        {
          kind: "indoor",
          buildingCode: fromB,
          summary: `Inside ${fromB} — to exit`,
          steps: buildIndoorNarrative({
            path: legOut.path,
            buildingCode: fromB,
            startRoom: from.room,
          }),
          path: legOut.path,
        },
        {
          kind: "outdoor",
          summary: `Outside — between ${fromB} and ${toB}`,
          steps: [
            `Walk ${outdoor.distanceText || "outside"} from ${fromB} to ${toB}.`,
            ...outdoor.steps,
            `Enter ${toB} through the main entrance/exit.`,
          ],
          durationText: outdoor.durationText,
          distanceText: outdoor.distanceText,
          coords: outdoor.coords,
          mapSegments: outdoor.segments,
        },
        {
          kind: "indoor",
          buildingCode: toB,
          summary: `Inside ${toB} — from entrance to room`,
          steps: buildIndoorNarrative({
            path: legIn.path,
            buildingCode: toB,
            endRoom: to.room,
            endFloor: to.floor,
            heading: `From the entrance of ${toB}, continue inside.`,
          }),
          path: legIn.path,
        },
      ],
    };
  }

  return { ok: false, ...lastFailure };
}

function computeIndoorLegToExit(from, buildingCode, exitWp, campus, indoorOpts) {
  const groundFloor = pickGroundFloorKey(campus, buildingCode);
  const fromFloor = String(from.floor);
  const onGround = groundFloor != null && String(groundFloor) === fromFloor;

  if (onGround) {
    const direct = computeIndoorWithStairsFallback({
      campus,
      buildingCode,
      from: { floor: from.floor, room: from.room },
      to: { floor: exitWp.floor, waypointId: exitWp.waypointId },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (direct.success) return { ok: true, path: direct.path };
  }

  // Upper floors: room -> nearest transfer point (elevator/stairs) -> selected exit.
  const transferCandidates = collectTransferWaypointIds(
    campus,
    buildingCode,
    from.floor,
    indoorOpts?.avoidStairs
  );
  const center = roomCenterFor(campus, buildingCode, from.floor, from.room);
  const orderedTransfers = sortByDistFrom(center, transferCandidates);
  let best = null;
  for (const t of orderedTransfers.slice(0, 10)) {
    const first = computeIndoorWithStairsFallback({
      campus,
      buildingCode,
      from: { floor: from.floor, room: from.room },
      to: { floor: from.floor, waypointId: t.id },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (!first.success) continue;
    const second = computeIndoorWithStairsFallback({
      campus,
      buildingCode,
      from: { floor: from.floor, waypointId: t.id },
      to: { floor: exitWp.floor, waypointId: exitWp.waypointId },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (!second.success) continue;
    const merged = [...first.path, ...second.path.slice(1)];
    best = { ok: true, path: merged };
    break;
  }
  if (best) return best;

  const indoor = computeIndoorWithStairsFallback({
    campus,
    buildingCode,
    from: { floor: from.floor, room: from.room },
    to: { floor: exitWp.floor, waypointId: exitWp.waypointId },
    avoidStairs: indoorOpts.avoidStairs,
  });
  if (!indoor.success) {
    const fallbackPath = buildHeuristicIndoorPath({
      campus,
      buildingCode,
      from: { floor: from.floor, room: from.room },
      to: { floor: exitWp.floor, waypointId: exitWp.waypointId },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (fallbackPath) return { ok: true, path: fallbackPath };
    return {
      ok: false,
      code: indoor.meta?.reason || "NO_INDOOR_PATH",
      message: "Could not find a path from your room to the building exit.",
      details: indoor.meta,
    };
  }
  return { ok: true, path: indoor.path };
}

function computeIndoorLegFromExit(to, buildingCode, exitWp, campus, indoorOpts) {
  const indoor = computeIndoorWithStairsFallback({
    campus,
    buildingCode,
    from: { floor: exitWp.floor, waypointId: exitWp.waypointId },
    to: { floor: to.floor, room: to.room },
    avoidStairs: indoorOpts.avoidStairs,
  });
  if (!indoor.success) {
    const fallbackPath = buildHeuristicIndoorPath({
      campus,
      buildingCode,
      from: { floor: exitWp.floor, waypointId: exitWp.waypointId },
      to: { floor: to.floor, room: to.room },
      avoidStairs: indoorOpts.avoidStairs,
    });
    if (fallbackPath) return { ok: true, path: fallbackPath };
    return {
      ok: false,
      code: indoor.meta?.reason || "NO_INDOOR_PATH",
      message: "Could not find a path from the entrance to your destination room.",
      details: indoor.meta,
    };
  }
  return { ok: true, path: indoor.path };
}
