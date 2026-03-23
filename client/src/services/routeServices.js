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
      if (!c.length && s?.type !== "transition") return null;
      return {
        coords: c,
        isWalk: s?.type === "walk" || s?.type === "transition",
        isTransition: s?.type === "transition",
        vehicle: s?.vehicle,
        instruction: s?.instruction || ""
      };
    })
    .filter(Boolean);
  return { coords, segments };
}