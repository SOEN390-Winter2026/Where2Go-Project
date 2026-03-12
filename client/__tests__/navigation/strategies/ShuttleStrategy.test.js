import ShuttleStrategy from "../../../src/navigation/strategies/ShuttleStrategy";

const ORIGIN = { lat: 45.4974, lng: -73.5771, label: "SGW" };
const DESTINATION = { lat: 45.4587, lng: -73.6409, label: "Loyola" };

describe("ShuttleStrategy", () => {
  let strategy;

  beforeEach(() => {
    strategy = new ShuttleStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("has mode 'concordia_shuttle'", () => {
    expect(strategy.mode).toBe("concordia_shuttle");
  });

  it("returns only shuttle routes", async () => {
    const mockRoutes = [
      { mode: "concordia_shuttle", duration: { text: "10 min" } },
      { mode: "walking",           duration: { text: "20 min" } },
    ];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result.every((r) => r.mode === "concordia_shuttle")).toBe(true);
  });

  it("returns empty array when no shuttle routes exist", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [{ mode: "transit" }] }),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Shuttle service unavailable" } }),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow(
      "Shuttle service unavailable"
    );
  });

  it("throws generic message when error has no message field", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow(
      "Failed to fetch shuttle routes"
    );
  });

  it("includes mode=concordia_shuttle in the API call", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await strategy.getRoutes(ORIGIN, DESTINATION);

    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("mode=concordia_shuttle");
  });
});