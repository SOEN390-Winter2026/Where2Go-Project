import NavigationStrategy from "./NavigationStrategy";
import { getBuildingForLocation, getNearestEntrance, analyzeRouteTransition } from "../../data/locations";
import { API_BASE_URL } from "../../config";

export default class TransitionStrategy extends NavigationStrategy {
  get mode() {
    return "transition";
  }

  async getRoutes(origin, destination) {
    const transition = analyzeRouteTransition(origin, destination);

    // If both points are outdoor, use walking strategy
    if (!transition.originIndoor && !transition.destinationIndoor) {
      return this._getOutdoorRoute(origin, destination);
    }

    // If both points are indoor in the same building, this shouldn't happen
    // (indoor navigation should handle this case)
    if (transition.originIndoor && transition.destinationIndoor &&
        transition.originBuilding.code === transition.destBuilding.code) {
      return [];
    }

    // Handle transitions
    const routes = [];

    if (transition.originIndoor && !transition.destinationIndoor) {
      const entrance = getNearestEntrance(transition.originBuilding.code, origin.lat, origin.lng);
      if (entrance) {
        const combinedRoute = await this._buildCombinedRoute(origin, entrance, destination, "Exit building via " + entrance.description);
        if (combinedRoute) routes.push(combinedRoute);
      }
    } else if (!transition.originIndoor && transition.destinationIndoor) {
      const entrance = getNearestEntrance(transition.destBuilding.code, destination.lat, destination.lng);
      if (entrance) {
        const combinedRoute = await this._buildCombinedRoute(origin, entrance, destination, "Enter building via " + entrance.description);
        if (combinedRoute) routes.push(combinedRoute);
      }
    }

    return routes;
  }

  async _buildCombinedRoute(origin, entrance, destination, transitionInstruction) {
    const firstLeg = await this._getOutdoorRoute(origin, entrance);
    const secondLeg = await this._getOutdoorRoute(entrance, destination);
    if (firstLeg.length > 0 && secondLeg.length > 0) {
      return this._combineRoutes(firstLeg[0], secondLeg[0], transitionInstruction);
    }
    return null;
  }

  async _getOutdoorRoute(origin, destination) { const routes = await this._getDirections(origin, destination, "walking");
  return routes.filter(r => r.mode === "walking");
  }

  _combineRoutes(route1, route2, transitionInstruction) {
    if (!route1 || !route2) return null;

    // Combine polylines
    const combinedPolyline = [route1.polyline, route2.polyline]
      .filter(Boolean)
      .join("|");

    // Combine steps
    const combinedSteps = [
      ...(route1.steps || []),
      // Add transition step
      {
        type: "transition",
        instruction: transitionInstruction,
        durationText: "0 min",
        distanceText: "0 km"
      },
      ...(route2.steps || [])
    ];

    // Calculate total duration and distance
    const totalDuration = (route1.duration?.value || 0) + (route2.duration?.value || 0);
    const totalDistance = (route1.distance?.value || 0) + (route2.distance?.value || 0);

    return {
      mode: "transition",
      duration: {
        value: totalDuration,
        text: `${Math.round(totalDuration / 60)} min`
      },
      distance: {
        value: totalDistance,
        text: `${(totalDistance / 1000).toFixed(1)} km`
      },
      polyline: combinedPolyline,
      steps: combinedSteps
    };
  }
}