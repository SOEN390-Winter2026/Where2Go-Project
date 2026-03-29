/**
 * Indoor direction paths use normalized image coordinates (0–1). Build per-floor polylines
 * for the active building so we can draw route lines on the floor plan.
 */

import { trailingAsciiDigitSuffix } from "./trailingDigits";

/**
 * @param {Array<{ floor?: string|number, position?: { x?: number, y?: number } }>} path
 * @returns {Array<{ floor: string, points: Array<{ x: number, y: number }> }>}
 */
export function contiguousNormRunsByFloor(path) {
  if (!Array.isArray(path)) return [];

  const runs = [];
  let current = null;

  for (const wp of path) {
    const f = wp?.floor != null ? String(wp.floor) : null;
    const pos = wp?.position;
    if (!f || pos == null || typeof pos.x !== "number" || typeof pos.y !== "number") {
      continue;
    }
    const pt = { x: pos.x, y: pos.y };

    if (!current || current.floor !== f) {
      if (current && current.points.length >= 2) {
        runs.push(current);
      }
      current = { floor: f, points: [pt] };
    } else {
      const last = current.points[current.points.length - 1];
      if (!last || last.x !== pt.x || last.y !== pt.y) {
        current.points.push(pt);
      }
    }
  }

  if (current && current.points.length >= 2) {
    runs.push(current);
  }

  return runs;
}

/**
 * @param {Array<{ kind?: string, buildingCode?: string, path?: unknown[] }>} segments
 * @param {string} buildingCode
 * @returns {Record<string, Array<Array<{ x: number, y: number }>>>}
 */
export function buildIndoorRoutePolylinesByFloor(segments, buildingCode) {
  const out = {};
  if (!buildingCode || !Array.isArray(segments)) return out;

  for (const seg of segments) {
    if (seg?.kind !== "indoor" || seg.buildingCode !== buildingCode || !Array.isArray(seg.path)) {
      continue;
    }
    const runs = contiguousNormRunsByFloor(seg.path);
    for (const run of runs) {
      if (!out[run.floor]) out[run.floor] = [];
      out[run.floor].push(run.points);
    }
  }

  return out;
}

/**
 * @param {Record<string, Array<Array<{ x: number, y: number }>>>} routeByFloor
 * @param {string|number|null|undefined} selectedFloor
 * @returns {Array<Array<{ x: number, y: number }>>}
 */
export function getPolylinesForFloor(routeByFloor, selectedFloor) {
  if (!routeByFloor || selectedFloor == null) return [];
  const key = String(selectedFloor).trim();
  const compact = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trailingDigits = trailingAsciiDigitSuffix(compact);

  const candidateKeys = [key, compact, trailingDigits].filter(Boolean);
  for (const k of candidateKeys) {
    const direct = routeByFloor[k];
    if (Array.isArray(direct) && direct.length) return direct;
  }

  // Last-resort loose matching between aliases like "7" and "H-7".
  const entries = Object.entries(routeByFloor);
  for (const [k, lines] of entries) {
    const kCompact = String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
    const kTrailing = trailingAsciiDigitSuffix(kCompact);
    if (
      kCompact === compact ||
      (trailingDigits && kTrailing === trailingDigits)
    ) {
      if (Array.isArray(lines) && lines.length) return lines;
    }
  }
  return [];
}
