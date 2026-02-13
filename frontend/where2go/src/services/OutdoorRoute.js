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
