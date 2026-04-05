
const MINIMAL_INDOOR_MAP = {
  Z99: {
    A: {
      1: {
        image: 1,
        data: {
          1: {
            floor: "1",
            waypoints: [
              { id: "w1", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["e1", "ex1"] },
              {
                id: "e1",
                type: "elevator",
                position: { x: 0.2, y: 0.1 },
                connections: ["w1"],
                floorsReachable: ["2"],
              },
              { id: "ex1", type: "exit", position: { x: 0.9, y: 0.9 }, connections: ["w1"] },
            ],
            rooms: [
              {
                id: "101",
                type: "classroom",
                bounds: { x: 0, y: 0, w: 0.05, h: 0.05 },
                nearestWaypoint: "w1",
              },
            ],
          },
        },
      },
      2: {
        image: 1,
        data: {
          2: {
            floor: "2",
            waypoints: [
              { id: "w2", type: "door", position: { x: 0.1, y: 0.1 }, connections: ["e2"] },
              {
                id: "e2",
                type: "elevator",
                position: { x: 0.2, y: 0.1 },
                connections: ["w2"],
                floorsReachable: ["1"],
              },
            ],
            rooms: [
              {
                id: "201",
                type: "classroom",
                bounds: { x: 0, y: 0, w: 0.05, h: 0.05 },
                nearestWaypoint: "w2",
              },
            ],
          },
        },
      },
    },
    B: {
      1: {
        image: 1,
        data: {
          1: {
            floor: "1",
            waypoints: [
              { id: "exb", type: "exit", position: { x: 0.05, y: 0.05 }, connections: ["wb"] },
              { id: "wb", type: "door", position: { x: 0.5, y: 0.5 }, connections: ["exb"] },
            ],
            rooms: [
              {
                id: "B1",
                type: "classroom",
                bounds: { x: 0.5, y: 0.5, w: 0.05, h: 0.05 },
                nearestWaypoint: "wb",
              },
            ],
          },
        },
      },
    },
  },
};

jest.mock("../../indoorData", () => ({ indoorMaps: MINIMAL_INDOOR_MAP }));

jest.mock("../../src/services/indoorAccessibleRouting", () => ({
  generateAccessibleIndoorPath: jest.fn(),
}));

jest.mock("../../src/utils/Buildingexits", () => ({
  findClosestExitPair: jest.fn(),
  exitPositionToLatLng: jest.fn(),
  getExitWaypoints: jest.fn(),
}));

jest.mock("../../src/config", () => ({ API_BASE_URL: "http://test.local" }));

const { generateAccessibleIndoorPath } = require("../../src/services/indoorAccessibleRouting");
const {
  findClosestExitPair,
  exitPositionToLatLng,
  getExitWaypoints,
} = require("../../src/utils/Buildingexits");
const {
  buildInterBuildingDirections,
  formatIndoorPathSteps,
} = require("../../src/services/interBuildingDirections");

