import TransitStrategy from "../../../src/navigation/strategies/TransitStrategy";

const ORIGIN = { lat: 45.4974, lng: -73.5771, label: "SGW" };
const DESTINATION = { lat: 45.4587, lng: -73.6409, label: "Loyola" };

describe("TransitStrategy", () => {
  let strategy;

  beforeEach(() => {
    strategy = new TransitStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("has mode 'transit'", () => {
    expect(strategy.mode).toBe("transit");
  });

  it("returns only transit routes", async () => {
    const mockRoutes = [
      { mode: "transit", duration: { text: "15 min" } },
      { mode: "walking", duration: { text: "20 min" } },
    ];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result.every((r) => r.mode === "transit")).toBe(true);
  });

  it("returns empty array when no transit routes exist", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [{ mode: "walking" }] }),
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
      "Failed to fetch transit routes"
    );
  });

  it("includes mode=transit in the API call", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await strategy.getRoutes(ORIGIN, DESTINATION);

    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("mode=transit");
  });

  it("appends accessible=true when options.accessible is true", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await strategy.getRoutes(ORIGIN, DESTINATION, { accessible: true });

    expect(globalThis.fetch.mock.calls[0][0]).toContain("accessible=true");
  });
});