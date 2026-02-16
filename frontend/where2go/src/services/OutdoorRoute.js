/**
 * ⚠️  NOT USED in this branch.
 *
 * This file is not a valid ES module (no imports/exports) and is not imported
 * anywhere in the project. The route-fetching logic it sketches out has been
 * fully implemented inside OutdoorDirection.js (see the fetchRoutes callback),
 * which calls the backend /directions endpoint directly.
 *
 * Keeping it here so the original author (Adriana643) and the team can decide
 * whether to remove it or refactor it into a proper service module.
 *
 * Original commit: c7a9cfce — "Connect to api for gathering routes" (Feb 13, 2026)
 */

const [routes, setRoutes] = useState([]);
const [loading, setLoading] = useState(false);

const handleSearch = async () => {
  try {
    setLoading(true);
    const response = await fetch(`${API_BASE_URL}/outdoorRouting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: selectedOrigin,
        destination: selectedDestination,
        apiKey: process.env.GOOGLE_MAPS_API_KEY
      })
    });

    const data = await response.json();

    setRoutes(data);

  } catch (error) {
    console.error("Routes could not be fetched. ", error);
  } finally {
    setLoading(false);
  }
};