describe("interBuildingDirections (coverage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe("formatIndoorPathSteps", () => {
    it("handles exit and staircase and filters duplicate consecutive lines", () => {
      const lines = formatIndoorPathSteps([
        { floor: "1", type: "area" },
        { floor: "1", type: "staircase" },
        { floor: "1", type: "staircase" },
        { floor: "1", type: "exit" },
      ]);
      expect(lines.some((l) => l.includes("stairs"))).toBe(true);
      expect(lines.some((l) => l.includes("Go through the exit"))).toBe(true);
      const stairCount = lines.filter((l) => l.includes("stairs")).length;
      expect(stairCount).toBe(1);
    });
  });

  it("rejects when campus is blank", async () => {
    const r = await buildInterBuildingDirections({
      campus: "",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "A", floor: "1", room: "101" },
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("INVALID_INPUT");
  });

  it("rejects NO_INDOOR_MAP for unknown from building", async () => {
    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "NOPE", floor: "1", room: "101" },
      to: { building: "A", floor: "1", room: "101" },
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("NO_INDOOR_MAP");
  });

  it("rejects NO_INDOOR_MAP for unknown to building", async () => {
    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "NOPE", floor: "1", room: "101" },
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("NO_INDOOR_MAP");
  });

  it("same building: uses heuristic when dijkstra fails", async () => {
    generateAccessibleIndoorPath
      .mockReturnValueOnce({ success: false, meta: { reason: "NO_PATH" } })
      .mockReturnValueOnce({ success: false, meta: { reason: "NO_PATH" } });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "2", room: "201" },
      to: { building: "A", floor: "1", room: "101" },
      buildings: [],
    });
    expect(r.ok).toBe(true);
    expect(r.segments[0].kind).toBe("indoor");
    expect(Array.isArray(r.segments[0].steps)).toBe(true);
  });

  it("same building: returns failure when no path and no heuristic", async () => {
    generateAccessibleIndoorPath.mockReturnValue({ success: false, meta: { reason: "NO_PATH" } });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "A", floor: "1", room: "missing-room-xyz" },
      buildings: [],
    });
    expect(r.ok).toBe(false);
  });

  it("stairs fallback: retries with avoidStairs false after NO_PATH", async () => {
    generateAccessibleIndoorPath
      .mockReturnValueOnce({ success: false, meta: { reason: "NO_PATH" } })
      .mockReturnValue({
        success: true,
        path: [{ floor: "1", id: "x", type: "exit" }],
        cost: 1,
      });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "A", floor: "2", room: "201" },
      buildings: [],
      avoidStairs: true,
    });
    expect(r.ok).toBe(true);
    expect(generateAccessibleIndoorPath).toHaveBeenCalledWith(
      expect.objectContaining({ avoidStairs: false })
    );
  });

  it("cross-building: NO_EXITS when no exit pairs", async () => {
    getExitWaypoints.mockReturnValue([]);
    findClosestExitPair.mockReturnValue(null);

    generateAccessibleIndoorPath.mockReturnValue({
      success: true,
      path: [{ floor: "1", type: "door" }],
      cost: 1,
    });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "B", floor: "1", room: "B1" },
      buildings: [],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("NO_EXITS");
  });

  it("cross-building: outdoor API failure rolls to failure after pairs exhausted", async () => {
    getExitWaypoints.mockImplementation((code) => {
      if (code === "A") {
        return [
          {
            buildingCode: "A",
            campus: "Z99",
            floor: "1",
            waypointId: "ex1",
            position: { x: 0, y: 0 },
          },
        ];
      }
      if (code === "B") {
        return [
          {
            buildingCode: "B",
            campus: "Z99",
            floor: "1",
            waypointId: "exb",
            position: { x: 0.1, y: 0.1 },
          },
        ];
      }
      return [];
    });
    findClosestExitPair.mockReturnValue({
      from: { buildingCode: "A", floor: "1", waypointId: "ex1", position: { x: 0, y: 0 } },
      to: { buildingCode: "B", floor: "1", waypointId: "exb", position: { x: 0, y: 0 } },
    });
    exitPositionToLatLng
      .mockReturnValueOnce({ latitude: 45.5, longitude: -73.5 })
      .mockReturnValueOnce({ latitude: 45.51, longitude: -73.51 });

    generateAccessibleIndoorPath.mockReturnValue({
      success: true,
      path: [{ floor: "1", type: "exit", id: "ex" }],
      cost: 1,
    });

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "bad route" } }),
    });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "B", floor: "1", room: "B1" },
      buildings: [
        { code: "A", coordinates: [{ latitude: 45, longitude: -73 }] },
        { code: "B", coordinates: [{ latitude: 45, longitude: -73 }] },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("OUTDOOR_FAILED");
  });

  it("cross-building: fetch returns no walking route", async () => {
    getExitWaypoints.mockImplementation(() => [
      {
        buildingCode: "A",
        campus: "Z99",
        floor: "1",
        waypointId: "ex1",
        position: { x: 0, y: 0 },
      },
    ]);
    findClosestExitPair.mockReturnValue({
      from: { buildingCode: "A", floor: "1", waypointId: "ex1", position: { x: 0, y: 0 } },
      to: { buildingCode: "B", floor: "1", waypointId: "exb", position: { x: 0, y: 0 } },
    });
    exitPositionToLatLng
      .mockReturnValueOnce({ latitude: 45.5, longitude: -73.5 })
      .mockReturnValueOnce({ latitude: 45.51, longitude: -73.51 });

    generateAccessibleIndoorPath.mockReturnValue({
      success: true,
      path: [{ floor: "1", type: "exit", id: "ex" }],
      cost: 1,
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "B", floor: "1", room: "B1" },
      buildings: [
        { code: "A", coordinates: [{ latitude: 45, longitude: -73 }] },
        { code: "B", coordinates: [{ latitude: 45, longitude: -73 }] },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it("cross-building: skips exit pair when indoor leg to exit fails, tries next pair", async () => {
    getExitWaypoints.mockImplementation((code) => {
      if (code === "A") {
        return [
          { buildingCode: "A", campus: "Z99", floor: "1", waypointId: "exA1", position: { x: 0, y: 0 } },
          { buildingCode: "A", campus: "Z99", floor: "1", waypointId: "exA2", position: { x: 0.2, y: 0.2 } },
        ];
      }
      if (code === "B") {
        return [
          { buildingCode: "B", campus: "Z99", floor: "1", waypointId: "exB1", position: { x: 0.1, y: 0.1 } },
          { buildingCode: "B", campus: "Z99", floor: "1", waypointId: "exB2", position: { x: 0.3, y: 0.3 } },
        ];
      }
      return [];
    });
    findClosestExitPair.mockReturnValue(null);
    exitPositionToLatLng.mockImplementation((wp) => ({
      latitude: 45.5 + (wp.waypointId?.length || 0) * 0.0001,
      longitude: -73.5,
    }));

    generateAccessibleIndoorPath
      .mockReturnValueOnce({ success: false, meta: { reason: "NO_PATH" } })
      .mockReturnValueOnce({
        success: true,
        path: [{ floor: "1", type: "exit", position: { x: 0.1, y: 0.1 } }],
        cost: 1,
      })
      .mockReturnValueOnce({
        success: true,
        path: [{ floor: "1", type: "door", position: { x: 0.2, y: 0.2 } }],
        cost: 1,
      });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "walking",
            duration: { text: "1 min" },
            distance: { text: "50 m" },
            steps: [{ instruction: "Go", distance: { text: "50 m" } }],
          },
        ],
      }),
    });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "B", floor: "1", room: "B1" },
      buildings: [
        { code: "A", coordinates: [{ latitude: 45, longitude: -73 }] },
        { code: "B", coordinates: [{ latitude: 45, longitude: -73 }] },
      ],
    });
    expect(r.ok).toBe(true);
    expect(generateAccessibleIndoorPath.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("cross-building: success with mapSegments on outdoor leg", async () => {
    getExitWaypoints.mockImplementation((code) => {
      if (code === "A") {
        return [
          {
            buildingCode: "A",
            campus: "Z99",
            floor: "1",
            waypointId: "ex1",
            position: { x: 0, y: 0 },
          },
        ];
      }
      if (code === "B") {
        return [
          {
            buildingCode: "B",
            campus: "Z99",
            floor: "1",
            waypointId: "exb",
            position: { x: 0.1, y: 0.1 },
          },
        ];
      }
      return [];
    });
    findClosestExitPair.mockReturnValue({
      from: { buildingCode: "A", floor: "1", waypointId: "ex1", position: { x: 0, y: 0 } },
      to: { buildingCode: "B", floor: "1", waypointId: "exb", position: { x: 0, y: 0 } },
    });
    exitPositionToLatLng
      .mockReturnValueOnce({ latitude: 45.5, longitude: -73.5 })
      .mockReturnValueOnce({ latitude: 45.51, longitude: -73.51 });

    generateAccessibleIndoorPath.mockReturnValue({
      success: true,
      path: [
        { floor: "1", type: "door", position: { x: 0.1, y: 0.1 } },
        { floor: "1", type: "exit", position: { x: 0.2, y: 0.2 } },
      ],
      cost: 1,
    });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "walking",
            duration: { text: "2 min" },
            distance: { text: "100 m" },
            polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@",
            steps: [
              {
                instruction: "Walk",
                distance: { text: "50 m" },
                polyline: "_p~iF~ps|U_ulL",
              },
            ],
          },
        ],
      }),
    });

    const r = await buildInterBuildingDirections({
      campus: "Z99",
      from: { building: "A", floor: "1", room: "101" },
      to: { building: "B", floor: "1", room: "B1" },
      buildings: [
        { code: "A", coordinates: [{ latitude: 45, longitude: -73 }] },
        { code: "B", coordinates: [{ latitude: 45, longitude: -73 }] },
      ],
    });
    expect(r.ok).toBe(true);
    expect(r.segments).toHaveLength(3);
    expect(r.segments[1].mapSegments?.length).toBeGreaterThan(0);
    expect(
      (r.segments[1].steps || []).some((s) => String(s).includes("Walk") || String(s).includes("100"))
    ).toBe(true);
  });
});
