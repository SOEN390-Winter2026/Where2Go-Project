export const LEFT_BAR_BURGUNDY = "#912338";
export const LEFT_BAR_GREY = "#ccc";

/**
 * Shared toggle-button logic for outdoor {@link SideLeftBar} and {@link IndoorSideLeftBar}.
 * Indoor usage omits `activeGPS` (always inactive for gps).
 */
export function isLeftBarItemActive(name, { isAccessibilityEnabled, activePOI, activeGPS }) {
  if (name === "disability") return !!isAccessibilityEnabled;
  if (name === "poi") return activePOI === "poi";
  if (name === "gps") return activeGPS === "gps";
  return false;
}

export function leftBarItemBackgroundStyle(isActive) {
  return { backgroundColor: isActive ? LEFT_BAR_BURGUNDY : LEFT_BAR_GREY };
}

export function leftBarIconState(name, leftBarActiveInputs) {
  return leftBarItemBackgroundStyle(isLeftBarItemActive(name, leftBarActiveInputs));
}

/** `iconPairs` maps item name → [inactiveAsset, activeAsset] (subset keys per screen). */
export function leftBarIconSource(name, leftBarActiveInputs, iconPairs) {
  const active = isLeftBarItemActive(name, leftBarActiveInputs);
  const [off, on] = iconPairs[name] ?? [];
  return active ? on : off;
}
