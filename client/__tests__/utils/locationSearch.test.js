/**
 * Tests for locationSearch utility functions
 * Tests filtering, resolving, and formatting of location data
 */

import {
  getBuildingDisplayName,
  filterLocations,
  resolveLocationByName,
  MAX_RESULTS,
} from "../../src/utils/locationSearch";

jest.mock("../../src/data/locations", () => ({
  SEARCHABLE_LOCATIONS: [
    {
      label: "Hall Building (H)",
      lat: 45.497,
      lng: -73.579,
      searchText: "hall building h",
    },
    {
      label: "Hall Building",
      lat: 45.497,
      lng: -73.579,
      searchText: "hall building",
    },
    {
      label: "McConnell Building (JW)",
      lat: 45.4968,
      lng: -73.578,
      searchText: "mcconnell building jw",
    },
    {
      label: "SGW Campus",
      lat: 45.4974,
      lng: -73.5771,
      searchText: "sgw campus sir george williams",
    },
  ],
}));

describe("locationSearch utilities", () => {
  describe("getBuildingDisplayName", () => {
    it("removes parenthetical content from building labels", () => {
      expect(getBuildingDisplayName("Hall Building (H)")).toBe("Hall Building");
      expect(getBuildingDisplayName("McConnell Building (JW)")).toBe(
        "McConnell Building"
      );
    });

    it("handles labels without parentheses", () => {
      expect(getBuildingDisplayName("Library")).toBe("Library");
      expect(getBuildingDisplayName("SGW Campus")).toBe("SGW Campus");
    });

    it("handles null and empty strings", () => {
      expect(getBuildingDisplayName(null)).toBe(null);
      expect(getBuildingDisplayName("")).toBe("");
    });

    it("trims trailing spaces before parentheses", () => {
      expect(getBuildingDisplayName("Hall Building  (H)")).toBe(
        "Hall Building"
      );
    });
  });

  describe("filterLocations", () => {
    it("returns empty array for blank queries", () => {
      expect(filterLocations("", [])).toEqual([]);
      expect(filterLocations("   ", [])).toEqual([]);
      expect(filterLocations(null, [])).toEqual([]);
    });

    it("searches SEARCHABLE_LOCATIONS by searchText", () => {
      const results = filterLocations("hall", []);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label).toContain("Hall");
    });

    it("searches provided buildings array", () => {
      const buildings = [
        {
          name: "Custom Building",
          coordinates: [{ latitude: 45.0, longitude: -73.0 }],
        },
      ];
      const results = filterLocations("custom", buildings);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].label).toBe("Custom Building");
    });

    it("prioritizes buildings over SEARCHABLE_LOCATIONS in results", () => {
      const buildings = [
        {
          name: "Hall Extra Building",
          coordinates: [{ latitude: 45.5, longitude: -73.5 }],
        },
      ];
      const results = filterLocations("hall", buildings);
      // Buildings should be first in the combined array
      expect(results[0].label).toBe("Hall Extra Building");
    });

    it("deduplicates by display name", () => {
      const buildings = [
        { name: "Hall (H)", coordinates: [{ latitude: 45.0, longitude: -73.0 }] },
        { name: "Hall (Extra)", coordinates: [{ latitude: 45.1, longitude: -73.1 }] },
      ];
      const results = filterLocations("hall", buildings);
      const displayNames = results.map((r) =>
        getBuildingDisplayName(r.label)
      );
      const uniqueNames = new Set(displayNames);
      // Should have deduplicated results
      expect(uniqueNames.size).toBe(displayNames.length);
    });

    it("caps results at MAX_RESULTS", () => {
      const buildings = Array.from({ length: 20 }, (_, i) => ({
        name: `Building ${i}`,
        coordinates: [{ latitude: 45.0 + i * 0.001, longitude: -73.0 }],
      }));
      const results = filterLocations("building", buildings);
      expect(results.length).toBeLessThanOrEqual(MAX_RESULTS);
    });

    it("searches case-insensitively", () => {
      const results1 = filterLocations("HALL", []);
      const results2 = filterLocations("hall", []);
      expect(results1.length).toBe(results2.length);
      expect(results1[0].label).toBe(results2[0].label);
    });

    it("handles buildings with missing coordinates", () => {
      const buildings = [
        { name: "Test Building" },
        {
          name: "Good Building",
          coordinates: [{ latitude: 45.0, longitude: -73.0 }],
        },
      ];
      const results = filterLocations("building", buildings);
      // Should include both, even if one lacks coordinates
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("resolveLocationByName", () => {
    const mockBuildings = [
      {
        name: "Hall Building",
        coordinates: [{ latitude: 45.497, longitude: -73.579 }],
      },
      {
        name: "McConnell",
        coordinates: [{ latitude: 45.4968, longitude: -73.578 }],
      },
    ];

    it("returns null for null or empty input", () => {
      expect(resolveLocationByName(null, [])).toBe(null);
      expect(resolveLocationByName("", [])).toBe(null);
    });

    it("finds exact match in provided buildings", () => {
      const result = resolveLocationByName("Hall Building", mockBuildings);
      expect(result).toEqual({
        label: "Hall Building",
        lat: 45.497,
        lng: -73.579,
      });
    });

    it("finds fuzzy match in provided buildings", () => {
      const result = resolveLocationByName("mcconnell", mockBuildings);
      expect(result).toEqual({
        label: "McConnell",
        lat: 45.4968,
        lng: -73.578,
      });
    });

    it("finds exact match in SEARCHABLE_LOCATIONS", () => {
      const result = resolveLocationByName("SGW Campus", []);
      expect(result.label).toBe("SGW Campus");
      expect(result.lat).toBe(45.4974);
      expect(result.lng).toBe(-73.5771);
    });

    it("finds fuzzy match in SEARCHABLE_LOCATIONS", () => {
      const result = resolveLocationByName("hall", []);
      expect(result.label).toContain("Hall");
    });

    it("returns location with null coords if not found", () => {
      const result = resolveLocationByName("Nonexistent Place", []);
      expect(result).toEqual({
        label: "Nonexistent Place",
        lat: null,
        lng: null,
      });
    });

    it("prefers buildings over SEARCHABLE_LOCATIONS", () => {
      // Both arrays have "Hall", but buildings should be found first
      const result = resolveLocationByName("hall", mockBuildings);
      expect(result.lat).toBe(45.497);
    });

    it("handles buildings with missing coordinates", () => {
      const buildingsWithMissing = [
        { name: "Test Building" },
        {
          name: "Hall Building",
          coordinates: [{ latitude: 45.5, longitude: -73.5 }],
        },
      ];
      const result = resolveLocationByName("Test Building", buildingsWithMissing);
      expect(result).toEqual({
        label: "Test Building",
        lat: null,
        lng: null,
      });
    });

    it("formats display name when resolving from SEARCHABLE_LOCATIONS", () => {
      const result = resolveLocationByName("hall", []);
      // Should have parenthetical content removed from display
      expect(result.label).not.toContain("(");
    });

    it("case-insensitive matching", () => {
      const result1 = resolveLocationByName("HALL BUILDING", mockBuildings);
      const result2 = resolveLocationByName("hall building", mockBuildings);
      expect(result1.label).toBe(result2.label);
      expect(result1.lat).toBe(result2.lat);
    });
  });

  describe("MAX_RESULTS constant", () => {
    it("is set to 8", () => {
      expect(MAX_RESULTS).toBe(8);
    });
  });

  describe("integration scenarios", () => {
    it("filters and resolves complete workflow", () => {
      const buildings = [
        {
          name: "Parker Building",
          coordinates: [{ latitude: 45.48, longitude: -73.58 }],
        },
      ];

      // First: filter to get options
      const filterResults = filterLocations("Parker", buildings);
      expect(filterResults.length).toBeGreaterThan(0);

      // Then: resolve user selection
      const resolved = resolveLocationByName("Parker Building", buildings);
      expect(resolved.label).toBe("Parker Building");
      expect(resolved.lat).toBeDefined();
      expect(resolved.lng).toBeDefined();
    });
  });
});
