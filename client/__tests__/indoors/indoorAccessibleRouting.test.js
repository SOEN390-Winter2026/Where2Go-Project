
const {
  defaultIndoorMaps,
  indoorMapsStaircaseOnlyH7H8,
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
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(indoorMapsStaircaseOnlyH7H8());

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
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath(indoorMapsStaircaseOnlyH7H8());

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

  test("connects empty waypoint graph using hallway-constrained local links", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.20, y: 0.50 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.26, y: 0.50 }, connections: [] },
                ],
                rooms: [
                  { id: "hall", type: "hallway", bounds: { x: 0.1, y: 0.46, w: 0.3, h: 0.08 } },
                  { id: "A", type: "classroom", bounds: { x: 0.18, y: 0.44, w: 0.02, h: 0.02 }, nearestWaypoint: "w1" },
                  { id: "B", type: "classroom", bounds: { x: 0.26, y: 0.44, w: 0.02, h: 0.02 }, nearestWaypoint: "w2" },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(true);
    expect(result.path.map((p) => p.id)).toEqual(expect.arrayContaining(["w1", "w2"]));
  });

  test("does not connect waypoints when sampled edge leaves hallway polygon", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.20, y: 0.20 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.80, y: 0.80 }, connections: [] },
                ],
                rooms: [
                  { id: "hall", type: "hallway", bounds: { x: 0.1, y: 0.45, w: 0.3, h: 0.08 } },
                  { id: "A", type: "classroom", bounds: { x: 0.18, y: 0.18, w: 0.02, h: 0.02 }, nearestWaypoint: "w1" },
                  { id: "B", type: "classroom", bounds: { x: 0.78, y: 0.78, w: 0.02, h: 0.02 }, nearestWaypoint: "w2" },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(false);
    expect(result.meta?.reason).toBe("NO_PATH");
  });

  test("chains distant hallway hubs so rooms connect without dense KNN links", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.2, y: 0.49 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.75, y: 0.49 }, connections: [] },
                ],
                rooms: [
                  {
                    id: "strip",
                    type: "hallway",
                    bounds: { x: 0.1, y: 0.46, w: 0.8, h: 0.08 },
                  },
                  {
                    id: "A",
                    type: "classroom",
                    bounds: { x: 0.18, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w1",
                  },
                  {
                    id: "B",
                    type: "classroom",
                    bounds: { x: 0.73, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w2",
                  },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(true);
    expect(result.path.map((p) => p.id)).toEqual(expect.arrayContaining(["w1", "w2"]));
  });

  test("treats id hall hallway polygon as hallway when type is wrong (legacy JSON)", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.2, y: 0.49 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.75, y: 0.49 }, connections: [] },
                ],
                rooms: [
                  {
                    id: "hallway",
                    label: "hallway",
                    type: "classroom",
                    bounds: { x: 0.1, y: 0.46, w: 0.8, h: 0.08 },
                  },
                  {
                    id: "A",
                    type: "classroom",
                    bounds: { x: 0.18, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w1",
                  },
                  {
                    id: "B",
                    type: "classroom",
                    bounds: { x: 0.73, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w2",
                  },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(true);
  });

  test("bridges two nearby hallway polygons when hubs are in separate strips", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.1, y: 0.5 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.51, y: 0.5 }, connections: [] },
                ],
                rooms: [
                  {
                    id: "h1",
                    type: "hallway",
                    bounds: { x: 0.02, y: 0.46, w: 0.13, h: 0.08 },
                  },
                  {
                    id: "h2",
                    type: "hallway",
                    bounds: { x: 0.14, y: 0.46, w: 0.86, h: 0.08 },
                  },
                  {
                    id: "A",
                    type: "classroom",
                    bounds: { x: 0.08, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w1",
                  },
                  {
                    id: "B",
                    type: "classroom",
                    bounds: { x: 0.49, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w2",
                  },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(true);
    expect(result.path.map((p) => p.id)).toEqual(expect.arrayContaining(["w1", "w2"]));
  });

  test("links exit waypoint into hallway hub graph when exit starts isolated", () => {
    const generateAccessibleIndoorPath = loadGenerateAccessibleIndoorPath({
      SGW: {
        H: {
          1: {
            image: null,
            data: {
              F1: {
                waypoints: [
                  { id: "w1", type: "door", position: { x: 0.2, y: 0.49 }, connections: [] },
                  { id: "w2", type: "door", position: { x: 0.75, y: 0.49 }, connections: [] },
                  {
                    id: "ex",
                    type: "exit",
                    position: { x: 0.22, y: 0.49 },
                    connections: [],
                  },
                ],
                rooms: [
                  {
                    id: "strip",
                    type: "hallway",
                    bounds: { x: 0.1, y: 0.46, w: 0.8, h: 0.08 },
                  },
                  {
                    id: "A",
                    type: "classroom",
                    bounds: { x: 0.18, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w1",
                  },
                  {
                    id: "B",
                    type: "classroom",
                    bounds: { x: 0.73, y: 0.44, w: 0.02, h: 0.02 },
                    nearestWaypoint: "w2",
                  },
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
      from: { floor: "1", room: "A" },
      to: { floor: "1", room: "B" },
    });

    expect(result.success).toBe(true);
    const ids = result.path.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["w1", "w2"]));
  });
});