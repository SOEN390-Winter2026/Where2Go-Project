/**
 * Indoor direction paths use normalized image coordinates (0–1). Build per-floor polylines
 * for the active building so we can draw route lines on the floor plan.
 */

import { trailingAsciiDigitSuffix } from "./trailingDigits";

function normalizedFloorLabel(wp) {
  return wp?.floor != null ? String(wp.floor) : null;
}

function isFinitePoint(pos) {
  return pos != null && typeof pos.x === "number" && typeof pos.y === "number";
}

/** @returns {{ floor: string, x: number, y: number } | null} */
function parseWaypointForRun(wp) {
  const floor = normalizedFloorLabel(wp);
  const pos = wp?.position;
  if (!floor || !isFinitePoint(pos)) return null;
  return { floor, x: pos.x, y: pos.y };
}

function appendRunIfLongEnough(runs, run) {
  if (run && run.points.length >= 2) runs.push(run);
}

/**
 * @param {Array<{ floor?: string|number, position?: { x?: number, y?: number } }>} path
 * @returns {Array<{ floor: string, points: Array<{ x: number, y: number }> }>}
 */
export function contiguousNormRunsByFloor(path) {
  if (!Array.isArray(path)) return [];

  const runs = [];
  let current = null;

  for (const wp of path) {
    const parsed = parseWaypointForRun(wp);
    if (!parsed) continue;

    const pt = { x: parsed.x, y: parsed.y };

    if (!current || current.floor !== parsed.floor) {
      appendRunIfLongEnough(runs, current);
      current = { floor: parsed.floor, points: [pt] };
      continue;
    }

    const last = current.points[current.points.length - 1];
    if (!last || last.x !== pt.x || last.y !== pt.y) {
      current.points.push(pt);
    }
  }

  appendRunIfLongEnough(runs, current);
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

function buildPolylineAliasIndex(routeByFloor) {
  /** @type {Map<string, Set<string>>} */
  const aliasToCanonicalKeys = new Map();
  const add = (alias, canonicalKey) => {
    if (!alias) return;
    if (!aliasToCanonicalKeys.has(alias)) aliasToCanonicalKeys.set(alias, new Set());
    aliasToCanonicalKeys.get(alias).add(canonicalKey);
  };

  for (const canonicalKey of Object.keys(routeByFloor)) {
    const lines = routeByFloor[canonicalKey];
    if (!Array.isArray(lines) || !lines.length) continue;
    const ks = String(canonicalKey).trim();
    const kCompact = ks.toLowerCase().replace(/[^a-z0-9]/g, "");
    const kTrailing = trailingAsciiDigitSuffix(kCompact);
    add(ks, canonicalKey);
    add(kCompact, canonicalKey);
    if (kTrailing) add(kTrailing, canonicalKey);
  }
  return aliasToCanonicalKeys;
}

function polylinesForCanonicalKey(routeByFloor, canonicalKey) {
  const lines = routeByFloor[canonicalKey];
  return Array.isArray(lines) && lines.length ? lines : null;
}

export function getPolylinesForFloor(routeByFloor, selectedFloor) {
  if (!routeByFloor || selectedFloor == null) return [];
  const key = String(selectedFloor).trim();
  const compact = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const trailingDigits = trailingAsciiDigitSuffix(compact);

  const candidateKeys = [key, compact, trailingDigits].filter(Boolean);
  for (const k of candidateKeys) {
    const direct = polylinesForCanonicalKey(routeByFloor, k);
    if (direct) return direct;
  }

  const aliasIndex = buildPolylineAliasIndex(routeByFloor);

  const uniqueCanonicalForAlias = (alias) => {
    const set = aliasIndex.get(alias);
    if (!set || set.size !== 1) return null;
    return [...set][0];
  };

  for (const alias of [compact, trailingDigits]) {
    if (!alias) continue;
    const canonicalKey = uniqueCanonicalForAlias(alias);
    if (!canonicalKey) continue;
    const lines = polylinesForCanonicalKey(routeByFloor, canonicalKey);
    if (lines) return lines;
  }

  return [];
}
