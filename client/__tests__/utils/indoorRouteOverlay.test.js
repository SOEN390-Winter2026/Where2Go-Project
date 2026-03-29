const {
  contiguousNormRunsByFloor,
  buildIndoorRoutePolylinesByFloor,
  getPolylinesForFloor,
} = require("../../src/utils/indoorRouteOverlay");

describe("indoorRouteOverlay", () => {
  test("contiguousNormRunsByFloor splits by floor and drops short runs", () => {
    const path = [
      { floor: "2", position: { x: 0.1, y: 0.1 } },
      { floor: "2", position: { x: 0.2, y: 0.2 } },
      { floor: "8", position: { x: 0.3, y: 0.3 } },
      { floor: "8", position: { x: 0.3, y: 0.3 } },
      { floor: "8", position: { x: 0.4, y: 0.4 } },
    ];
    const runs = contiguousNormRunsByFloor(path);
    expect(runs).toHaveLength(2);
    expect(runs[0].floor).toBe("2");
    expect(runs[0].points).toHaveLength(2);
    expect(runs[1].floor).toBe("8");
    expect(runs[1].points).toHaveLength(2);
  });

  test("buildIndoorRoutePolylinesByFloor keeps only matching building indoor segments", () => {
    const segments = [
      {
        kind: "indoor",
        buildingCode: "H",
        path: [
          { floor: "7", position: { x: 0, y: 0 } },
          { floor: "7", position: { x: 1, y: 1 } },
        ],
      },
      { kind: "outdoor", summary: "walk" },
      {
        kind: "indoor",
        buildingCode: "MB",
        path: [
          { floor: "1", position: { x: 0.5, y: 0.5 } },
          { floor: "1", position: { x: 0.6, y: 0.6 } },
        ],
      },
    ];
    const byFloor = buildIndoorRoutePolylinesByFloor(segments, "H");
    expect(byFloor["7"]).toHaveLength(1);
    expect(byFloor["7"][0]).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
    expect(byFloor["1"]).toBeUndefined();
  });

  test("getPolylinesForFloor resolves numeric string keys", () => {
    const map = { 7: [[{ x: 0, y: 0 }]] };
    expect(getPolylinesForFloor(map, "7")).toEqual([[{ x: 0, y: 0 }]]);
    expect(getPolylinesForFloor(map, 7)).toEqual([[{ x: 0, y: 0 }]]);
  });
});
