/**
 * Directions service (US-2.3.1)
 * Calls Google Directions API with start/destination coords.
 * Requests walking and transit modes.
 * Converts response to app-friendly route objects: { mode, duration, distance }.
 */

const https = require("https");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function buildDirectionsUrl(origin, destination, mode) {
  const base = "https://maps.googleapis.com/maps/api/directions/json";
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    alternatives: 'true', 
    key: API_KEY || "",
  });
  return `${base}?${params.toString()}`;
}

function fetchDirections(origin, destination, mode) {
  return new Promise((resolve, reject) => {
    const url = buildDirectionsUrl(origin, destination, mode);
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (json.status === "OK" && json.routes?.length > 0) {
              resolve(json);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Normalize a Directions API leg/route to app-friendly format.
 * @param {object} raw - Raw route/leg from Google API
 * @param {string} mode - "walking" | "transit"
 * @returns {{ mode: string, duration: { value: number, text: string }, distance: { value: number, text: string }, polyline?: string }}
 */
function normalizeRoute(raw, mode) {
  const leg = raw.legs?.[0];
  if (!leg) return null;

  return {
    mode,
    duration: {
      value: leg.duration?.value ?? 0,
      text: leg.duration?.text ?? "",
    },
    distance: {
      value: leg.distance?.value ?? 0,
      text: leg.distance?.text ?? "",
    },
    polyline: raw.overview_polyline?.points,
  };
}

/**
 * Get transport options (walking and transit) between origin and destination.
 * @param {{ lat: number, lng: number }} origin - Start coordinates
 * @param {{ lat: number, lng: number }} destination - End coordinates
 * @returns {Promise<Array<{ mode: string, duration: { value: number, text: string }, distance: { value: number, text: string }, polyline?: string }>>}
 */
async function getTransportOptions(origin, destination) {
  const [walkingRes, transitRes] = await Promise.all([
    fetchDirections(origin, destination, "walking"),
    fetchDirections(origin, destination, "transit"),
  ]);

  const routes = [];

 if (walkingRes?.routes?.length > 0) {
  walkingRes.routes.forEach(route => {
    const normalized = normalizeRoute(route, "walking");
    if (normalized) routes.push(normalized);
  });
}

if (transitRes?.routes?.length > 0) {
  transitRes.routes.forEach(route => {
    const normalized = normalizeRoute(route, "transit");
    if (normalized) routes.push(normalized);
  });
}
 console.log(`Found ${routes.length} total routes`); 
  return routes;
}

module.exports = {
  getTransportOptions,
  normalizeRoute,
};
