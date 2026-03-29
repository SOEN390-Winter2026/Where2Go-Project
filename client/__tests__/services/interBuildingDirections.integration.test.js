/**
 * Uses real generateAccessibleIndoorPath + real Buildingexits (only indoorData + fetch mocked).
 */
const RICH_MAP = {
  ZZ1: {
    X: {
      1: {
        image: 1,
        data: {
          1: {
            floor: "1",
            waypoints: [
              {
                id: "e1",
                type: "elevator",
                position: { x: 0.15, y: 0.15 },
                connections: ["exX"],
                floorsReachable: ["2"],
              },
              { id: "exX", type: "exit", position: { x: 0.9, y: 0.9 }, connections: ["e1"] },
            ],
            rooms: [],
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
                position: { x: 0.15, y: 0.15 },
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
    Y: {
      1: {
        image: 1,
        data: {
          1: {
            floor: "1",
            waypoints: [
              { id: "exY", type: "exit", position: { x: 0.05, y: 0.05 }, connections: ["wy"] },
              { id: "wy", type: "door", position: { x: 0.5, y: 0.5 }, connections: ["exY"] },
            ],
            rooms: [
              {
                id: "B1",
                type: "classroom",
                bounds: { x: 0.5, y: 0.5, w: 0.05, h: 0.05 },
                nearestWaypoint: "wy",
              },
            ],
          },
        },
      },
    },
  },
};

jest.mock("../../indoorData", () => ({ indoorMaps: RICH_MAP }));
jest.mock("../../src/config", () => ({ API_BASE_URL: "http://integration.test" }));

const { buildInterBuildingDirections } = require("../../src/services/interBuildingDirections");

describe("buildInterBuildingDirections (integration, real indoor routing)", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("cross-building route from upper floor uses elevator leg and outdoor segment", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "walking",
            duration: { text: "3 min" },
            distance: { text: "200 m" },
            steps: [{ instruction: "Head west", distance: { text: "200 m" } }],
          },
        ],
      }),
    });

    const r = await buildInterBuildingDirections({
      campus: "ZZ1",
      from: { building: "X", floor: "2", room: "201" },
      to: { building: "Y", floor: "1", room: "B1" },
      buildings: [
        { code: "X", coordinates: [{ latitude: 45.5, longitude: -73.6 }] },
        { code: "Y", coordinates: [{ latitude: 45.501, longitude: -73.599 }] },
      ],
      avoidStairs: true,
    });

    expect(r.ok).toBe(true);
    expect(r.segments).toHaveLength(3);
    expect(r.segments[0].kind).toBe("indoor");
    expect(r.segments[0].buildingCode).toBe("X");
    expect(r.segments[1].kind).toBe("outdoor");
    expect(r.segments[2].kind).toBe("indoor");
    expect(global.fetch).toHaveBeenCalled();
  });
});
