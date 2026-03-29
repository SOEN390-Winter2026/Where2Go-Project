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
