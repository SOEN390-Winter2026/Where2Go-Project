import { CAMPUS_COORDS, SEARCHABLE_LOCATIONS, getBuildingForLocation, getNearestEntrance, analyzeRouteTransition } from "../../src/data/locations";

describe("CAMPUS_COORDS", () => {
  it("contains SGW and Loyola", () => {
    expect(CAMPUS_COORDS).toHaveProperty("SGW");
    expect(CAMPUS_COORDS).toHaveProperty("Loyola");
  });

  it("has latitude and longitude for each campus", () => {
    Object.values(CAMPUS_COORDS).forEach((campus) => {
      expect(campus).toHaveProperty("latitude");
      expect(campus).toHaveProperty("longitude");

      expect(typeof campus.latitude).toBe("number");
      expect(typeof campus.longitude).toBe("number");
    });
  });

  it("coordinates are within valid ranges", () => {
    Object.values(CAMPUS_COORDS).forEach(({ latitude, longitude }) => {
      expect(latitude).toBeGreaterThanOrEqual(-90);
      expect(latitude).toBeLessThanOrEqual(90);
      expect(longitude).toBeGreaterThanOrEqual(-180);
      expect(longitude).toBeLessThanOrEqual(180);
    });
  });
});

describe("SEARCHABLE_LOCATIONS", () => {
  it("is not empty", () => {
    expect(SEARCHABLE_LOCATIONS.length).toBeGreaterThan(0);
  });

  it("has all required fields", () => {
    SEARCHABLE_LOCATIONS.forEach((location) => {
      expect(location).toHaveProperty("label");
      expect(location).toHaveProperty("lat");
      expect(location).toHaveProperty("lng");
      expect(location).toHaveProperty("searchText");

      expect(typeof location.lat).toBe("number");
      expect(typeof location.lng).toBe("number");
      expect(typeof location.searchText).toBe("string");
    });
  });

  it("searchText is lowercase", () => {
    SEARCHABLE_LOCATIONS.forEach(({ searchText }) => {
      expect(searchText).toBe(searchText.toLowerCase());
    });
  });

  it("labels are unique", () => {
    const labels = SEARCHABLE_LOCATIONS.map((l) => l.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it("coordinates are within valid ranges", () => {
    SEARCHABLE_LOCATIONS.forEach(({ lat, lng }) => {
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
    });
  });

});

describe("getBuildingForLocation", () => {
  it("returns building info when location is inside a building", () => {
    const result = getBuildingForLocation(45.49728, -73.57896);
    expect(result).toEqual({
      code: "hall",
      name: "Hall Building",
      campus: "sgw",
      centroid: { lat: 45.49728, lng: -73.57896 },
      distance: 0
    });
  });

  it("returns null when location is outside any building", () => {
    const result = getBuildingForLocation(0, 0);
    expect(result).toBeNull();
  });

  it("returns null for campus locations", () => {
    const result = getBuildingForLocation(45.4974, -73.5771);
    expect(result).toBeNull();
  });

  it("handles custom radius", () => {
    const result = getBuildingForLocation(45.49728, -73.57896, 10);
    expect(result).not.toBeNull();
  });

  it("calculates distance correctly", () => {
    const result = getBuildingForLocation(45.49728 + 0.0001, -73.57896);
    expect(result.distance).toBeGreaterThan(0);
  });
});

describe("getNearestEntrance", () => {
  it("returns nearest entrance for hall building", () => {
    const result = getNearestEntrance("hall", 45.4975, -73.5788);
    expect(result).toHaveProperty("lat");
    expect(result).toHaveProperty("lng");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("distance");
  });

  it("returns null for building with no entrances", () => {
    const result = getNearestEntrance("nonexistent", 0, 0);
    expect(result).toBeNull();
  });

  it("calculates distance to nearest entrance", () => {
    const result = getNearestEntrance("hall", 45.4970, -73.5785);
    expect(result.distance).toBe(0);
  });
});

describe("analyzeRouteTransition", () => {
  it("detects indoor to outdoor transition", () => {
    const origin = { lat: 45.49728, lng: -73.57896 };
    const destination = { lat: 45.4974, lng: -73.5771 };
    const result = analyzeRouteTransition(origin, destination);
    expect(result.originIndoor).toBe(true);
    expect(result.destinationIndoor).toBe(false);
    expect(result.requiresTransition).toBe(true);
  });

  it("detects outdoor to indoor transition", () => {
    const origin = { lat: 45.4974, lng: -73.5771 };
    const destination = { lat: 45.49728, lng: -73.57896 };
    const result = analyzeRouteTransition(origin, destination);
    expect(result.originIndoor).toBe(false);
    expect(result.destinationIndoor).toBe(true);
    expect(result.requiresTransition).toBe(true);
  });

  it("detects no transition needed", () => {
    const origin = { lat: 45.4974, lng: -73.5771 };
    const destination = { lat: 0, lng: 0 };
    const result = analyzeRouteTransition(origin, destination);
    expect(result.originIndoor).toBe(false);
    expect(result.destinationIndoor).toBe(false);
    expect(result.requiresTransition).toBe(false);
  });

  it("handles indoor to indoor transition", () => {
    const origin = { lat: 45.49728, lng: -73.57896 };
    const destination = { lat: 45.49578, lng: -73.57377 };
    const result = analyzeRouteTransition(origin, destination);
    expect(result.originIndoor).toBe(true);
    expect(result.destinationIndoor).toBe(true);
    expect(result.requiresTransition).toBe(true);
  });
});
