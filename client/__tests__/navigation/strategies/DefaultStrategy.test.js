import DefaultStrategy from "../../../src/navigation/strategies/DefaultStrategy";

const ORIGIN = { lat: 45.4974, lng: -73.5771, label: "SGW" };
const DESTINATION = { lat: 45.4587, lng: -73.6409, label: "Loyola" };

describe("DefaultStrategy", () => {
  let strategy;

  beforeEach(() => {
    strategy = new DefaultStrategy();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("has mode 'all'", () => {
    expect(strategy.mode).toBe("all");
  });

  it("returns all routes on success", async () => {
    const mockRoutes = [
      { mode: "walking",  duration: { text: "20 min" } },
      { mode: "transit",  duration: { text: "15 min" } },
      { mode: "concordia_shuttle", duration: { text: "10 min" } },
    ];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result).toEqual(mockRoutes);
  });

  it("returns empty array when routes is missing from response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await strategy.getRoutes(ORIGIN, DESTINATION);
    expect(result).toEqual([]);
  });

  it("throws on non-ok response", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Server error" } }),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow("Server error");
  });

  it("throws generic message when error has no message field", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    await expect(strategy.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow("Failed to fetch routes");
  });

  it("calls the correct API endpoint", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    await strategy.getRoutes(ORIGIN, DESTINATION);

    const calledUrl = globalThis.fetch.mock.calls[0][0];
    expect(calledUrl).toContain(`originLat=${ORIGIN.lat}`);
    expect(calledUrl).toContain(`originLng=${ORIGIN.lng}`);
    expect(calledUrl).toContain(`destLat=${DESTINATION.lat}`);
    expect(calledUrl).toContain(`destLng=${DESTINATION.lng}`);
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