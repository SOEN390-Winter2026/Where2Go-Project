import DefaultStrategy from "./strategies/DefaultStrategy";
import WalkingStrategy from "./strategies/WalkingStrategy";
import TransitStrategy from "./strategies/TransitStrategy";
import ShuttleStrategy from "./strategies/ShuttleStrategy";
import TransitionStrategy from "./strategies/TransitionStrategy";
import { analyzeRouteTransition } from "../data/locations";

const STRATEGIES = {
  all: new DefaultStrategy(),
  walking: new WalkingStrategy(),
  transit: new TransitStrategy(),
  concordia_shuttle: new ShuttleStrategy(),
  transition: new TransitionStrategy(),
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
    // Check if this route requires indoor-outdoor transition
    const transition = analyzeRouteTransition(origin, destination);

    if (transition.requiresTransition) {
      // Use transition strategy for indoor-outdoor bridging
      return STRATEGIES["transition"].getRoutes(origin, destination);
    }

    // Use the configured strategy for regular outdoor routes
    return this._strategy.getRoutes(origin, destination);
  }
}