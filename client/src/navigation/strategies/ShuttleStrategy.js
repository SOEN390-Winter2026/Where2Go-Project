import NavigationStrategy from "./NavigationStrategy";
import { API_BASE_URL } from "../../config";

export default class ShuttleStrategy extends NavigationStrategy {
  get mode() {
    return "concordia_shuttle";
  }

  async getRoutes(origin, destination) {
    const clientTime = encodeURIComponent(new Date().toISOString());
    const res = await fetch(
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}&mode=concordia_shuttle`
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch shuttle routes");
    return (data.routes || []).filter((r) => r.mode === "concordia_shuttle");
  }
}