import { CAMPUS_COORDS, SEARCHABLE_LOCATIONS } from "../../src/data/locations";

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
