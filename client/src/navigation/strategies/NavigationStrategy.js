export default class NavigationStrategy {

  async getRoutes(origin, destination) {
    throw new Error(`getRoutes() must be implemented by ${this.constructor.name}`);
  }
  
  get mode() {
    throw new Error(`mode getter must be implemented by ${this.constructor.name}`);
  }

   async _getDirections(origin, destination, mode = null) {
    const clientTime = encodeURIComponent(new Date().toISOString());

    const res = await fetch(
      `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}` +
      `&destLat=${destination.lat}&destLng=${destination.lng}` +
      `&clientTime=${clientTime}` +
      (mode ? `&mode=${mode}` : "")
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || "Failed to fetch routes");
    }

    return data.routes || [];
  }
}