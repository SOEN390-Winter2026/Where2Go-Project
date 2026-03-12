router.post("/outdoorRouting", routeController.getRoutes);

exports.getRoutes = async (req, res) => {
  const { origin, destination } = req.body;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&alternatives=true&key=${googleMapsApiKey}`
    );
    const data = await response.json();
    const formattedRoutes = data.routes.map((route, index) => ({
      id: index,
      distance: route.legs[0].distance.text,
      duration: route.legs[0].duration.text,
      polyline: route.overview_polyline.points,
    }));
    res.json(formattedRoutes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch routes" });
  }
};