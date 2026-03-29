
const {
  defaultIndoorMaps,
  loadGenerateAccessibleIndoorPath,
} = require("../../__mocks__/indoorAccessibleRoutingMocks");

describe("generateAccessibleIndoorPath (indoor accessibility)", () => {
  test("returns INVALID_INPUT when campus or buildingCode is missing", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const noCampus = generateAccessibleIndoorPath({
      buildingCode: "H",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });
    expect(noCampus.success).toBe(false);
    expect(noCampus.meta).toEqual(
      expect.objectContaining({
        reason: "INVALID_INPUT",
        details: expect.objectContaining({ missingFields: expect.arrayContaining(["campus"]) }),
      })
    );

    const noBuilding = generateAccessibleIndoorPath({
      campus: "SGW",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });
    expect(noBuilding.meta?.details?.missingFields).toContain("buildingCode");
  });

  test("returns INVALID_INPUT when from/to floor or room is missing", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const noFromFloor = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });
    expect(noFromFloor.meta).toEqual(
      expect.objectContaining({
        reason: "INVALID_INPUT",
        details: expect.objectContaining({ from: { missingFields: ["floor"] } }),
      })
    );

    const noRoom = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7" },
      to: { floor: "8", room: "H-801" },
    });
    expect(noRoom.meta?.reason).toBe("INVALID_INPUT");
    expect(noRoom.meta?.details?.from?.missingFields).toContain("room");
  });

  test("accepts start endpoint with waypointId and no room id", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", waypointId: "wpStart" },
      to: { floor: "8", room: "H-801" },
    });
    expect(result.success).toBe(true);
  });

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
        meta: expect.objectContaining({
          reason: "LOCATION_NOT_FOUND",
          details: expect.objectContaining({
            from: expect.objectContaining({ room: "BROKEN_ROOM", resolvedFloorId: "7" }),
          }),
        }),
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

  test("returns INVALID_BUILDING when building code is missing from campus maps", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "NOT_A_BUILDING",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    });
    expect(result.success).toBe(false);
    expect(result.meta?.reason).toBe("INVALID_BUILDING");
  });

  test("allow stairs when avoidStairs is false (same graph as stairs-only NO_PATH case)", () => {
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
      avoidStairs: false,
    });

    expect(result.success).toBe(true);
    expect(result.path.map((p) => String(p.type).toLowerCase())).toContain("staircase");
  });

  test("uses graph cache on second identical request", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(defaultIndoorMaps());
    const args = {
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "7", room: "H-701" },
      to: { floor: "8", room: "H-801" },
    };
    const a = generateAccessibleIndoorPath(args);
    const b = generateAccessibleIndoorPath(args);
    expect(a.success && b.success).toBe(true);
    expect(b.cost).toBe(a.cost);
  });

  test("bridges disconnected waypoint clusters on the same floor", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "a", type: "door", position: { x: 0.05, y: 0.05 }, connections: ["b"] },
                  { id: "b", type: "door", position: { x: 0.06, y: 0.06 }, connections: ["a"] },
                  { id: "c", type: "door", position: { x: 0.95, y: 0.95 }, connections: ["d"] },
                  { id: "d", type: "door", position: { x: 0.96, y: 0.96 }, connections: ["c"] },
                ],
                rooms: [
                  { id: "R_START", bounds: { x: 0, y: 0, w: 0.04, h: 0.04 }, nearestWaypoint: "a" },
                  { id: "R_END", bounds: { x: 0.94, y: 0.94, w: 0.04, h: 0.04 }, nearestWaypoint: "c" },
                ],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "1", room: "R_START" },
      to: { floor: "1", room: "R_END" },
    });

    expect(result.success).toBe(true);
    expect(result.path.map((p) => p.id)).toEqual(expect.arrayContaining(["a", "c"]));
  });

  test("synthetic doorway is added when room has bounds but no nearestWaypoint", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "hub", type: "door", position: { x: 0.5, y: 0.5 }, connections: [] },
                ],
                rooms: [{ id: "R_ORPHAN", bounds: { x: 0.48, y: 0.48, w: 0.02, h: 0.02 } }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "1", room: "R_ORPHAN" },
      to: { floor: "1", room: "R_ORPHAN" },
    });
    expect(result.success).toBe(true);
  });

  test("returns NO_PATH when floors are not connected by elevator or stairs", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [{ id: "w1", type: "door", position: { x: 0.1, y: 0.1 }, connections: [] }],
                rooms: [{ id: "A", bounds: { x: 0, y: 0, w: 0.02, h: 0.02 }, nearestWaypoint: "w1" }],
              },
            },
          },
          2: {
            image: null,
            data: {
              F2: {
                waypoints: [{ id: "w2", type: "door", position: { x: 0.1, y: 0.1 }, connections: [] }],
                rooms: [{ id: "B", bounds: { x: 0, y: 0, w: 0.02, h: 0.02 }, nearestWaypoint: "w2" }],
              },
            },
          },
        },
      },
    });

    const result = generateAccessibleIndoorPath({
      campus: "SGW",
      buildingCode: "H",
      from: { floor: "1", room: "A" },
      to: { floor: "2", room: "B" },
    });
    expect(result.success).toBe(false);
    expect(result.meta?.reason).toBe("NO_PATH");
  });
});