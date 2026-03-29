import * as locations from "../../../src/data/locations";
import TransitionStrategy from "../../../src/navigation/strategies/TransitionStrategy";

const OUTDOOR_ORIGIN = { lat: 40.0, lng: -74.0 };
const OUTDOOR_DEST = { lat: 41.0, lng: -75.0 };

describe("TransitionStrategy", () => {
  let strategy;

  beforeEach(() => {
    strategy = new TransitionStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("has mode 'transition'", () => {
    expect(strategy.mode).toBe("transition");
  });

  it("falls back to outdoor route when neither point is inside a building", async () => {
    const mockRoutes = [{ mode: "walking", duration: { text: "5 min" }, distance: { text: "0.3 km" } }];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const result = await strategy.getRoutes(OUTDOOR_ORIGIN, OUTDOOR_DEST);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ mode: "walking" }),
    ]));
  });

  it("returns empty array when same building is origin and destination", async () => {
    const hallPoint = { lat: 45.49728, lng: -73.57896 };
    const result = await strategy.getRoutes(hallPoint, hallPoint);
    expect(result).toEqual([]);
  });
});

describe("TransitionStrategy (extended coverage)", () => {
  let strategy;

  beforeEach(() => {
    strategy = new TransitionStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("handles indoor to outdoor transition", async () => {
    jest.spyOn(locations, "analyzeRouteTransition").mockReturnValue({
      originIndoor: true,
      destinationIndoor: false,
      originBuilding: { code: "hall" },
      destBuilding: null,
    });
    jest.spyOn(locations, "getNearestEntrance").mockReturnValue({ lat: 1, lng: 2, description: "Main entrance" });

    strategy._getOutdoorRoute = jest.fn()
      .mockResolvedValueOnce([{ polyline: "a", steps: [{ instruction: "step1" }], duration: { value: 60 }, distance: { value: 100 } }])
      .mockResolvedValueOnce([{ polyline: "b", steps: [{ instruction: "step2" }], duration: { value: 120 }, distance: { value: 200 } }]);

    const result = await strategy.getRoutes({ lat: 0, lng: 0 }, { lat: 3, lng: 4 });
    expect(result[0].mode).toBe("transition");
    expect(result[0].steps.some(s => s.type === "transition")).toBe(true);
  });

  it("handles outdoor to indoor transition", async () => {
    jest.spyOn(locations, "analyzeRouteTransition").mockReturnValue({
      originIndoor: false,
      destinationIndoor: true,
      originBuilding: null,
      destBuilding: { code: "hall" },
    });
    jest.spyOn(locations, "getNearestEntrance").mockReturnValue({ lat: 1, lng: 2, description: "Main entrance" });

    strategy._getOutdoorRoute = jest.fn()
      .mockResolvedValueOnce([{ polyline: "a", steps: [{ instruction: "step1" }], duration: { value: 60 }, distance: { value: 100 } }])
      .mockResolvedValueOnce([{ polyline: "b", steps: [{ instruction: "step2" }], duration: { value: 120 }, distance: { value: 200 } }]);

    const result = await strategy.getRoutes({ lat: 0, lng: 0 }, { lat: 3, lng: 4 });
    expect(result[0].mode).toBe("transition");
    expect(result[0].steps.some(s => s.type === "transition")).toBe(true);
  });

  it("returns empty array if no entrance found", async () => {
    jest.spyOn(locations, "analyzeRouteTransition").mockReturnValue({
      originIndoor: true,
      destinationIndoor: false,
      originBuilding: { code: "hall" },
      destBuilding: null,
    });
    jest.spyOn(locations, "getNearestEntrance").mockReturnValue(null);

    const result = await strategy.getRoutes({ lat: 0, lng: 0 }, { lat: 3, lng: 4 });
    expect(result).toEqual([]);
  });

  it("_combineRoutes returns null if either route is missing", () => {
    expect(strategy._combineRoutes(null, {}, "test")).toBeNull();
    expect(strategy._combineRoutes({}, null, "test")).toBeNull();
  });

  it("_getOutdoorRoute throws error on bad response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "fail" } }),
    });
    await expect(strategy._getOutdoorRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }))
      .rejects.toThrow("fail");
  });
});
