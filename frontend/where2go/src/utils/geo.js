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
