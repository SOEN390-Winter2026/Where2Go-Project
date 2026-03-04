/**
 * Calendar Service
 * 
 * Responsible for parsing, normalizing, and validating calendar event data.
 * Extracts structured information (room, building, time) from raw events.
 * 
 * Features:
 * - parseEvent(rawEvent) - converts raw event to normalized format
 * - extractBuildingAndRoom(text) - identifies building/room from text
 * - normalizeEventTime(startTime, endTime) - standardizes time format
 * - validateEvent(event) - checks event completeness
 * - getEventsByBuilding(events, building) - filters events by building
 */

// ─────────────────────────────────────────────────────────────────────────
// CONCORDIA BUILDING AND ROOM PATTERNS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Map of Concordia building codes and aliases.
 * Used to identify which building an event is in from text.
 */
const CONCORDIA_BUILDINGS = {
  // SGW Campus Buildings
  H: { name: "Hall Building", campus: "SGW", code: "H" },
  Hall: { name: "Hall Building", campus: "SGW", code: "H" },
  JW: { name: "McConnell Building", campus: "SGW", code: "JW" },
  McConnell: { name: "McConnell Building", campus: "SGW", code: "JW" },
  VA: { name: "Visual Arts Building", campus: "SGW", code: "VA" },
  "Visual Arts": { name: "Visual Arts Building", campus: "SGW", code: "VA" },
  EV: { name: "Engineering & Visual Arts", campus: "SGW", code: "EV" },
  "Engineering & Visual Arts": { name: "Engineering & Visual Arts", campus: "SGW", code: "EV" },
  GN: { name: "Grey Nuns Building", campus: "SGW", code: "GN" },
  "Grey Nuns": { name: "Grey Nuns Building", campus: "SGW", code: "GN" },
  FG: { name: "Faubourg Building", campus: "SGW", code: "FG" },
  Faubourg: { name: "Faubourg Building", campus: "SGW", code: "FG" },
  CL: { name: "CL Annex Building", campus: "SGW", code: "CL" },
  TD: { name: "Toronto-Dominion Building", campus: "SGW", code: "TD" },
  "Toronto-Dominion": { name: "Toronto-Dominion Building", campus: "SGW", code: "TD" },
  MB: { name: "John Molson Building", campus: "SGW", code: "MB" },
  JMSB: { name: "John Molson Building", campus: "SGW", code: "MB" },
  "John Molson": { name: "John Molson Building", campus: "SGW", code: "MB" },
  GM: { name: "Guy-De Maisonneuve Building", campus: "SGW", code: "GM" },
  LS: { name: "Learning Square Building", campus: "SGW", code: "LS" },
  ER: { name: "ER Building", campus: "SGW", code: "ER" },
  GS: { name: "GS Building", campus: "SGW", code: "GS" },
  SB: { name: "Samuel Bronfman Building", campus: "SGW", code: "SB" },
  
  // Loyola Campus Buildings
  DO: { name: "Stinger Dome Building", campus: "Loyola", code: "DO" },
  PC: { name: "PERFORM Center", campus: "Loyola", code: "PC" },
  RA: { name: "Recreation and Athletics Complex", campus: "Loyola", code: "RA" },
  GE: { name: "Centre for Structural and Functional Genomics", campus: "Loyola", code: "GE" },
  CJ: { name: "Communications Studies and Journalism Building", campus: "Loyola", code: "CJ" },
  SP: { name: "Richard J. Renaud Science Complex", campus: "Loyola", code: "SP" },
  AD: { name: "Administration Building", campus: "Loyola", code: "AD" },
  CC: { name: "Central Building", campus: "Loyola", code: "CC" },
  RF: { name: "Loyola Jesuit Hall and Conference Centre", campus: "Loyola", code: "RF" },
  FC: { name: "F.C Smith Building", campus: "Loyola", code: "FC" },
  QA: { name: "Quadrangle", campus: "Loyola", code: "QA" },
  PY: { name: "Psychology Building", campus: "Loyola", code: "PY" },
  VE: { name: "Vanier Extension", campus: "Loyola", code: "VE" },
  VL: { name: "Vanier Library Building", campus: "Loyola", code: "VL" },
  PT: { name: "Oscar Peterson Concert Hall", campus: "Loyola", code: "PT" },
  SC: { name: "Student Centre", campus: "Loyola", code: "SC" },
};

