import {
  BUILDING_ENTRANCES,
  getBuildingForLocation,
  getNearestEntrance,
  analyzeRouteTransition,
} from "../../src/data/locations";

describe("BUILDING_ENTRANCES", () => {
  it("has entries for key SGW buildings", () => {
    expect(BUILDING_ENTRANCES).toHaveProperty("hall");
    expect(BUILDING_ENTRANCES).toHaveProperty("mb");
    expect(BUILDING_ENTRANCES).toHaveProperty("ev");
  });

  it("each entrance has lat, lng, and description", () => {
    Object.values(BUILDING_ENTRANCES).forEach((entrances) => {
      expect(Array.isArray(entrances)).toBe(true);
      entrances.forEach((e) => {
        expect(typeof e.lat).toBe("number");
        expect(typeof e.lng).toBe("number");
        expect(typeof e.description).toBe("string");
      });
    });
  });
});

describe("getBuildingForLocation", () => {
  it("returns building info for a point at the Hall Building centroid", () => {
    const result = getBuildingForLocation(45.49728, -73.57896);
    expect(result).not.toBeNull();
    expect(result.name).toMatch(/Hall/i);
  });

  it("returns null for a point far from any building", () => {
    const result = getBuildingForLocation(40.0, -74.0);
    expect(result).toBeNull();
  });

  it("respects the radius parameter", () => {
    const close = getBuildingForLocation(45.49728, -73.57896, 100);
    expect(close).not.toBeNull();
    const far = getBuildingForLocation(45.49728, -73.57896, -1);
    expect(far).toBeNull();
  });
});

describe("getNearestEntrance", () => {
  it("returns the nearest entrance for a known building", () => {
    const result = getNearestEntrance("hall", 45.4975, -73.5788);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("lat");
    expect(result).toHaveProperty("lng");
    expect(result).toHaveProperty("description");
  });

  it("returns null for an unknown building code", () => {
    const result = getNearestEntrance("unknown_building", 45.4975, -73.5788);
    expect(result).toBeNull();
  });

  it("picks the closer entrance when multiple exist", () => {
    const sideEntrance = BUILDING_ENTRANCES.hall[1];
    const result = getNearestEntrance("hall", sideEntrance.lat, sideEntrance.lng);
    expect(result.lat).toBe(sideEntrance.lat);
    expect(result.lng).toBe(sideEntrance.lng);
  });
});

describe("analyzeRouteTransition", () => {
  const hallCentroid = { lat: 45.49728, lng: -73.57896 };
  const outdoorPoint = { lat: 40.0, lng: -74.0 };

  it("detects origin inside a building", () => {
    const result = analyzeRouteTransition(hallCentroid, outdoorPoint);
    expect(result.originIndoor).toBe(true);
    expect(result.destinationIndoor).toBe(false);
    expect(result.requiresTransition).toBe(true);
  });

  it("detects destination inside a building", () => {
    const result = analyzeRouteTransition(outdoorPoint, hallCentroid);
    expect(result.originIndoor).toBe(false);
    expect(result.destinationIndoor).toBe(true);
    expect(result.requiresTransition).toBe(true);
  });

  it("returns no transition for two outdoor points", () => {
    const result = analyzeRouteTransition(outdoorPoint, { lat: 41.0, lng: -74.0 });
    expect(result.requiresTransition).toBe(false);
    expect(result.originIndoor).toBe(false);
    expect(result.destinationIndoor).toBe(false);
  });
});
