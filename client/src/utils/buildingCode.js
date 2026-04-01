import { indoorMaps } from "../data/indoorData";

export function normalizeBuildingCode(code) {
  return String(code ?? "").trim().toUpperCase();
}

export function resolveCampusIndoorCode(campus, code) {
  const c = normalizeBuildingCode(code);
  const campusData = indoorMaps?.[campus] ?? {};
  const keys = Object.keys(campusData);
  if (campusData[c]) return c;

  const exact = keys.find((k) => normalizeBuildingCode(k) === c);
  if (exact) return exact;

  const pref = keys.find((k) => {
    const nk = normalizeBuildingCode(k);
    return nk.startsWith(c) || c.startsWith(nk);
  });
  return pref ?? c;
}

export function equivalentCampusIndoorCodes(campus, code) {
  const resolved = resolveCampusIndoorCode(campus, code);
  const c = normalizeBuildingCode(resolved);
  if (c === "VE" || c === "VL" || c === "VEVL") return ["VE", "VL", "VEVL"];
  return [resolved];
}

export function areBuildingCodesEquivalent({ campus, a, b }) {
  const na = normalizeBuildingCode(a);
  const nb = normalizeBuildingCode(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  if (campus) {
    const ra = normalizeBuildingCode(resolveCampusIndoorCode(campus, a));
    const rb = normalizeBuildingCode(resolveCampusIndoorCode(campus, b));
    if (ra && rb && ra === rb) return true;
    const aAliases = new Set(equivalentCampusIndoorCodes(campus, a).map(normalizeBuildingCode));
    const bAliases = equivalentCampusIndoorCodes(campus, b).map(normalizeBuildingCode);
    if (bAliases.some((alias) => aAliases.has(alias))) return true;
  }

  // Fallback for formatting variants when campus context is unavailable.
  const pa = na.replaceAll(/[^A-Z0-9]/g, "");
  const pb = nb.replaceAll(/[^A-Z0-9]/g, "");
  if (!pa || !pb) return false;
  return pa === pb || pa.startsWith(pb) || pb.startsWith(pa);
}
