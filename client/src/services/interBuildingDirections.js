import NavigationContext from "../navigation/NavigationContext";
import { indoorMaps } from "../data/indoorData";
import { generateAccessibleIndoorPath } from "./indoorAccessibleRouting";
import { exitPositionToLatLng, getExitWaypoints } from "../utils/Buildingexits";
import { decodePolylineToCoords } from "./routeServices";
import { trailingAsciiDigitSuffix } from "../utils/trailingDigits";
import { resolveCampusIndoorCode } from "../utils/buildingCode";

function parseBuildingOption(opt, fallbackCampus) {
  const m = new RegExp(/^(.+?)\s*\((.+?)\)$/).exec(String(opt ?? ""));
  if (m) return { code: m[1].trim().toUpperCase(), campus: m[2].trim() };
  return { code: String(opt ?? "").trim().toUpperCase(), campus: fallbackCampus };
}

function resolveIndoorCode(campus, buildingCode) {
  return resolveCampusIndoorCode(campus, buildingCode);
}

function hasIndoorFloorPlans(campus, buildingCode) {
  return Boolean(indoorMaps?.[campus]?.[resolveIndoorCode(campus, buildingCode)]);
}

function blank(v) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

function getWaypointLine(typeLow, floorChanged, floor) {
  if (typeLow === "elevator") {
    return floorChanged ? `Take the elevator to floor ${floor}.` : "Walk to the elevator.";
  }
  if (typeLow === "escalator") {
    return floorChanged ? `Take the escalator to floor ${floor}.` : "Walk to the escalator.";
  }
  if (typeLow === "staircase") {
    return floorChanged ? `Take the stairs to floor ${floor}.` : "Walk to the stairs.";
  }
  if (floorChanged) return `Continue to floor ${floor}.`;
  if (typeLow === "exit") return "Go through the exit.";
  return null;
}

export function formatIndoorPathSteps(path) {
  if (!path?.length) return [];
  const lines = [];
  let prevFloor = path[0]?.floor;

  for (let i = 0; i < path.length; i += 1) {
    const wp = path[i];
    const typeLow = String(wp.type || "area").toLowerCase();
    const floorChanged = i > 0 && String(wp.floor) !== String(prevFloor);

    if (i === 0) {
      lines.push(`Start on floor ${wp.floor}.`);
      continue;
    }

    const line = getWaypointLine(typeLow, floorChanged, wp.floor);
    if (line && line !== lines.at(-1)) lines.push(line);

    if (floorChanged) prevFloor = wp.floor;
  }

  return lines;
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
      meters += Math.hypot(dx, dy) * 120;
    } else if (!sameFloor) {
      meters += 8;
    }
  }
  if (meters <= 0) return 0;
  return Math.max(5, Math.round(meters / 5) * 5);
}

const FLOOR_CHANGE_RE = /^(?:Take the (?:elevator|escalator|stairs) to|Continue to) floor (\S+?)\.?$/;

function buildIndoorNarrative({ path, buildingCode, startRoom, endRoom, endFloor, heading }) {
  const core = formatIndoorPathSteps(path);
  const steps = [];
  const stepFloors = [];

  const push = (text, floor = null) => { steps.push(text); stepFloors.push(floor); };

  if (heading) push(heading);
  if (startRoom) push(`Start in room ${startRoom} in ${buildingCode}.`);
  const approxMeters = computeApproxIndoorMeters(path);
  if (approxMeters > 0) push(`Walk about ${approxMeters} m inside ${buildingCode}.`);

  for (const line of core) {
    if (startRoom && line.startsWith("Start on floor")) continue;
    const m = FLOOR_CHANGE_RE.exec(line);
    push(line, m ? m[1] : null);
  }

  if (endRoom) push(`Continue to room ${endRoom} on floor ${endFloor}.`);

  return { steps, stepFloors };
}

function indoorRoomToRoomOk(buildingCode, path, { startRoom, endRoom, endFloor }) {
  const { steps, stepFloors } = buildIndoorNarrative({
    path,
    buildingCode,
    startRoom,
    endRoom,
    endFloor,
  });
  return {
    ok: true,
    segments: [
      {
        kind: "indoor",
        buildingCode,
        summary: `Inside ${buildingCode} — room to room`,
        steps,
        stepFloors,
        path,
      },
    ],
  };
}

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

