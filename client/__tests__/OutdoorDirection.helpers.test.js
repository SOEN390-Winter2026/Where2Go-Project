import { __test__ } from "../src/OutdoorDirection";
import polyline from "@mapbox/polyline";

// Keep your existing polyline mock behavior (decode returns [] when falsy)
jest.mock("@mapbox/polyline", () => ({
  decode: jest.fn((encoded) => {
    if (!encoded) return [];
    return [
      [45.0, -73.0],
      [45.1, -73.1],
    ];
  }),
}));

jest.mock("../src/data/locations", () => ({
  SEARCHABLE_LOCATIONS: [
    { label: "Hall Building (H)", lat: 45.497, lng: -73.579, searchText: "hall building" },
    { label: "Hall Building", lat: 45.497, lng: -73.579, searchText: "hall building" }, // duplicate display name
  ],
}));

describe("OutdoorDirection helper coverage", () => {
  test("getBuildingDisplayName handles empty + parentheses", () => {
    expect(__test__.getBuildingDisplayName(null)).toBe(null);
    expect(__test__.getBuildingDisplayName("Hall Building (H)")).toBe("Hall Building");
    expect(__test__.getBuildingDisplayName("Library")).toBe("Library");
  });

  test("filterLocations returns [] for blank query", () => {
    expect(__test__.filterLocations("   ", [])).toEqual([]);
    expect(__test__.filterLocations("", [])).toEqual([]);
  });

  test("filterLocations dedupes by display name + caps MAX_RESULTS", () => {
    const buildings = Array.from({ length: 20 }, (_, i) => ({
      name: `Hall Extra ${i}`,
      coordinates: [{ latitude: 45.0 + i * 0.001, longitude: -73.0 - i * 0.001 }],
    }));

    const results = __test__.filterLocations("hall", buildings);

    // capped to 8
    expect(results.length).toBeLessThanOrEqual(8);

    // no duplicate display names
    const names = results.map((r) => __test__.getBuildingDisplayName(r.label));
    expect(new Set(names).size).toBe(names.length);
  });

  test("getModeDisplay covers default branch", () => {
    expect(__test__.getModeDisplay("walking").label).toBe("Walking");
    expect(__test__.getModeDisplay("transit").label).toBe("Transit");
    expect(__test__.getModeDisplay("concordia_shuttle").label).toBe("Concordia Shuttle");
    expect(__test__.getModeDisplay("weird_mode").label).toBe("weird_mode"); // default
  });

  test("decodePolylineToCoords + stepsToSegments branches", () => {
    // decodePolylineToCoords falsy path
    expect(__test__.decodePolylineToCoords(null)).toEqual([]);
    expect(polyline.decode).not.toHaveBeenCalledWith(null);

    const segs = __test__.stepsToSegments({
      steps: [
        { polyline: null, type: "walk" }, // filtered out
        { polyline: "STEP_OK", type: "walk" }, // kept
      ],
    });

    expect(polyline.decode).toHaveBeenCalledWith("STEP_OK");
    expect(segs.length).toBe(1);
    expect(segs[0].isWalk).toBe(true);
  });
});
