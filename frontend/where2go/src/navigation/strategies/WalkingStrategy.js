import NavigationStrategy from "./NavigationStrategy";
import { API_BASE_URL } from "../../config";

export default class WalkingStrategy extends NavigationStrategy {
  get mode() {
    return "walking";
  }

  async getRoutes(origin, destination) {
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
}