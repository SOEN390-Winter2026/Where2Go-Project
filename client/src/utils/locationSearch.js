/**
 * Location Search Utilities
 * 
 * functions for search, filter, and resolving locations
 * uses SEARCHABLE_LOCATIONS data
 */

import { SEARCHABLE_LOCATIONS } from "../data/locations";

export const MAX_RESULTS = 8;

/**
 * Extracts display name from a building label by removing parenthetical content
 * "Hall Building (H)" -> "Hall Building"
 */
export function getBuildingDisplayName(label) {
  if (!label) return label;
  const parenIndex = label.indexOf("(");
  return parenIndex > 0 ? label.slice(0, parenIndex).trimEnd() : label;
}

/**
 * Filters buildings/locations from database
 * matches search query, remove duplicates and result limiting
 */
export function filterLocations(query, buildings) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();

  // Search SEARCHABLE_LOCATIONS
  const searchableResults = SEARCHABLE_LOCATIONS.filter((loc) =>
    loc.searchText.includes(q)
  );

  // Search provided buildings array
  let buildingResults = [];
  if (buildings && buildings.length > 0) {
    buildingResults = buildings
      .filter((building) => (building.name?.toLowerCase() || "").includes(q))
      .map((building) => ({
        label: building.name,
        lat: building.coordinates?.[0]?.latitude || null,
        lng: building.coordinates?.[0]?.longitude || null,
        searchText: building.name?.toLowerCase() || "",
      }));
  }

  // Combine results, prioritizing buildings data
  const combined = [...buildingResults, ...searchableResults];

  // Deduplicate by display name
  const seen = new Set();
  return combined
    .filter((loc) => {
      const displayName = getBuildingDisplayName(loc.label);
      if (seen.has(displayName)) return false;
      seen.add(displayName);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

/**
 * Resolves a location name to a full location object with coordinates
 * exact match first, then fuzzy match
 */
export function resolveLocationByName(name, buildings) {
  if (!name) return null;
  const q = name.toLowerCase().trim();

  // Try exact match in buildings
  if (buildings?.length) {
    let b =
      buildings.find((bld) => bld.name?.toLowerCase() === q) ||
      buildings.find((bld) => {
        const bn = bld.name?.toLowerCase() || "";
        return bn.includes(q) || q.includes(bn);
      });

    if (b) {
      const firstCoord = b.coordinates?.[0];
      return {
        label: b.name,
        lat: firstCoord?.latitude ?? null,
        lng: firstCoord?.longitude ?? null,
      };
    }
  }

  // Try exact match in SEARCHABLE_LOCATIONS
  const locExact = SEARCHABLE_LOCATIONS.find((l) => {
    const display = getBuildingDisplayName(l.label)?.toLowerCase() || "";
    return display === q || (l.label?.toLowerCase() || "") === q;
  });

  if (locExact) {
    return {
      label: getBuildingDisplayName(locExact.label),
      lat: locExact.lat,
      lng: locExact.lng,
    };
  }

  // Try fuzzy match in SEARCHABLE_LOCATIONS
  const locFuzzy = SEARCHABLE_LOCATIONS.find((l) => {
    const display = getBuildingDisplayName(l.label)?.toLowerCase() || "";
    const raw = l.label?.toLowerCase() || "";
    return (
      display.includes(q) ||
      q.includes(display) ||
      raw.includes(q) ||
      q.includes(raw)
    );
  });

  if (locFuzzy) {
    return {
      label: getBuildingDisplayName(locFuzzy.label),
      lat: locFuzzy.lat,
      lng: locFuzzy.lng,
    };
  }

  // Fallback: return the name as-is with null coordinates
  return { label: name, lat: null, lng: null };
}
