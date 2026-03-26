// Indoor routing unit tests (accessibility: avoid stairs, prefer elevators)

const {
  defaultIndoorMaps,
  loadGenerateAccessibleIndoorPath,
} = require("../../__mocks__/indoorAccessibleRoutingMocks");

describe("generateAccessibleIndoorPath (indoor accessibility)", () => {
  test("finds a path across floors using elevator (stairs avoided by default)", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        path: expect.any(Array),
        cost: expect.any(Number),
      })
    );

    const types = result.path.map((p) => String(p.type).toLowerCase());
    expect(types).toContain("elevator");
    expect(types).not.toContain("staircase");
  });

  test("returns NO_PATH if floors connect only via stairs", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          7: {
            image: null,
            data: {
              "H-7": {
                waypoints: [
                  { id: "wpStart", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["wpS7"] },
                  {
                    id: "wpS7",
                    type: "staircase",
                    position: { x: 0.2, y: 0.2 },
                    connections: [],
                    floorsReachable: ["8"],
                  },
                ],
                rooms: [{ id: "H-701", bounds: { x: 0, y: 0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpStart" }],
              },
            },
          },
          8: {
            image: null,
            data: {
              "H-8": {
                waypoints: [
                  {
                    id: "wpS8",
                    type: "staircase",
                    position: { x: 0.21, y: 0.21 },
                    connections: ["wpGoal"],
                    floorsReachable: ["7"],
                  },
                  { id: "wpGoal", type: "door", position: { x: 0.9, y: 0.1 }, connections: [] },
                ],
                rooms: [{ id: "H-801", bounds: { x: 0.9, y: 0, w: 0.1, h: 0.1 }, nearestWaypoint: "wpGoal" }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        meta: expect.objectContaining({ reason: "NO_PATH" }),
      })
    );
  });

  test("resolves floor aliases like H-7/H-8 and still routes", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          7: {
            image: null,
            data: {
              "H-7": {
                floor: "H-7",
                waypoints: [
                  { id: "start", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["e7"] },
                  { id: "e7", type: "elevator", position: { x: 0.2, y: 0.1 }, connections: [], floorsReachable: ["H-8"] },
                ],
                rooms: [{ id: "R7", nearestWaypoint: "start", bounds: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
              },
            },
          },
          8: {
            image: null,
            data: {
              "H-8": {
                floor: "H-8",
                waypoints: [
                  { id: "e8", type: "elevator", position: { x: 0.2, y: 0.1 }, connections: ["goal"], floorsReachable: ["H-7"] },
                  { id: "goal", type: "door", position: { x: 0.8, y: 0.1 }, connections: [] },
                ],
                rooms: [{ id: "R8", nearestWaypoint: "goal", bounds: { x: 0.8, y: 0, w: 0.1, h: 0.1 } }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "H-7", room: "R7" },
      to: { floor: "H-8", room: "R8" },
    });

    expect(result.success).toBe(true);
  });

  test("returns LOCATION_NOT_FOUND when room has no nearest waypoint and no bounds center", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          7: {
            image: null,
            data: {
              "H-7": {
                waypoints: [{ id: "w1", type: "door", position: { x: 0.1, y: 0.1 }, connections: [] }],
                rooms: [{ id: "BROKEN_ROOM" }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", room: "BROKEN_ROOM" },
      to: { floor: "7", room: "BROKEN_ROOM" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        meta: expect.objectContaining({ reason: "LOCATION_NOT_FOUND" }),
      })
    );
  });

  test("chooses the closest matching elevator shaft when multiple candidates exist", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          7: {
            image: null,
            data: {
              "H-7": {
                waypoints: [
                  { id: "start", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["e7"] },
                  { id: "e7", type: "elevator", position: { x: 0.2, y: 0.1 }, connections: [], floorsReachable: ["8"] },
                ],
                rooms: [{ id: "R7", nearestWaypoint: "start", bounds: { x: 0, y: 0, w: 0.1, h: 0.1 } }],
              },
            },
          },
          8: {
            image: null,
            data: {
              "H-8": {
                waypoints: [
                  // closer candidate (should be selected)
                  { id: "e8_near", type: "elevator", position: { x: 0.21, y: 0.1 }, connections: ["goal"], floorsReachable: ["7"] },
                  // farther candidate
                  { id: "e8_far", type: "elevator", position: { x: 0.9, y: 0.9 }, connections: ["goal"], floorsReachable: ["7"] },
                  { id: "goal", type: "door", position: { x: 0.8, y: 0.1 }, connections: [] },
                ],
                rooms: [{ id: "R8", nearestWaypoint: "goal", bounds: { x: 0.8, y: 0, w: 0.1, h: 0.1 } }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", room: "R7" },
      to: { floor: "8", room: "R8" },
    });

    expect(result.success).toBe(true);
    const waypointIds = result.path.map((p) => p.id);
    expect(waypointIds).toContain("e8_near");
    expect(waypointIds).not.toContain("e8_far");
  });
});