function decodeStepSegments(steps) {
  return (steps || [])
    .map((s) => {
      const encoded = normalizeStepPolyline(s);
      const coords = decodePolylineToCoords(encoded);
      if (!coords.length) return null;
      return {
        coords,
        isWalk: s?.type === "walk",
        vehicle: s?.vehicle ?? (s?.type === "concordia_shuttle" ? "shuttle" : null),
      };
    })
    .filter(Boolean);
}

/**
 * Fetch the outdoor leg between two lat/lng points using NavigationContext.
 * Priority: Concordia Shuttle (cross-campus, schedule permitting) → Transit → Walking.
 *
 * NavigationContext with mode "all" calls the backend and returns all available
 * routes (walking + transit + shuttle when eligible).  We pick in priority order
 * so cross-campus trips use the shuttle or STM transit rather than defaulting to
 * a long walk.
 */
async function fetchOutdoorSegment(originLatLng, destLatLng, { accessible = false } = {}) {
  // Strategies receive { lat, lng }; our exit coords use { latitude, longitude }.
  const origin = { lat: originLatLng.latitude, lng: originLatLng.longitude };
  const dest   = { lat: destLatLng.latitude,   lng: destLatLng.longitude };

  let routes;
  try {
    const ctx = new NavigationContext("all");
    routes = await ctx.getRoutes(origin, dest, {
      clientTime: new Date().toISOString(),
      accessible,
    });
  } catch (e) {
    return { ok: false, message: e?.message || "Outdoor directions failed" };
  }

  if (!Array.isArray(routes) || !routes.length) {
    return { ok: false, message: "No outdoor route found" };
  }

  // Prefer shuttle for cross-campus legs; prefer transit over walking otherwise.
  const shuttle = routes.find((r) => r.mode === "concordia_shuttle");
  const transit = routes.find((r) => r.mode === "transit");
  const walk    = routes.find((r) => r.mode === "walking") || routes[0];
  const chosen  = shuttle || transit || walk;

  if (!chosen) {
    return { ok: false, message: "No outdoor route found" };
  }

  const isShuttle = chosen.mode === "concordia_shuttle";
  const isTransit = chosen.mode === "transit";

  const stepStrings = (chosen.steps || [])
    .map((s) => {
      const instruction = s?.instruction;
      const distanceText = s?.distanceText || s?.distance?.text || "";
      if (!instruction) return null;
      if (!distanceText) return instruction;
      return `${instruction} (${distanceText})`;
    })
    .filter(Boolean);

  const summary = [];
  if (chosen.duration?.text) {
    if (isShuttle) {
      summary.push(`Take the Concordia Shuttle (~${chosen.duration.text}).`);
      if (chosen.scheduleNote) summary.push(chosen.scheduleNote);
    } else if (isTransit) {
      summary.push(`Take transit (~${chosen.duration.text}${chosen.distance?.text ? ", " + chosen.distance.text : ""}).`);
    } else {
      summary.push(`Walk about ${chosen.distance?.text || ""} (${chosen.duration.text}).`);
    }
  }

  const stepSegments = decodeStepSegments(chosen.steps);

  let fullCoords = [];
  if (stepSegments.length) {
    fullCoords = stepSegments.flatMap((s) => s.coords);
  } else {
    const rawPolyline = normalizePolyline(chosen);
    if (rawPolyline) {
      // Guard against the "|"-joined shuttle polyline format.
      fullCoords = rawPolyline
        .split("|")
        .flatMap((part) => decodePolylineToCoords(part));
    }
  }

  return {
    ok: true,
    mode: chosen.mode,
    isShuttle,
    isTransit,
    durationText: chosen.duration?.text || "",
    distanceText: chosen.distance?.text || "",
    scheduleNote: chosen.scheduleNote ?? null,
    steps: [...summary, ...stepStrings],
    coords: fullCoords,
    segments: stepSegments,
  };
}

// FIX 2: Removed the silent fallback that retried with avoidStairs=false when
// avoidStairs=true failed.  Previously, if the elevator-only graph had any gap
// (e.g. a floor missing elevator waypoints), the routing silently degraded to
// normal mode — producing paths that mixed elevators and staircases even when
// the user had accessibility mode enabled.  Now the result is returned as-is;
// callers decide how to handle failure.
function computeIndoorWithStairsFallback({ campus, buildingCode, from, to, avoidStairs }) {
  return generateAccessibleIndoorPath({ campus, buildingCode, from, to, avoidStairs });
}

function distance2(a, b) {
  const dx = (a?.latitude ?? 0) - (b?.latitude ?? 0);
  const dy = (a?.longitude ?? 0) - (b?.longitude ?? 0);
  return dx * dx + dy * dy;
}

