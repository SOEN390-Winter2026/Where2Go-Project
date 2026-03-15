/**
 * Geometry / coordinate utilities shared across the app.
 */

/**
 * Compute the centroid (average lat/lng) of a polygon.
 * @param {{ latitude: number, longitude: number }[]} coordinates - Array of polygon vertices
 * @returns {{ lat: number, lng: number }} Centroid point
 */
export function polygonCentroid(coordinates) {
  const n = coordinates.length;
  if (n === 0) return { lat: 0, lng: 0 };
  const sumLat = coordinates.reduce((s, c) => s + c.latitude, 0);
  const sumLng = coordinates.reduce((s, c) => s + c.longitude, 0);
  return { lat: sumLat / n, lng: sumLng / n };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 * @param {{ latitude: number, longitude: number }} point - The point to test
 * @param {{ latitude: number, longitude: number }[]} polygon - Array of polygon vertices
 * @returns {boolean} True if the point is inside the polygon
 */
export function isPointInPolygon(point, polygon) {
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;

    const crossesYAxis = (yi > y) !== (yj > y);

    if (crossesYAxis) {
      const intersectionX = ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (x < intersectionX) {
        inside = !inside;
      }
    }
  }

  return inside;
}