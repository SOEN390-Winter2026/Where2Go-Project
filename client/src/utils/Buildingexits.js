import { indoorMaps } from '../data/indoorData';
import { extractFloorPlan } from './floorPlanUtils';
import { equivalentCampusIndoorCodes, normalizeBuildingCode } from './buildingCode';

function equivalentCodes(campus, code) {
    return equivalentCampusIndoorCodes(campus, code);
}

/**
 * Extracts all exit waypoints from a building's floor plans.
 *
 * FIX: Also finds exits via exit-type ROOM entries whose nearestWaypoint
 * points to a "door"-typed waypoint (e.g. MB1 where the exit rooms have
 * nearestWaypoint set but the waypoint itself is typed "door" not "exit").
 * Without this, those floors' entrance exits are invisible to the router.
 *
 * Returns array of:
 * {
 *   buildingCode,
 *   campus,
 *   floor,
 *   waypointId,  // e.g. "wp22_H2"
 *   position,    // { x, y }
 * }
 */
export function getExitWaypoints(buildingCode, campus) {
    const [primary, secondary] = equivalentCodes(campus, buildingCode);
    const buildingData = indoorMaps?.[campus]?.[primary] ?? indoorMaps?.[campus]?.[secondary];
    if (!buildingData) return [];

    const out = [];
    for (const floorKey of Object.keys(buildingData)) {
        const entry = buildingData[floorKey];
        if (!entry?.data) continue;
        const floorPlan = extractFloorPlan(entry.data, floorKey);
        if (!Array.isArray(floorPlan?.waypoints)) continue;

        // Track which waypointIds we've already added to avoid duplicates.
        const collected = new Set();

        // Pass 1: waypoints explicitly typed "exit".
        for (const wp of floorPlan.waypoints) {
            if (wp?.type === 'exit' && wp?.id && wp?.position) {
                out.push({
                    buildingCode: primary,
                    campus,
                    floor: floorKey,
                    waypointId: wp.id,
                    position: wp.position,
                });
                collected.add(String(wp.id));
            }
        }

        // Pass 2: exit-type ROOMS whose nearestWaypoint is typed differently
        // (e.g. "door"). This handles buildings like MB where exit rooms correctly
        // identify their door waypoint but the waypoint type is "door" not "exit".
        if (Array.isArray(floorPlan?.rooms)) {
            for (const room of floorPlan.rooms) {
                if (String(room?.type || '').toLowerCase() !== 'exit') continue;
                if (!room?.nearestWaypoint) continue;
                const nwId = String(room.nearestWaypoint);
                if (collected.has(nwId)) continue;
                const wp = floorPlan.waypoints.find(
                    (w) => w?.id && String(w.id) === nwId && w?.position
                );
                if (!wp) continue;
                out.push({
                    buildingCode: primary,
                    campus,
                    floor: floorKey,
                    waypointId: nwId,
                    position: wp.position,
                });
                collected.add(nwId);
            }
        }
    }
    return out;
}

// Returns all exits across every mapped building on a campus.
export function getAllExitsForCampus(campus) {
    const campusData = indoorMaps?.[campus];
    if (!campusData) return [];

    return Object.keys(campusData).flatMap(bCode =>
        getExitWaypoints(bCode, campus)
    );
}

/**
 * Maps exit waypoint's normalized position (0-1) to approximate real-world lat/lng.
 * buildings: array of building objects from the server (each has code + coordinates[]).
 * Returns { latitude, longitude } or null if the building isn't found.
 */
export function exitPositionToLatLng(exitWaypoint, buildings) {
    const aliases = equivalentCodes(exitWaypoint.campus, exitWaypoint.buildingCode);
    const building = buildings.find(b => aliases.includes(normalizeBuildingCode(b.code)));
    if (!building?.coordinates?.length) return null;

    const lats = building.coordinates.map(c => c.latitude);
    const lngs = building.coordinates.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // The floor plan image has y=0 at the top, lat increases going north (up),
    // so we invert the y axis when mapping to latitude.
    const latitude  = maxLat - exitWaypoint.position.y * (maxLat - minLat);
    const longitude = minLng + exitWaypoint.position.x * (maxLng - minLng);

    return { latitude, longitude };
}

/**
 * Given a starting building and a destination building (both with mapped exits),
 * returns the pair of exits (one from each building) that are geographically
 * closest to each other.
 * Returns { from: exitWaypoint, to: exitWaypoint }.
 */
export function findClosestExitPair(fromBuildingCode, fromCampus, toBuildingCode, toCampus, buildings) {
    const fromExits = getExitWaypoints(fromBuildingCode, fromCampus);
    const toExits = getExitWaypoints(toBuildingCode, toCampus);

    if (!fromExits.length || !toExits.length) return null;

    let best = null;
    let bestDist = Infinity;

    for (const fe of fromExits) {
        const fromLatLng = exitPositionToLatLng(fe, buildings);
        if (!fromLatLng) continue;

        for (const te of toExits) {
            const toLatLng = exitPositionToLatLng(te, buildings);
            if (!toLatLng) continue;

            const d = haversineMeters(fromLatLng, toLatLng);
            if (d < bestDist) {
                bestDist = d;
                best = { from: fe, to: te, distanceMeters: d };
            }
        }
    }
    return best;
}

// Approximate straight-line distance between two lat/lng points in metres.
function haversineMeters(a, b) {
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLng = toRad(b.longitude - a.longitude);
    const sin2 = Math.sin(dLat / 2) ** 2
               + Math.cos(toRad(a.latitude))
               * Math.cos(toRad(b.latitude))
               * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(sin2));
}

function toRad(deg) { return deg * Math.PI / 180; }