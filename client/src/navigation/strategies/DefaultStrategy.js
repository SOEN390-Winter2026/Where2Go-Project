import NavigationStrategy from "./NavigationStrategy";
import { API_BASE_URL } from "../../config";

export default class DefaultStrategy extends NavigationStrategy {
  get mode() {
    return "all";
  }

  async getRoutes(origin, destination, options = {}) {
    const clientTime = encodeURIComponent(new Date().toISOString());
    let url =
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}`;
    if (options.accessible) url += "&accessible=true";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch routes");
    return data.routes || [];
  }
}