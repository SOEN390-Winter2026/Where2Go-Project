import NavigationStrategy from "../../src/navigation/strategies/NavigationStrategy";

describe("NavigationStrategy (base class)", () => {
  let strategy;

  beforeEach(() => {
    strategy = new NavigationStrategy();
  });

  it("throws when getRoutes() is called without being overridden", async () => {
    await expect(strategy.getRoutes({}, {})).rejects.toThrow(
      "getRoutes() must be implemented by NavigationStrategy"
    );
  });

  it("throws when mode getter is accessed without being overridden", () => {
    expect(() => strategy.mode).toThrow(
      "mode getter must be implemented by NavigationStrategy"
    );
  });
});