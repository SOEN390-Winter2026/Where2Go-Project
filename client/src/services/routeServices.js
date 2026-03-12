import polyline from "@mapbox/polyline";

export function decodePolylineToCoords(encoded) {
  if (!encoded) return [];
  const pts = polyline.decode(encoded);
  return pts.map(([latitude, longitude]) => ({ latitude, longitude }));
}
export function buildRouteFromResponse({ route }) {
  const coords = decodePolylineToCoords(route?.polyline);
  const steps = Array.isArray(route?.steps) ? route.steps : [];
  const segments = steps
    .map((s) => {
      const c = decodePolylineToCoords(s?.polyline);
      if (!c.length) return null;
      return { coords: c, isWalk: s?.type === "walk", vehicle: s?.vehicle };
    })
    .filter(Boolean);
  return { coords, segments };
}