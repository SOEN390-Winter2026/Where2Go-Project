import NavigationContext from "../../src/navigation/NavigationContext";

const ORIGIN      = { lat: 45.4974, lng: -73.5771, label: "SGW" };
const DESTINATION = { lat: 45.4587, lng: -73.6409, label: "Loyola" };

describe("NavigationContext", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("defaults to 'all' mode when no argument is passed", () => {
    const ctx = new NavigationContext();
    expect(ctx.currentMode).toBe("all");
  });

  it("initialises with the correct strategy for each known mode", () => {
    expect(new NavigationContext("all").currentMode).toBe("all");
    expect(new NavigationContext("walking").currentMode).toBe("walking");
    expect(new NavigationContext("transit").currentMode).toBe("transit");
    expect(new NavigationContext("concordia_shuttle").currentMode).toBe("concordia_shuttle");
  });

  it("falls back to 'all' when an unknown mode is passed to constructor", () => {
    const ctx = new NavigationContext("flying_carpet");
    expect(ctx.currentMode).toBe("all");
  });

  it("switches strategy to walking at runtime", () => {
    const ctx = new NavigationContext();
    ctx.setStrategy("walking");
    expect(ctx.currentMode).toBe("walking");
  });

  it("switches strategy to transit at runtime", () => {
    const ctx = new NavigationContext();
    ctx.setStrategy("transit");
    expect(ctx.currentMode).toBe("transit");
  });

  it("switches strategy to concordia_shuttle at runtime", () => {
    const ctx = new NavigationContext();
    ctx.setStrategy("concordia_shuttle");
    expect(ctx.currentMode).toBe("concordia_shuttle");
  });

  it("falls back to 'all' when setStrategy receives an unknown mode", () => {
    const ctx = new NavigationContext("walking");
    ctx.setStrategy("hoverboard");
    expect(ctx.currentMode).toBe("all");
  });

  it("delegates getRoutes to the active strategy", async () => {
    const mockRoutes = [{ mode: "walking", duration: { text: "20 min" } }];
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const ctx = new NavigationContext("walking");
    const result = await ctx.getRoutes(ORIGIN, DESTINATION);

    expect(result).toEqual(mockRoutes.filter((r) => r.mode === "walking"));
  });

  it("propagates errors thrown by the strategy", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Service down" } }),
    });

    const ctx = new NavigationContext("transit");
    await expect(ctx.getRoutes(ORIGIN, DESTINATION)).rejects.toThrow("Service down");
  });

  it("re-fetches with new strategy after setStrategy is called", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [{ mode: "walking" }] }),
    });

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ routes: [{ mode: "transit" }] }),
    });

    const ctx = new NavigationContext("walking");
    const walkResult = await ctx.getRoutes(ORIGIN, DESTINATION);
    expect(walkResult.every((r) => r.mode === "walking")).toBe(true);

    ctx.setStrategy("transit");
    const transitResult = await ctx.getRoutes(ORIGIN, DESTINATION);
    expect(transitResult.every((r) => r.mode === "transit")).toBe(true);
  });
});