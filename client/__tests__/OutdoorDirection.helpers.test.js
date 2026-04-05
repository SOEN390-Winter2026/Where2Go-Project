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
  test("location search functions are exported and callable through __test__", () => {
    // Verify functions imported from locationSearch utility are available
    expect(typeof __test__.getBuildingDisplayName).toBe("function");
    expect(typeof __test__.filterLocations).toBe("function");
    expect(typeof __test__.resolveLocationByName).toBe("function");
  });

  test("getModeDisplay covers all modes", () => {
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

  test("isWalkingLongForAccessibilityNote is true only for walking over 30 minutes", () => {
    const { isWalkingLongForAccessibilityNote } = __test__;
    expect(isWalkingLongForAccessibilityNote({ mode: "walking", duration: { value: 20 * 60 } })).toBe(false);
    expect(isWalkingLongForAccessibilityNote({ mode: "walking", duration: { value: 31 * 60 } })).toBe(true);
    expect(isWalkingLongForAccessibilityNote({ mode: "transit", duration: { value: 99 * 60 } })).toBe(false);
    expect(isWalkingLongForAccessibilityNote({ mode: "walking", duration: {} })).toBe(false);
  });

  test("getEmptyStateCopy uses accessibility strings for NO_ACCESSIBLE_ROUTES", () => {
    const { getEmptyStateCopy } = __test__;
    const copy = getEmptyStateCopy("NO_ACCESSIBLE_ROUTES", null);
    expect(copy.icon).toBe("accessibility-outline");
    expect(copy.title).toBe("No accessible route available");
    expect(copy.body).toContain("wheelchair-accessible");
  });

  test("getEmptyStateCopy uses connection hint when error is set", () => {
    const { getEmptyStateCopy } = __test__;
    const copy = getEmptyStateCopy("NO_ROUTES", "Network failed");
    expect(copy.icon).toBe("map-outline");
    expect(copy.title).toBe("No routes found");
    expect(copy.body).toBe("Try selecting different locations or check your connection.");
  });

  test("getEmptyStateCopy uses default hint when no accessible flag and no error", () => {
    const { getEmptyStateCopy } = __test__;
    const copy = getEmptyStateCopy("NO_ROUTES", null);
    expect(copy.body).toBe("Try selecting different locations or another mode.");
  });
});
