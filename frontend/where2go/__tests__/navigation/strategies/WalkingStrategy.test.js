import WalkingStrategy from "../../../src/navigation/strategies/WalkingStrategy";

const ORIGIN = { lat: 45.4974, lng: -73.5771, label: "SGW" };
const DESTINATION = { lat: 45.4587, lng: -73.6409, label: "Loyola" };

describe("WalkingStrategy", () => {
  let strategy;

  beforeEach(() => {
    strategy = new WalkingStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("has mode 'walking'", () => {
    expect(strategy.mode).toBe("walking");
  });

  it("returns only walking routes", async () => {
    const mockRoutes = [
      { mode: "walking", duration: { text: "20 min" } },
      { mode: "transit", duration: { text: "15 min" } },
    ];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result.every((r) => r.mode === "walking")).toBe(true);
  });

  it("returns empty array when no walking routes exist", async () => {
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
      json: async () => ({ error: { message: "Upstream error" } }),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow("Upstream error");
  });

  it("throws generic message when error has no message field", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow(
      "Failed to fetch walking routes"
    );
  });

  it("includes mode=walking in the API call", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await strategy.getRoutes(ORIGIN, DESTINATION);

    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("mode=walking");
  });
});