// ─────────────────────────────────────────────────────────────────────────
// PARSING AND EXTRACTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Extract building and room information from text.
 * 
 * Handles patterns like:
 * - "H-923" (building H, room 923)
 * - "JW 450" (building JW, room 450)
 * - "Loyola Gym Room 105"
 * - "SGW Hall 401"
 * 
 * @param {string} text - Text to extract from (e.g., event title or location)
 * @returns {object|null} { building, buildingCode, room, campus, confidence } or null
 */
function extractBuildingAndRoom(text) {
  if (!text || typeof text !== "string") return null;

  const cleanText = text.trim();

  // Pattern 1: Building code followed by room number (e.g., "H-923", "JW 450")
  // Matches: CODE-ROOM or CODE ROOM (where CODE is 1-4 alphanumeric chars)
  const codeRoomPattern = /\b([A-Z]{1,4})\s*[-\s]\s*(\d{1,4})\b/i;
  const codeRoomMatch = cleanText.match(codeRoomPattern);

  if (codeRoomMatch) {
    const buildingCode = codeRoomMatch[1].toUpperCase();
    const room = codeRoomMatch[2];
    
    const buildingInfo = CONCORDIA_BUILDINGS[buildingCode];
    if (buildingInfo) {
      return {
        building: buildingInfo.name,
        buildingCode: buildingInfo.code,
        room,
        campus: buildingInfo.campus,
        confidence: "high",
      };
    }
  }

  // Pattern 2: Full building name + room (e.g., "Hall 401", "McConnell Room 250")
  for (const [key, info] of Object.entries(CONCORDIA_BUILDINGS)) {
    if (cleanText.toLowerCase().includes(key.toLowerCase())) {
      // Look for room number near the building name
      const roomPattern = /room\s*(\d{1,4})|(\d{1,4})/i;
      const roomMatch = cleanText.match(roomPattern);
      
      const room = roomMatch ? roomMatch[1] || roomMatch[2] : null;
      
      return {
        building: info.name,
        buildingCode: info.code,
        room,
        campus: info.campus,
        confidence: room ? "high" : "medium",
      };
    }
  }

  return null;
}

/**
 * Normalize date and time values to ISO 8601 format.
 * Handles both Date objects and timestamp strings.
 * 
 * @param {Date|string|number} dateValue - Date to normalize
 * @returns {object} { iso: string, epoch: number }
 */
function normalizeDateTime(dateValue) {
  let date;

  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else if (typeof dateValue === "number") {
    date = new Date(dateValue);
  } else {
    return null;
  }

  if (Number.isNaN(date.getTime())) return null;

  return {
    iso: date.toISOString(),
    epoch: date.getTime(),
    readable: date.toLocaleString(),
  };
}

/**
 * Calculate event duration in minutes.
 * 
 * @param {Date|string|number} startTime
 * @param {Date|string|number} endTime
 * @returns {number|null} Duration in minutes
 */
function calculateDuration(startTime, endTime) {
  const start = normalizeDateTime(startTime);
  const end = normalizeDateTime(endTime);

  if (!start || !end) return null;

  return Math.round((end.epoch - start.epoch) / (1000 * 60));
}

/**
 * Parse a raw calendar event into a normalized format.
 * 
 * Handles events from expo-calendar with fields like:
 * - id, title, description, location, startDate, endDate, etc.
 * 
 * @param {object} rawEvent - Raw event from calendar API
 * @returns {object} Normalized event with extracted building/room info
 */
function parseEvent(rawEvent) {
  if (!rawEvent || typeof rawEvent !== "object") {
    return { error: "Invalid event object" };
  }

  const {
    id,
    title = "",
    description = "",
    location = "",
    startDate,
    endDate,
    startDateTz,
    endDateTz,
    notes = "",
    ...otherFields
  } = rawEvent;

  // Extract structured location data
  const locationData = extractBuildingAndRoom(
    [title, description, location, notes].join(" ")
  );

  // Normalize times
  const startTime = normalizeDateTime(startDate || startDateTz);
  const endTime = normalizeDateTime(endDate || endDateTz);
  const duration = calculateDuration(startDate || startDateTz, endDate || endDateTz);

  return {
    // Core event data
    id,
    title: title.trim(),
    description: description.trim(),
    location: location.trim(),
    notes: notes.trim(),

    // Normalized time data
    startTime,
    endTime,
    duration, // in minutes
    allDay: rawEvent.allDay || false,

    // Extracted location data
    building: locationData?.building || null,
    buildingCode: locationData?.buildingCode || null,
    room: locationData?.room || null,
    campus: locationData?.campus || null,
    locationConfidence: locationData?.confidence || "low",

    // Original fields (for reference/debugging)
    _rawEvent: otherFields,
  };
}

