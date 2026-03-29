import { indoorMaps } from '../data/indoorData';
import { extractFloorPlan } from './floorPlanUtils';

function normalizeCode(code) {
    return String(code ?? '').trim().toUpperCase();
}

function resolveCampusIndoorCode(campus, code) {
    const c = normalizeCode(code);
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

function equivalentCodes(campus, code) {
    const resolved = resolveCampusIndoorCode(campus, code);
    const c = normalizeCode(resolved);
    if (c === 'VE' || c === 'VL') return ['VE', 'VL'];
    return [resolved];
}

/**
 * Extracts all exit waypoints from a building's floor plans.
 * Returns array:
 * {
 *   buildingCode,
 *   campus,
 *   floor,
 *   waypointId, // e.g. "wp22_H2"
 *   position, // { x, y }
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
        for (const wp of floorPlan.waypoints) {
            if (wp?.type === 'exit' && wp?.id && wp?.position) {
                out.push({
                    buildingCode: primary,
                    campus,
                    floor: floorKey,
                    waypointId: wp.id,
                    position: wp.position,
                });
            }
        }
    }
    return out;
}

//Returns all exits across every mapped building on a campus.
export function getAllExitsForCampus(campus) {
    const campusData = indoorMaps?.[campus];
    if (!campusData) return [];

    return Object.keys(campusData).flatMap(bCode =>
        getExitWaypoints(bCode, campus)
    );
}

/**
 * Maps exit waypoint's normalized position (0-1) to approximate real-world lat/lng
 * buildings: array of building objects from the server (each has code + coordinates[])
 * Returns { latitude, longitude } or null if the building isn't found
 */
export function exitPositionToLatLng(exitWaypoint, buildings) {
    const aliases = equivalentCodes(exitWaypoint.campus, exitWaypoint.buildingCode);
    const building = buildings.find(b => aliases.includes(normalizeCode(b.code)));
    if (!building?.coordinates?.length) return null;

    const lats = building.coordinates.map(c => c.latitude);
    const lngs = building.coordinates.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // The floor plan image has y=0 at the top, lat increases going north (up),
    //so we invert the y axis when mapping to latitude.
    const latitude  = maxLat - exitWaypoint.position.y * (maxLat - minLat);
    const longitude = minLng + exitWaypoint.position.x * (maxLng - minLng);

    return { latitude, longitude };
}

/**
 * Given a starting building and a destination building (both with mapped exits),
 * returns the pair of exits (one from each building) that are geographically closest to each other
 * -> returns { from: exitWaypoint, to: exitWaypoint }
 */
export function findClosestExitPair(fromBuildingCode, fromCampus, toBuildingCode, toCampus, buildings) {
    const fromExits = getExitWaypoints(fromBuildingCode, fromCampus);
    const toExits = getExitWaypoints(toBuildingCode, toCampus);

    if (!fromExits.length || !toExits.length) return null;

    let best = null;
    let bestDist  = Infinity;

    for (const fe of fromExits) {
        const fromLatLng = exitPositionToLatLng(fe, buildings);
        if (!fromLatLng) continue;

        for (const te of toExits) {
            const toLatLng = exitPositionToLatLng(te, buildings);
            if (!toLatLng) continue;

            const dist = haversineMeters(fromLatLng, toLatLng);
            if (dist < bestDist) {
                bestDist = dist;
                best = { from: fe, to: te, distanceMeters: dist };
            }
        }
    }
    return best;
}

//helpers

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