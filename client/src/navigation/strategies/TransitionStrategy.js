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
      // Indoor to outdoor: walk from indoor location to building entrance, then to destination
      const entrance = getNearestEntrance(transition.originBuilding.code, origin.lat, origin.lng);
      if (entrance) {
        const indoorToEntranceRoute = await this._getOutdoorRoute(origin, entrance);
        const entranceToDestinationRoute = await this._getOutdoorRoute(entrance, destination);

        if (indoorToEntranceRoute.length > 0 && entranceToDestinationRoute.length > 0) {
          const combinedRoute = this._combineRoutes(
            indoorToEntranceRoute[0],
            entranceToDestinationRoute[0],
            "Exit building via " + entrance.description
          );
          if (combinedRoute) routes.push(combinedRoute);
        }
      }
    } else if (!transition.originIndoor && transition.destinationIndoor) {
      // Outdoor to indoor: walk from origin to building entrance, then to indoor destination
      const entrance = getNearestEntrance(transition.destBuilding.code, destination.lat, destination.lng);
      if (entrance) {
        const originToEntranceRoute = await this._getOutdoorRoute(origin, entrance);
        const entranceToIndoorRoute = await this._getOutdoorRoute(entrance, destination);

        if (originToEntranceRoute.length > 0 && entranceToIndoorRoute.length > 0) {
          const combinedRoute = this._combineRoutes(
            originToEntranceRoute[0],
            entranceToIndoorRoute[0],
            "Enter building via " + entrance.description
          );
          if (combinedRoute) routes.push(combinedRoute);
        }
      }
    }

    return routes;
  }

  async _getOutdoorRoute(origin, destination) {
    const clientTime = encodeURIComponent(new Date().toISOString());
    const res = await fetch(
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}&mode=walking`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch walking routes");
    return (data.routes || []).filter((r) => r.mode === "walking");
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