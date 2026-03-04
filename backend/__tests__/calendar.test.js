const {
  parseEvent,
  parseEvents,
  extractBuildingAndRoom,
  normalizeDateTime,
  calculateDuration,
  validateEvent,
  getEventsByBuilding,
  getEventsByCampus,
  getEventsByDateRange,
  summarizeEventsByBuilding,
  getEventsNeedingLocationInfo,
  CONCORDIA_BUILDINGS,
} = require("../src/services/calendar");

describe("Calendar Service - Event Parsing & Normalization", () => {
  describe("extractBuildingAndRoom", () => {
    it("should extract building code and room from 'CODE-ROOM' pattern", () => {
      const result = extractBuildingAndRoom("Meeting in H-923");
      expect(result).toEqual({
        building: "Hall Building",
        buildingCode: "H",
        room: "923",
        campus: "SGW",
        confidence: "high",
      });
    });

    it("should extract building code and room from 'CODE ROOM' pattern", () => {
      const result = extractBuildingAndRoom("Class at JW 450");
      expect(result).toEqual({
        building: "McConnell Building",
        buildingCode: "JW",
        room: "450",
        campus: "SGW",
        confidence: "high",
      });
    });

    it("should extract from full building name with room number", () => {
      const result = extractBuildingAndRoom("Lecture in Hall Building room 401");
      expect(result).toEqual({
        building: "Hall Building",
        buildingCode: "H",
        room: "401",
        campus: "SGW",
        confidence: "high",
      });
    });

    it("should identify building even without room number", () => {
      const result = extractBuildingAndRoom("Meeting at McConnell");
      expect(result).not.toBeNull();
      expect(result.buildingCode).toBe("JW");
      expect(result.campus).toBe("SGW");
    });

    it("should handle Loyola campus buildings", () => {
      const result = extractBuildingAndRoom("VL-301");
      expect(result).toEqual({
        building: "Vanier Library Building",
        buildingCode: "VL",
        room: "301",
        campus: "Loyola",
        confidence: "high",
      });
    });

    it("should return null for invalid text", () => {
      expect(extractBuildingAndRoom("")).toBeNull();
      expect(extractBuildingAndRoom(null)).toBeNull();
      expect(extractBuildingAndRoom(undefined)).toBeNull();
    });

    it("should return null when no building found", () => {
      const result = extractBuildingAndRoom("Random text with no building");
      expect(result).toBeNull();
    });

    it("should handle case-insensitive building names", () => {
      const result = extractBuildingAndRoom("meeting at mcconnell room 123");
      expect(result).not.toBeNull();
      expect(result.buildingCode).toBe("JW");
    });
  });

  describe("normalizeDateTime", () => {
    it("should convert Date object to normalized format", () => {
      const date = new Date("2024-03-15T10:30:00Z");
      const result = normalizeDateTime(date);
      expect(result).toHaveProperty("iso");
      expect(result).toHaveProperty("epoch");
      expect(result).toHaveProperty("readable");
      expect(result.iso).toBe("2024-03-15T10:30:00.000Z");
    });

    it("should convert ISO string to normalized format", () => {
      const isoString = "2024-03-15T10:30:00Z";
      const result = normalizeDateTime(isoString);
      expect(result.iso).toBe("2024-03-15T10:30:00.000Z");
    });

    it("should convert epoch timestamp to normalized format", () => {
      const timestamp = 1710502200000; // 2024-03-15T10:30:00Z
      const result = normalizeDateTime(timestamp);
      expect(result).toHaveProperty("iso");
      expect(result).toHaveProperty("epoch");
    });

    it("should return null for invalid input", () => {
      expect(normalizeDateTime("invalid")).toBeNull();
      expect(normalizeDateTime(null)).toBeNull();
      expect(normalizeDateTime(undefined)).toBeNull();
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration between two dates in minutes", () => {
      const start = new Date("2024-03-15T10:00:00Z");
      const end = new Date("2024-03-15T11:30:00Z");
      const duration = calculateDuration(start, end);
      expect(duration).toBe(90);
    });

    it("should work with ISO strings", () => {
      const duration = calculateDuration("2024-03-15T10:00:00Z", "2024-03-15T10:45:00Z");
      expect(duration).toBe(45);
    });

    it("should work with epoch timestamps", () => {
      const start = 1710502800000; // 10:00
      const end = 1710506400000;   // 11:00
      const duration = calculateDuration(start, end);
      expect(duration).toBe(60);
    });

    it("should return null for invalid input", () => {
      expect(calculateDuration("invalid", "also-invalid")).toBeNull();
    });
  });

  describe("parseEvent", () => {
    const baseEvent = {
      id: "evt-123",
      title: "CS Class in H-923",
      description: "Introduction to Algorithms",
      location: "Hall Building",
      startDate: "2024-03-15T10:00:00Z",
      endDate: "2024-03-15T11:30:00Z",
    };

    it("should parse a valid event with all fields", () => {
      const result = parseEvent(baseEvent);
      
      expect(result).toHaveProperty("id", "evt-123");
      expect(result).toHaveProperty("title", "CS Class in H-923");
      expect(result).toHaveProperty("description", "Introduction to Algorithms");
      expect(result).toHaveProperty("location", "Hall Building");
      expect(result).toHaveProperty("startTime");
      expect(result).toHaveProperty("endTime");
      expect(result).toHaveProperty("duration", 90);
      expect(result).toHaveProperty("buildingCode", "H");
      expect(result).toHaveProperty("room", "923");
    });

    it("should extract building and room info from title", () => {
      const event = {
        ...baseEvent,
        title: "Meeting in JW 450",
      };
      const result = parseEvent(event);

      expect(result.building).toBe("McConnell Building");
      expect(result.buildingCode).toBe("JW");
      expect(result.room).toBe("450");
      expect(result.campus).toBe("SGW");
    });

    it("should handle events missing description and notes", () => {
      const minimal = {
        id: "evt-456",
        title: "Event at VL 301",
        startDate: "2024-03-15T10:00:00Z",
      };
      const result = parseEvent(minimal);

      expect(result.id).toBe("evt-456");
      expect(result.title).toBe("Event at VL 301");
      expect(result.description).toBe("");
      expect(result.buildingCode).toBe("VL");
    });

    it("should mark all-day events correctly", () => {
      const event = {
        ...baseEvent,
        allDay: true,
      };
      const result = parseEvent(event);

      expect(result.allDay).toBe(true);
    });

    it("should handle timezone-aware dates (startDateTz, endDateTz)", () => {
      const event = {
        id: "evt-789",
        title: "Test Event",
        startDateTz: "2024-03-15T10:00:00-04:00",
        endDateTz: "2024-03-15T11:00:00-04:00",
      };
      const result = parseEvent(event);

      expect(result.startTime).toHaveProperty("iso");
      expect(result.endTime).toHaveProperty("iso");
    });

    it("should return error for invalid input", () => {
      const result = parseEvent(null);
      expect(result).toHaveProperty("error");
    });

    it("should mark low confidence when building not found", () => {
      const event = {
        ...baseEvent,
        title: "Meeting somewhere",
        location: "Some random place",
      };
      const result = parseEvent(event);

      expect(result.building).toBeNull();
      expect(result.locationConfidence).toBe("low");
    });
  });

  describe("parseEvents", () => {
    it("should parse multiple events", () => {
      const events = [
        {
          id: "evt-1",
          title: "Class in H-923",
          startDate: "2024-03-15T10:00:00Z",
        },
        {
          id: "evt-2",
          title: "Meeting in MB 450",
          startDate: "2024-03-15T14:00:00Z",
        },
      ];
      const results = parseEvents(events);

      expect(results).toHaveLength(2);
      expect(results[0].buildingCode).toBe("H");
      expect(results[1].buildingCode).toBe("MB");
    });

    it("should filter out invalid events and return empty for non-array", () => {
      expect(parseEvents(null)).toEqual([]);
      expect(parseEvents(undefined)).toEqual([]);
      expect(parseEvents("not-an-array")).toEqual([]);
    });
  });

  describe("validateEvent", () => {
    const validEvent = {
      id: "evt-1",
      title: "Valid Event",
      startTime: { iso: "2024-03-15T10:00:00Z", epoch: 1710502800000 },
      endTime: { iso: "2024-03-15T11:00:00Z", epoch: 1710506400000 },
      buildingCode: "H",
      duration: 60,
    };

    it("should validate a complete event", () => {
      const result = validateEvent(validEvent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report missing ID", () => {
      const event = { ...validEvent, id: null };
      const result = validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing event ID");
    });

    it("should report missing title", () => {
      const event = { ...validEvent, title: "" };
      const result = validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing event title");
    });

    it("should report missing start time", () => {
      const event = { ...validEvent, startTime: null };
      const result = validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Missing start time");
    });

    it("should warn about missing building info", () => {
      const event = { ...validEvent, buildingCode: null, building: null };
      const result = validateEvent(event);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should detect negative duration (end before start)", () => {
      const event = { ...validEvent, duration: -60 };
      const result = validateEvent(event);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Event end time before start time");
    });
  });

  describe("getEventsByBuilding", () => {
    const events = [
      {
        id: "evt-1",
        title: "Class A",
        buildingCode: "H",
        startTime: { iso: "2024-03-15T10:00:00Z" },
      },
      {
        id: "evt-2",
        title: "Class B",
        buildingCode: "MB",
        startTime: { iso: "2024-03-15T11:00:00Z" },
      },
      {
        id: "evt-3",
        title: "Class C",
        buildingCode: "H",
        startTime: { iso: "2024-03-15T14:00:00Z" },
      },
    ];

    it("should filter events by building code", () => {
      const result = getEventsByBuilding(events, "H");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("evt-1");
      expect(result[1].id).toBe("evt-3");
    });

    it("should handle case-insensitive building code", () => {
      const result = getEventsByBuilding(events, "mb");

      expect(result).toHaveLength(1);
      expect(result[0].buildingCode).toBe("MB");
    });

    it("should return empty array for non-existent building", () => {
      const result = getEventsByBuilding(events, "NONEXISTENT");

      expect(result).toHaveLength(0);
    });

    it("should handle non-array input", () => {
      expect(getEventsByBuilding(null, "H")).toEqual([]);
      expect(getEventsByBuilding(undefined, "H")).toEqual([]);
    });
  });

  describe("getEventsByCampus", () => {
    const events = [
      { id: "evt-1", title: "SGW Event", campus: "SGW" },
      { id: "evt-2", title: "Loyola Event", campus: "Loyola" },
      { id: "evt-3", title: "Another SGW Event", campus: "SGW" },
    ];

    it("should filter events by campus", () => {
      const result = getEventsByCampus(events, "SGW");

      expect(result).toHaveLength(2);
      expect(result.every(e => e.campus === "SGW")).toBe(true);
    });

    it("should handle Loyola campus", () => {
      const result = getEventsByCampus(events, "Loyola");

      expect(result).toHaveLength(1);
      expect(result[0].campus).toBe("Loyola");
    });

    it("should return empty for non-existent campus", () => {
      const result = getEventsByCampus(events, "Unknown");

      expect(result).toHaveLength(0);
    });
  });

  describe("getEventsByDateRange", () => {
    const events = [
      {
        id: "evt-1",
        title: "Event on 15th",
        startTime: { iso: "2024-03-15T10:00:00Z", epoch: 1710502800000 },
      },
      {
        id: "evt-2",
        title: "Event on 16th",
        startTime: { iso: "2024-03-16T10:00:00Z", epoch: 1710589200000 },
      },
      {
        id: "evt-3",
        title: "Event on 17th",
        startTime: { iso: "2024-03-17T10:00:00Z", epoch: 1710675600000 },
      },
    ];

    it("should filter events within date range", () => {
      const result = getEventsByDateRange(
        events,
        "2024-03-15T00:00:00Z",
        "2024-03-16T23:59:59Z"
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("evt-1");
      expect(result[1].id).toBe("evt-2");
    });

    it("should include events at range boundaries", () => {
      const result = getEventsByDateRange(
        events,
        "2024-03-16T10:00:00Z",
        "2024-03-16T10:00:00Z"
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("evt-2");
    });
  });

  describe("summarizeEventsByBuilding", () => {
    const events = [
      { id: "evt-1", buildingCode: "H" },
      { id: "evt-2", buildingCode: "MB" },
      { id: "evt-3", buildingCode: "H" },
      { id: "evt-4", buildingCode: "VL" },
      { id: "evt-5", buildingCode: "H" },
    ];

    it("should count events by building", () => {
      const result = summarizeEventsByBuilding(events);

      expect(result).toEqual({
        H: 3,
        MB: 1,
        VL: 1,
      });
    });

    it("should ignore events without building code", () => {
      const eventsWithNull = [
        ...events,
        { id: "evt-6", buildingCode: null },
      ];
      const result = summarizeEventsByBuilding(eventsWithNull);

      expect(result).toEqual({
        H: 3,
        MB: 1,
        VL: 1,
      });
    });

    it("should handle empty arrays", () => {
      expect(summarizeEventsByBuilding([])).toEqual({});
      expect(summarizeEventsByBuilding(null)).toEqual({});
    });
  });

  describe("getEventsNeedingLocationInfo", () => {
    const events = [
      {
        id: "evt-1",
        building: "Hall Building",
        buildingCode: "H",
        locationConfidence: "high",
      },
      {
        id: "evt-2",
        building: null,
        buildingCode: null,
        locationConfidence: "low",
      },
      {
        id: "evt-3",
        building: "McConnell Building",
        buildingCode: "MB",
        locationConfidence: "low",
      },
    ];

    it("should identify events with missing location info", () => {
      const result = getEventsNeedingLocationInfo(events);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("evt-2");
      expect(result[1].id).toBe("evt-3");
    });

    it("should not include events with good location info", () => {
      const result = getEventsNeedingLocationInfo(events);

      expect(result.some(e => e.id === "evt-1")).toBe(false);
    });
  });

  describe("CONCORDIA_BUILDINGS constant", () => {
    it("should have SGW and Loyola buildings", () => {
      expect(CONCORDIA_BUILDINGS.H).toBeDefined();
      expect(CONCORDIA_BUILDINGS.H.campus).toBe("SGW");
      
      expect(CONCORDIA_BUILDINGS.VL).toBeDefined();
      expect(CONCORDIA_BUILDINGS.VL.campus).toBe("Loyola");
    });

    it("should map building aliases", () => {
      expect(CONCORDIA_BUILDINGS.MB).toBeDefined();
      expect(CONCORDIA_BUILDINGS.JMSB).toBeDefined();
      expect(CONCORDIA_BUILDINGS.MB.name).toBe(CONCORDIA_BUILDINGS.JMSB.name);
    });
  });

  describe("Integration: Full event parsing workflow", () => {
    it("should parse raw calendar event and extract all info", () => {
      const rawEvent = {
        id: "google-calendar-id-123",
        title: "Database Design - H-923",
        description: "Lecture on relational databases",
        location: "Hall Building, SGW Campus",
        startDate: "2024-03-20T10:00:00Z",
        endDate: "2024-03-20T11:30:00Z",
        notes: "Bring laptop",
      };

      const parsed = parseEvent(rawEvent);
      const validation = validateEvent(parsed);

      expect(parsed.id).toBe("google-calendar-id-123");
      expect(parsed.title).toBe("Database Design - H-923");
      expect(parsed.buildingCode).toBe("H");
      expect(parsed.room).toBe("923");
      expect(parsed.campus).toBe("SGW");
      expect(parsed.duration).toBe(90);
      expect(validation.isValid).toBe(true);
    });

    it("should handle complex multi-event workflow", () => {
      const rawEvents = [
        {
          id: "evt-1",
          title: "Morning lecture in H 401",
          startDate: "2024-03-20T10:00:00Z",
          endDate: "2024-03-20T11:30:00Z",
        },
        {
          id: "evt-2",
          title: "Afternoon lab in MB-550",
          startDate: "2024-03-20T14:00:00Z",
          endDate: "2024-03-20T16:00:00Z",
        },
        {
          id: "evt-3",
          title: "Tutorial at Loyola VL-201",
          startDate: "2024-03-20T15:30:00Z",
          endDate: "2024-03-20T16:30:00Z",
        },
      ];

      const parsed = parseEvents(rawEvents);

      expect(parsed).toHaveLength(3);
      expect(parsed[0].buildingCode).toBe("H");
      expect(parsed[1].buildingCode).toBe("MB");
      expect(parsed[2].buildingCode).toBe("VL");

      // Summary by building
      const summary = summarizeEventsByBuilding(parsed);
      expect(summary.H).toBe(1);
      expect(summary.MB).toBe(1);
      expect(summary.VL).toBe(1);

      // Filter by campus
      const loyolaEvents = getEventsByCampus(parsed, "Loyola");
      expect(loyolaEvents).toHaveLength(1);

      // Filter by building
      const hallEvents = getEventsByBuilding(parsed, "H");
      expect(hallEvents).toHaveLength(1);
    });
  });
});
