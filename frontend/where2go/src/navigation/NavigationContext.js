import DefaultStrategy from "./strategies/DefaultStrategy";
import WalkingStrategy from "./strategies/WalkingStrategy";
import TransitStrategy from "./strategies/TransitStrategy";
import ShuttleStrategy from "./strategies/ShuttleStrategy";

const STRATEGIES = {
  all: new DefaultStrategy(),
  walking: new WalkingStrategy(),
  transit: new TransitStrategy(),
  concordia_shuttle: new ShuttleStrategy(),
};

export const AVAILABLE_MODES = Object.keys(STRATEGIES);

export default class NavigationContext {
  constructor(mode = "all") {
    this._strategy = STRATEGIES[mode] ?? STRATEGIES["all"];
  }

  setStrategy(mode) {
    if (!STRATEGIES[mode]) {
      console.warn(`NavigationContext: unknown mode "${mode}", falling back to "all"`);
      this._strategy = STRATEGIES["all"];
      return;
    }
    this._strategy = STRATEGIES[mode];
  }

  get currentMode() {
    return this._strategy.mode;
  }

  async getRoutes(origin, destination) {
    return this._strategy.getRoutes(origin, destination);
  }
}