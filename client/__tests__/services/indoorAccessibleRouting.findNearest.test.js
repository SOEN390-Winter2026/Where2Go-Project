const { findNearestWaypointId } = require("../../src/services/indoorAccessibleRouting");

function makeFloorGraph(rooms, waypoints) {
  const waypointById = new Map(waypoints.map((w) => [String(w.id), w]));
  return {
    floorPlan: { rooms, waypoints },
    waypointById,
  };
}

describe("findNearestWaypointId", () => {
  it("returns null when floor graph is missing", () => {
    expect(findNearestWaypointId(new Map(), "1", "R1", null)).toBeNull();
  });

  it("returns explicit waypointId when present in graph", () => {
    const fg = new Map([
      [
        "1",
        makeFloorGraph(
          [],
          [{ id: "w1", type: "door", position: { x: 0.5, y: 0.5 } }]
        ),
      ],
    ]);
    expect(findNearestWaypointId(fg, "1", "any", "w1")).toBe("w1");
  });

  it("ignores waypointId not in graph; invalid nearestWaypoint falls through to closest-by-center", () => {
    const fg = new Map([
      [
        "1",
        makeFloorGraph(
          [{ id: "R1", bounds: { x: 0, y: 0, w: 0.2, h: 0.2 }, nearestWaypoint: "w9" }],
          [
            { id: "w1", type: "door", position: { x: 0.1, y: 0.1 } },
            { id: "w2", type: "door", position: { x: 0.9, y: 0.9 } },
          ]
        ),
      ],
    ]);
    expect(findNearestWaypointId(fg, "1", "R1", "bad")).toBe("w1");
  });

  it("returns null when room has no bounds and no valid nearest", () => {
    const fg = new Map([
      [
        "1",
        makeFloorGraph(
          [{ id: "R1" }],
          [{ id: "w1", type: "door", position: { x: 0.1, y: 0.1 } }]
        ),
      ],
    ]);
    expect(findNearestWaypointId(fg, "1", "R1", null)).toBeNull();
  });

  it("returns closest waypoint by room center when nearestWaypoint on room is invalid", () => {
    const fg = new Map([
      [
        "1",
        makeFloorGraph(
          [{ id: "R1", bounds: { x: 0, y: 0, w: 0.1, h: 0.1 }, nearestWaypoint: "missing" }],
          [
            { id: "near", type: "door", position: { x: 0.11, y: 0.11 } },
            { id: "far", type: "door", position: { x: 0.9, y: 0.9 } },
          ]
        ),
      ],
    ]);
    expect(findNearestWaypointId(fg, "1", "R1", null)).toBe("near");
  });
});