/**
 * Validate a normalized event for completeness and required fields.
 * 
 * @param {object} event - Normalized event object
 * @returns {object} { isValid: boolean, errors: string[], warnings: string[] }
 */
function validateEvent(event) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!event.id) errors.push("Missing event ID");
  if (!event.title || event.title.trim() === "") errors.push("Missing event title");

  // Time validation
  if (!event.startTime) errors.push("Missing start time");
  if (!event.endTime && !event.allDay) warnings.push("Missing end time for non-all-day event");

  // Location warnings (not required but helpful)
  if (!event.building) {
    warnings.push("Could not extract building information");
  }
  if (event.building && !event.room) {
    warnings.push("Building identified but no room number found");
  }

  // Duration validation
  if (event.duration !== null && event.duration < 0) {
    errors.push("Event end time before start time");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Parse multiple calendar events.
 * 
 * @param {array} rawEvents - Array of raw events
 * @returns {array} Array of parsed and normalized events
 */
function parseEvents(rawEvents) {
  if (!Array.isArray(rawEvents)) return [];

  return rawEvents
    .map(parseEvent)
    .filter(event => !event.error);
}

// ─────────────────────────────────────────────────────────────────────────
// FILTERING AND UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────

/**
 * Filter events by building.
 * 
 * @param {array} events - Array of normalized events
 * @param {string} buildingCode - Building code to filter by (e.g., "H", "MB")
 * @returns {array} Filtered events
 */
function getEventsByBuilding(events, buildingCode) {
  if (!Array.isArray(events)) return [];

  return events.filter(
    event => event.buildingCode === buildingCode.toUpperCase()
  );
}

/**
 * Filter events by campus.
 * 
 * @param {array} events - Array of normalized events
 * @param {string} campus - Campus name ("SGW" or "Loyola")
 * @returns {array} Filtered events
 */
function getEventsByCampus(events, campus) {
  if (!Array.isArray(events)) return [];

  return events.filter(event => event.campus === campus);
}

/**
 * Filter events by date range.
 * 
 * @param {array} events - Array of normalized events
 * @param {Date|string} startDate - Start of range (inclusive)
 * @param {Date|string} endDate - End of range (inclusive)
 * @returns {array} Filtered events
 */
function getEventsByDateRange(events, startDate, endDate) {
  if (!Array.isArray(events)) return [];

  const start = normalizeDateTime(startDate);
  const end = normalizeDateTime(endDate);

  if (!start || !end) return [];

  return events.filter(event => {
    if (!event.startTime) return false;
    const eventStart = event.startTime.epoch;
    return eventStart >= start.epoch && eventStart <= end.epoch;
  });
}

/**
 * Get a summary of events by building.
 * Useful for understanding event distribution across campus.
 * 
 * @param {array} events - Array of normalized events
 * @returns {object} { buildingCode: count, ... }
 */
function summarizeEventsByBuilding(events) {
  if (!Array.isArray(events)) return {};

  const summary = {};

  events.forEach(event => {
    if (event.buildingCode) {
      summary[event.buildingCode] = (summary[event.buildingCode] || 0) + 1;
    }
  });

  return summary;
}

/**
 * Get events with low location confidence.
 * Useful for identifying events that need manual location assignment.
 * 
 * @param {array} events - Array of normalized events
 * @returns {array} Events with missing or low-confidence location info
 */
function getEventsNeedingLocationInfo(events) {
  if (!Array.isArray(events)) return [];

  return events.filter(
    event => !event.building || event.locationConfidence === "low"
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────

module.exports = {
  // Parsing functions
  parseEvent,
  parseEvents,
  extractBuildingAndRoom,
  normalizeDateTime,
  calculateDuration,

  // Validation
  validateEvent,

  // Filtering and utilities
  getEventsByBuilding,
  getEventsByCampus,
  getEventsByDateRange,
  summarizeEventsByBuilding,
  getEventsNeedingLocationInfo,

  // Constants
  CONCORDIA_BUILDINGS,
};
