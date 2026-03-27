import { indoorMaps } from '../../../indoorData';

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
    const buildingData = indoorMaps?.[campus]?.[buildingCode];
    if (!buildingData) return [];

    const groundFloorKey = Object.keys(buildingData)[0];
    const entry = buildingData[groundFloorKey];
    if (!entry?.data) return [];

    const floorPlan = extractFloorPlan(entry.data, groundFloorKey);
    if (!Array.isArray(floorPlan?.waypoints)) return [];

    return floorPlan.waypoints
        .filter(wp => wp?.type === 'exit' && wp?.id && wp?.position)
        .map(wp => ({
            buildingCode,
            campus,
            floor: groundFloorKey,
            waypointId: wp.id,
            position: wp.position,
        }));
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
    const building = buildings.find(b => b.code === exitWaypoint.buildingCode);
    if (!building?.coordinates?.length) return null;

    const lats = building.coordinates.map(c => c.latitude);
    const lngs = building.coordinates.map(c => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

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
function extractFloorPlan(dataField, floorKey) {
    if (!dataField || typeof dataField !== 'object') return null;
    const key = String(floorKey);
    if (dataField[key] !== undefined) return dataField[key];
    const suffixMatch = Object.keys(dataField).find(k => k.endsWith(key));
    if (suffixMatch) return dataField[suffixMatch];
    return dataField[Object.keys(dataField)[0]] ?? null;
}

// Approximate straight-line distance between two lat/lng points in metres.
function haversineMeters( a, b ) {
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