/**
 * FIX: Previously returned only 0 or 1, meaning an exit 5 floors away and an exit
 * 1 floor away had the same penalty. This caused exits on a high floor to beat
 * ground-floor exits purely on geographic distance even when far from the destination.
 * Now returns the actual number of floors apart (capped at 10).
 */
function floorDistancePenalty(roomFloor, exitFloor) {
  const rf = String(roomFloor ?? "").toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const ef = String(exitFloor ?? "").toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  if (!rf || !ef) return 2;
  if (rf === ef) return 0;
  const rd = trailingAsciiDigitSuffix(rf);
  const ed = trailingAsciiDigitSuffix(ef);
  if (rd && ed) {
    // Compare non-digit prefixes first. "1" (prefix "") and "S1" (prefix "s")
    // are in different stacks — a sub-basement floor must NOT score 0 penalty
    // just because its trailing digit matches the ground floor's digit.
    const rPrefix = rf.slice(0, rf.length - rd.length);
    const ePrefix = ef.slice(0, ef.length - ed.length);
    if (rPrefix !== ePrefix) return 2;
    return Math.min(Math.abs(Number.parseInt(rd, 10) - Number.parseInt(ed, 10)), 2);
  }
  return 1;
}

function buildSortedExitPairs(fromB, toB, fromCampus, toCampus, buildings, from, to) {
  const fromExits = getExitWaypoints(fromB, fromCampus);
  const toExits = getExitWaypoints(toB, toCampus);
  const pairs = [];

  // For BOTH buildings, measure floor penalty against the building's own ground
  // floor rather than against the room floor. Entrances and exits are always at
  // street level; the indoor leg handles the vertical travel to/from the room.
  //
  // Without this, a high-floor exit (e.g. Hall's 5th-floor skyway exit) beats
  // the ground-floor entrance purely on geographic distance, causing directions
  // to start/end on the wrong floor and — for cross-campus trips — passing
  // coordinates to the backend that may be too close together for the shuttle
  // heuristic to recognise as a cross-campus trip.
  const fromGroundFloor = pickGroundFloorKey(fromCampus, fromB) ?? from.floor;
  const toGroundFloor   = pickGroundFloorKey(toCampus,   toB)   ?? to.floor;

  for (const fe of fromExits) {
    const a = exitPositionToLatLng(fe, buildings);
    if (!a) continue;
    for (const te of toExits) {
      const b = exitPositionToLatLng(te, buildings);
      if (!b) continue;
      const fromPenalty = floorDistancePenalty(fromGroundFloor, fe?.floor);
      const toPenalty   = floorDistancePenalty(toGroundFloor,   te?.floor);
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

  // Prefer the numerically-lowest floor that actually has waypoint data.
  // Some buildings (e.g. MB) have an empty placeholder key like "CC3" whose
  // trailing digit is "3", which would beat the real ground floor "MB1" (digit
  // "1") only alphabetically. Skipping empty floors ensures we get the true
  // street-level entrance floor.
  const sorted = keys.slice().sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  for (const k of sorted) {
    const entry = data[k];
    if (!entry?.data) continue;
    const fp = extractFloorPlan(entry.data, k);
    if (Array.isArray(fp?.waypoints) && fp.waypoints.length > 0) return k;
  }
  return sorted[0]; // fallback: return first key even if empty
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
  const allowed = new Set(avoidStairs ? ["elevator"] : ["elevator", "staircase", "escalator"]);
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

// FIX 3: The cross-floor branch is removed. The heuristic only handles same-floor
// paths (room → nearest corridor/door waypoint). For multi-floor paths, null is
// returned so the caller can surface a proper error rather than producing a
// 4-node teleporting path that skips every intermediate floor.
function buildHeuristicIndoorPath({ campus, buildingCode, from, to, avoidStairs }) {
  const fromFloor = String(from.floor);
  const toFloor = String(to.floor);

  // Multi-floor heuristic teleports across floors — never use it for cross-floor routes.
  if (fromFloor !== toFloor) return null;

  const fromWp = resolveEndpointWaypoint(campus, buildingCode, from.floor, from.room, from.waypointId);
  const toWp   = resolveEndpointWaypoint(campus, buildingCode, to.floor,   to.room,   to.waypointId);
  if (!fromWp || !toWp) return null;

  const a = wpToPathNode(fromFloor, fromWp);
  const b = wpToPathNode(toFloor, toWp);
  if (!a || !b) return null;
  return [a, b];
}

function validateDirectionInput(campus, from, to) {
  if (blank(campus) || blank(from?.building) || blank(to?.building)) {
    return { ok: false, code: "INVALID_INPUT", message: "Select campus, start building, and destination building." };
  }
  if (blank(from?.floor) || blank(from?.room) || blank(to?.floor) || blank(to?.room)) {
    return { ok: false, code: "INVALID_INPUT", message: "Select floor and room for both start and destination." };
  }
  return { ok: true };
}

function ensureIndoorMapsExist(fromCampus, fromB, toCampus, toB) {
  if (!hasIndoorFloorPlans(fromCampus, fromB)) {
    return {
      ok: false,
      code: "NO_INDOOR_MAP",
      message: `No indoor floor plans for ${fromB}. Open indoor maps from a building that has plans.`,
    };
  }
  if (!hasIndoorFloorPlans(toCampus, toB)) {
    return {
      ok: false,
      code: "NO_INDOOR_MAP",
      message: `No indoor floor plans for ${toB}. Only buildings with floor data in the app can be start or destination for combined directions.`,
    };
  }
  return { ok: true };
}

function buildSameBuildingDirections({ campus, fromB, from, to, avoidStairs }) {
  const indoor = computeIndoorWithStairsFallback({
    campus,
    buildingCode: fromB,
    from: { floor: from.floor, room: from.room },
    to: { floor: to.floor, room: to.room },
    avoidStairs,
  });
  if (indoor.success) {
    return indoorRoomToRoomOk(fromB, indoor.path, {
      startRoom: from.room,
      endRoom: to.room,
      endFloor: to.floor,
    });
  }

  // Same-floor heuristic only — no cross-floor teleporting.
  const fallbackPath = buildHeuristicIndoorPath({
    campus,
    buildingCode: fromB,
    from: { floor: from.floor, room: from.room },
    to: { floor: to.floor, room: to.room },
    avoidStairs,
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

function buildCandidateExitPairs({ fromB, toB, fromCampus, toCampus, buildings, from, to }) {
  // Use floor-sorted pairs as the primary ordering. The ground-floor preference
  // in buildSortedExitPairs ensures destination entries always go through the
  // building's actual street entrance (floor 1) rather than an elevated exit
  // that is one floor closer to the destination room.
  //
  // findClosestExitPair (geographic-only) is intentionally NOT inserted at the
  // front of the list. Previously it caused a high-floor MB exit (one floor from
  // the destination) to be tried first and succeed, bypassing the ground-floor
  // entrance completely.
  const sortedPairs = buildSortedExitPairs(fromB, toB, fromCampus, toCampus, buildings, from, to);
  if (sortedPairs.length === 0) return null;
  return sortedPairs;
}

function buildOutdoorLeadStep(outdoor, fromB, toB) {
  if (outdoor.isShuttle) {
    const note = outdoor.scheduleNote ? ` — ${outdoor.scheduleNote}` : "";
    return `Take the Concordia Shuttle from near ${fromB} to near ${toB}${note}.`;
  }
  if (outdoor.isTransit) {
    return `Take transit from near ${fromB} to near ${toB} (~${outdoor.durationText}).`;
  }
  return `Walk ${outdoor.distanceText || "outside"} from ${fromB} to ${toB}.`;
}

function buildCombinedSegments({ fromB, toB, from, to, legOut, legIn, outdoor }) {
  const narrativeOut = buildIndoorNarrative({
    path: legOut.path,
    buildingCode: fromB,
    startRoom: from.room,
  });
  const narrativeIn = buildIndoorNarrative({
    path: legIn.path,
    buildingCode: toB,
    endRoom: to.room,
    endFloor: to.floor,
    heading: `From the entrance of ${toB}, continue inside.`,
  });
  return [
    {
      kind: "indoor",
      buildingCode: fromB,
      summary: `Inside ${fromB} — to exit`,
      steps: narrativeOut.steps,
      stepFloors: narrativeOut.stepFloors,
      path: legOut.path,
    },
    {
      kind: "outdoor",
      mode: outdoor.mode,
      summary: `Outside — between ${fromB} and ${toB}`,
      steps: [
        buildOutdoorLeadStep(outdoor, fromB, toB),
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
      steps: narrativeIn.steps,
      stepFloors: narrativeIn.stepFloors,
      path: legIn.path,
    },
  ];
}

function collectTransferWaypointIds(campus, buildingCode, floor, avoidStairs) {
  const b = indoorMaps?.[campus]?.[buildingCode];
  const entry = b?.[floor] ?? b?.[Number(floor)];
  const plan = extractFloorPlan(entry?.data, floor);
  if (!Array.isArray(plan?.waypoints)) return [];
  const allowed = new Set(avoidStairs ? ["elevator"] : ["elevator", "staircase", "escalator"]);
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

export async function buildInterBuildingDirections({
  campus,
  from,
  to,
  buildings = [],
  avoidStairs = true,
} = {}) {
  const validation = validateDirectionInput(campus, from, to);
  if (!validation.ok) return validation;

  const fromParsed = parseBuildingOption(from.building, campus);
  const toParsed   = parseBuildingOption(to.building,   campus);
  const fromCampus = fromParsed.campus;
  const toCampus   = toParsed.campus;

  const fromB = resolveIndoorCode(fromCampus, fromParsed.code);
  const toB   = resolveIndoorCode(toCampus,   toParsed.code);

  const indoorOpts = { avoidStairs: !!avoidStairs };
  const mapCheck = ensureIndoorMapsExist(fromCampus, fromB, toCampus, toB);
  if (!mapCheck.ok) return mapCheck;

  if (fromB === toB && fromCampus === toCampus) {
    return buildSameBuildingDirections({
      campus: fromCampus,
      fromB,
      from,
      to,
      avoidStairs: indoorOpts.avoidStairs,
    });
  }

  const pairs = buildCandidateExitPairs({ fromB, toB, fromCampus, toCampus, buildings, from, to });
  if (!pairs || pairs.length === 0) {
    return {
      ok: false,
      code: "NO_EXITS",
      message: "No mapped building exits for this pair. Indoor routing between buildings needs exit waypoints in the floor data.",
    };
  }

  let lastFailure = { code: "NO_INDOOR_PATH", message: "Could not find a path between these buildings." };
  const MAX_PAIR_TRIES = 30;
  for (const p of pairs.slice(0, MAX_PAIR_TRIES)) {
    const legOut = computeIndoorLegToExit(from, fromB, p.from, fromCampus, indoorOpts);
    if (!legOut.ok) {
      lastFailure = { code: legOut.code || "NO_INDOOR_PATH", message: legOut.message, details: legOut.details };
      continue;
    }

    const legIn = computeIndoorLegFromExit(to, toB, p.to, toCampus, indoorOpts);
    if (!legIn.ok) {
      lastFailure = { code: legIn.code || "NO_INDOOR_PATH", message: legIn.message, details: legIn.details };
      continue;
    }

    const outdoor = await fetchOutdoorSegment(p.a, p.b, { accessible: indoorOpts.avoidStairs });
    if (!outdoor.ok) {
      lastFailure = { code: "OUTDOOR_FAILED", message: outdoor.message || "Outdoor segment failed" };
      continue;
    }

    return { ok: true, segments: buildCombinedSegments({ fromB, toB, from, to, legOut, legIn, outdoor }) };
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

  const transferCandidates = collectTransferWaypointIds(
    campus, buildingCode, from.floor, indoorOpts?.avoidStairs
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

  // Direct multi-floor Dijkstra: room → exit across all floors.
  const indoor = computeIndoorWithStairsFallback({
    campus,
    buildingCode,
    from: { floor: from.floor, room: from.room },
    to: { floor: exitWp.floor, waypointId: exitWp.waypointId },
    avoidStairs: indoorOpts.avoidStairs,
  });
  if (indoor.success) return { ok: true, path: indoor.path };

  // Same-floor heuristic only — do NOT use cross-floor heuristic (it teleports).
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
    message: "Could not find a path from your room to the building exit. Ensure all floors have elevator/staircase waypoints with floorsReachable.",
    details: indoor.meta,
  };
}

function computeIndoorLegFromExit(to, buildingCode, exitWp, campus, indoorOpts) {
  const indoor = computeIndoorWithStairsFallback({
    campus,
    buildingCode,
    from: { floor: exitWp.floor, waypointId: exitWp.waypointId },
    to: { floor: to.floor, room: to.room },
    avoidStairs: indoorOpts.avoidStairs,
  });
  if (indoor.success) return { ok: true, path: indoor.path };

  // Same-floor heuristic only — do NOT use cross-floor heuristic (it teleports).
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
    message: "Could not find a path from the entrance to your destination room. Ensure all floors have elevator/staircase waypoints with floorsReachable.",
    details: indoor.meta,
  };
}