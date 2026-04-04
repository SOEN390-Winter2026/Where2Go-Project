import { formatIndoorPathSteps, buildInterBuildingDirections } from "../../src/services/interBuildingDirections";

jest.mock("../../src/services/indoorAccessibleRouting", () => ({
  generateAccessibleIndoorPath: jest.fn(),
}));

jest.mock("../../src/utils/Buildingexits", () => ({
  findClosestExitPair: jest.fn(),
  exitPositionToLatLng: jest.fn(),
  getExitWaypoints: jest.fn(() => []),
}));

const { generateAccessibleIndoorPath } = require("../../src/services/indoorAccessibleRouting");
const { findClosestExitPair, exitPositionToLatLng } = require("../../src/utils/Buildingexits");

describe("formatIndoorPathSteps", () => {
  it("returns empty array for null path", () => {
    expect(formatIndoorPathSteps(null)).toEqual([]);
  });

  it("builds lines from a short path", () => {
    const lines = formatIndoorPathSteps([
      { floor: "2", type: "door", id: "d1" },
      { floor: "2", type: "elevator", id: "e1" },
      { floor: "7", type: "elevator", id: "e2" },
    ]);
    expect(lines.some((l) => l.includes("Start on floor 2"))).toBe(true);
    expect(lines.some((l) => l.includes("Use the elevator"))).toBe(true);
    expect(lines.some((l) => l.includes("Continue to floor 7"))).toBe(true);
  });
});

describe("buildInterBuildingDirections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("rejects when room/floor missing", async () => {
    const r = await buildInterBuildingDirections({
      campus: "SGW",
      from: { building: "H", floor: "2", room: "" },
      to: { building: "H", floor: "2", room: "201" },
      buildings: [],
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("INVALID_INPUT");
  });

  it("same building: one indoor segment, no fetch", async () => {
    generateAccessibleIndoorPath.mockReturnValue({
      success: true,
      path: [{ floor: "2", id: "a", type: "door" }],
      cost: 1,
    });

    const r = await buildInterBuildingDirections({
      campus: "SGW",
      from: { building: "H", floor: "2", room: "H-201" },
      to: { building: "H", floor: "7", room: "H-701" },
      buildings: [],
      avoidStairs: true,
    });

    expect(r.ok).toBe(true);
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0].kind).toBe("indoor");
    expect(generateAccessibleIndoorPath).toHaveBeenCalledWith(
      expect.objectContaining({
        campus: "SGW",
        buildingCode: "H",
        avoidStairs: true,
      })
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("different buildings: adds outdoor segment when exits resolve", async () => {
    generateAccessibleIndoorPath
      .mockReturnValueOnce({
        success: true,
        path: [{ floor: "2", type: "exit", id: "x1" }],
        cost: 1,
      })
      .mockReturnValueOnce({
        success: true,
        path: [{ floor: "1", type: "door", id: "d1" }],
        cost: 1,
      });

    findClosestExitPair.mockReturnValue({
      from: { buildingCode: "CC", floor: "1", waypointId: "e1", position: { x: 0, y: 0 } },
      to: { buildingCode: "VE", floor: "1", waypointId: "e2", position: { x: 0, y: 0 } },
      distanceMeters: 100,
    });

    exitPositionToLatLng
      .mockReturnValueOnce({ latitude: 45.5, longitude: -73.58 })
      .mockReturnValueOnce({ latitude: 45.49, longitude: -73.57 });

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "walking",
            duration: { text: "5 min" },
            distance: { text: "400 m" },
            steps: [{ instruction: "Head north" }],
          },
        ],
      }),
    });

    const r = await buildInterBuildingDirections({
      campus: "Loyola",
      from: { building: "CC", floor: "1", room: "A" },
      to: { building: "VE", floor: "1", room: "B" },
      buildings: [
        { code: "CC", coordinates: [{ latitude: 45, longitude: -73 }] },
        { code: "VE", coordinates: [{ latitude: 45.01, longitude: -73.01 }] },
      ],
      avoidStairs: false,
    });

    expect(r.ok).toBe(true);
    expect(r.segments).toHaveLength(3);
    expect(r.segments[1].kind).toBe("outdoor");
    expect(global.fetch).toHaveBeenCalled();
  });
});
