import NavigationStrategy from "./NavigationStrategy";
import { API_BASE_URL } from "../../config";

export default class TransitStrategy extends NavigationStrategy {
  get mode() {
    return "transit";
  }

  async getRoutes(origin, destination, options = {}) {
    const clientTime = encodeURIComponent(new Date().toISOString());
    let url =
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}&mode=transit`;
    if (options.accessible) url += "&accessible=true";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Failed to fetch transit routes");
    return (data.routes || []).filter((r) => r.mode === "transit");
  }
}