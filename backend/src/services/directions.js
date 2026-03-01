/**
 * Directions service (US-2.3.1)
 * Calls Google Directions API with start/destination coords.
 * Requests walking and transit modes.
 * Converts response to app-friendly route objects: { mode, duration, distance }.
 * Includes Concordia shuttle option for SGW ↔ Loyola campus trips.
 */

const https = require("https");
const { getCampusCoordinates } = require("./map");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/** Meters - point is "on campus" if within this radius of campus center */
const CAMPUS_RADIUS_METERS = 2500;

/**
 * Concordia shuttle schedule (Winter: Jan 12 – Apr 15, 2026).
 * Times stored as minutes since midnight. Montreal timezone.
 * Source: concordia.ca/maps/shuttle-bus.html
 */
const SHUTTLE_SCHEDULE = {
  /** Mon–Thu: departures from Loyola and SGW, last bus 18:30 */
  weekdays: {
    loyola: [555, 570, 585, 600, 615, 630, 645, 660, 675, 690, 705, 750, 765, 780, 795, 810, 825, 840, 855, 870, 885, 900, 915, 930, 945, 990, 1005, 1020, 1035, 1050, 1065, 1080, 1095, 1110],
    sgw: [570, 585, 600, 615, 630, 645, 660, 675, 690, 735, 750, 765, 780, 795, 810, 825, 840, 855, 870, 885, 900, 915, 930, 960, 975, 1005, 1020, 1035, 1050, 1065, 1080, 1095, 1110],
    lastDeparture: 1110,
  },
  /** Fri: different schedule, last bus 18:15 */
  friday: {
    loyola: [555, 570, 585, 615, 660, 675, 705, 720, 735, 765, 780, 795, 825, 855, 870, 885, 915, 930, 945, 1005, 1035, 1065, 1095],
    sgw: [585, 600, 615, 645, 675, 690, 735, 750, 765, 795, 825, 840, 855, 885, 900, 915, 945, 960, 1005, 1035, 1065, 1095],
    lastDeparture: 1095,
  },
};
/**
 * Get time in Montreal for a given date (minutes since midnight, 0–1439).
 * Uses user's device time when clientTime ISO string is provided.
 * @param {Date} [refDate] - Reference date; defaults to server time (new Date())
 */
function getMontrealMinutes(refDate = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(refDate);
  const h = parseInt(parts.find((p) => p.type === "hour").value, 10);
  const m = parseInt(parts.find((p) => p.type === "minute").value, 10);
  return h * 60 + m;
}

/**
 * Get day of week in Montreal for a given date: 0=Sun, 1=Mon, ..., 6=Sat.
 * Uses user's device time when refDate comes from clientTime.
 */
function getMontrealDay(refDate = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    weekday: "short",
  });
  const day = fmt.format(refDate);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[day] ?? 0;
}

/**
 * Check if date in Montreal falls within a shuttle schedule period.
 * Official schedule: Jan 12 – Apr 15, 2026. Relaxed to allow 2025–2026 for dev/testing.
 * Set SHUTTLE_SCHEDULE_OVERRIDE=1 in .env to bypass date check entirely.
 */
function isInSchedulePeriod(refDate = new Date()) {
  if (process.env.SHUTTLE_SCHEDULE_OVERRIDE === "1") return true;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montreal",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(refDate);
  const y = parseInt(parts.find((p) => p.type === "year").value, 10);
  const m = parseInt(parts.find((p) => p.type === "month").value, 10);
  const d = parseInt(parts.find((p) => p.type === "day").value, 10);
  // Allow Winter 2026 (Jan 12 – Apr 15) and 2025 for dev/testing
  if (y === 2026) {
    if (m < 1 || m > 4) return false;
    if (m === 1 && d < 12) return false;
    if (m === 4 && d > 15) return false;
    return true;
  }
  if (y === 2025) return true; // Development/testing
  return false;
}

/** Check if shuttle is operating at refDate (Mon–Fri, within schedule period and hours) */
function isShuttleOperatingNow(refDate = new Date()) {
  if (!isInSchedulePeriod(refDate)) return false;
  const day = getMontrealDay(refDate);
  if (day === 0 || day === 6) return false; // Sat, Sun
  const mins = getMontrealMinutes(refDate);
  const sched = day === 5 ? SHUTTLE_SCHEDULE.friday : SHUTTLE_SCHEDULE.weekdays;
  return mins < sched.lastDeparture;
}

