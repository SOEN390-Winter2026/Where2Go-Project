import * as Calendar from "expo-calendar";

/**
 * Returns savedIds filtered to only those that exist in allCalendars.
 */
export function getValidCalendarIds(savedIds, allCalendars) {
  const idSet = new Set(allCalendars.map((c) => String(c.id)));
  return savedIds.filter((id) => idSet.has(String(id)));
}

/**
 * Fetches calendars if permitted. Returns array or null on error.
 */
export async function fetchCalendarsIfPermitted() {
  try {
    return await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  } catch {
    return null;
  }
}
