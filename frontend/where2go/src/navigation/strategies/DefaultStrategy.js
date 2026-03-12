import NavigationStrategy from "./NavigationStrategy";
import { API_BASE_URL } from "../../config";

export default class DefaultStrategy extends NavigationStrategy {
  get mode() {
    return "all";
  }

  async getRoutes(origin, destination) {
    const clientTime = encodeURIComponent(new Date().toISOString());
    const res = await fetch(
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch routes");
    return data.routes || [];
  }
}