/** Format minutes since midnight as "HH:mm" */
function minsToTimeStr(m) {
  const h = Math.floor(m / 60);
  const mn = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mn).padStart(2, "0")}`;
}

/** Get next departure from fromCampus ("SGW"|"Loyola") at refDate. Returns "HH:mm" or null. */
function getNextDeparture(fromCampus, refDate = new Date()) {
  const day = getMontrealDay(refDate);
  if (day === 0 || day === 6) return null;
  const mins = getMontrealMinutes(refDate);
  const sched = day === 5 ? SHUTTLE_SCHEDULE.friday : SHUTTLE_SCHEDULE.weekdays;
  const times = fromCampus === "Loyola" ? sched.loyola : sched.sgw;
  const next = times.find((t) => t > mins);
  return next != null ? minsToTimeStr(next) : null;
}

function buildDirectionsUrl(origin, destination, mode) {
  const base = "https://maps.googleapis.com/maps/api/directions/json";
  const params = new URLSearchParams({
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
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
 * Keep in mind that polyline is a base64 encoded string that represents the route geometry and should be decoded to get the actual coordinates.
 */

function stripHtml(html = "") {
  return String(html).replace(/<[^>]+>/g, "").trim();
}

function normalizeSteps(leg) {
  const steps = leg?.steps ?? [];

  return steps
    .map((s) => {
      const stepPolyline = s.polyline?.points || null;

      // WALKING
      if (s.travel_mode === "WALKING") {
        return {
          type: "walk",
          durationText: s.duration?.text ?? "",
          distanceText: s.distance?.text ?? "",
          instruction: stripHtml(s.html_instructions ?? ""),
          polyline: stepPolyline,
        };
      }

      // TRANSIT
      if (s.travel_mode === "TRANSIT") {
        const td = s.transit_details || {};
        const line = td.line || {};
        const vehicleType = line.vehicle?.type || "TRANSIT"; // BUS, SUBWAY, etc.

        return {
          type: "transit",
          vehicle: vehicleType.toLowerCase(),               // "bus" | "subway"
          line: line.short_name || line.name || "",        // "105" or "Green"
          headsign: td.headsign ?? "",
          from: td.departure_stop?.name ?? "",
          to: td.arrival_stop?.name ?? "",
          stops: td.num_stops ?? null,
          departureTime: td.departure_time?.text ?? "",
          arrivalTime: td.arrival_time?.text ?? "",
          durationText: s.duration?.text ?? "",
          instruction: stripHtml(s.html_instructions ?? ""),
          polyline: stepPolyline,
        };
      }

      // fallback (rare)
      return null;
    })
    .filter(Boolean);
}

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
    polyline: raw.overview_polyline?.points ?? null, 

    steps: normalizeSteps(leg),

    // ✅ Optional (nice for "Arrive 14:10")
    departureTime: leg.departure_time?.text ?? "",
    arrivalTime: leg.arrival_time?.text ?? "",
  };
}

/**
 * Haversine distance between two {lat, lng} points in meters.
 */
function haversineMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Returns "SGW" or "Loyola" if point is near that campus, else null.
 */
function getNearestCampus(point) {
  const sgw = getCampusCoordinates("SGW");
  const loyola = getCampusCoordinates("Loyola");
  if (haversineMeters(point, sgw) <= CAMPUS_RADIUS_METERS) return "SGW";
  if (haversineMeters(point, loyola) <= CAMPUS_RADIUS_METERS) return "Loyola";
  return null;
}

/**
 * Concordia shuttle route when trip is SGW ↔ Loyola and shuttle is operating.
 * Shuttle ~30 min, ~11 km. Uses driving directions for polyline.
 * Schedule uses refDate (user device time when clientTime provided).
 */
async function getShuttleRouteIfApplicable(origin, destination, refDate = new Date()) {
  const fromCampus = getNearestCampus(origin);
  const toCampus = getNearestCampus(destination);
  if (!fromCampus || !toCampus || fromCampus === toCampus) return null;
  if (!isShuttleOperatingNow(refDate)) return null;

  const drivingRes = await fetchDirections(origin, destination, "driving");
  const polyline = drivingRes?.routes?.[0]?.overview_polyline?.points || null;
  const nextDeparture = getNextDeparture(fromCampus, refDate);

  return {
    mode: "concordia_shuttle",
    duration: { value: 1800, text: "30 min" },
    distance: { value: 11000, text: "11 km" },
    polyline,
    nextDeparture,
    scheduleNote: nextDeparture
      ? `Next departure: ${nextDeparture}`
      : "Check schedule at concordia.ca/maps/shuttle-bus",
  };
}

/**
 * Get transport options (walking, transit, and Concordia shuttle when applicable) between origin and destination.
 * @param {{ lat: number, lng: number }} origin - Start coordinates
 * @param {{ lat: number, lng: number }} destination - End coordinates
 * @param {{ clientTime?: string }} [opts] - Optional. clientTime: ISO string from user's device (new Date().toISOString())
 * @returns {Promise<Array<{ mode: string, duration: { value: number, text: string }, distance: { value: number, text: string }, polyline?: string }>>}
 */
async function getTransportOptions(origin, destination, opts = {}) {
  let refDate = new Date();
  if (opts.clientTime) {
    const parsed = new Date(opts.clientTime);
    if (!isNaN(parsed.getTime())) refDate = parsed;
  }

  const [walkingRes, transitRes, shuttleRoute] = await Promise.all([
    fetchDirections(origin, destination, "walking"),
    fetchDirections(origin, destination, "transit"),
    getShuttleRouteIfApplicable(origin, destination, refDate),
  ]);

  const routes = [];

  if (walkingRes?.routes?.[0]) {
    const normalized = normalizeRoute(walkingRes.routes[0], "walking");
    if (normalized) routes.push(normalized);
  }

  if (transitRes?.routes?.[0]) {
    const normalized = normalizeRoute(transitRes.routes[0], "transit");
    if (normalized) routes.push(normalized);
  }

  if (shuttleRoute) routes.push(shuttleRoute);

  return routes;
}

module.exports = {
  getTransportOptions,
  normalizeRoute,
};
