const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const { getCampusCoordinates, getBuildings } = require("./services/map");
const { getTransportOptionsResult } = require("./services/directions");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Backend is running" });
});

// Endpoint to get campus coordinates (SGW or Loyola)
app.get("/campus/:name", (req, res) => {
    console.log("Backend received request for campus:", req.params.name);
    const campus = getCampusCoordinates(req.params.name);
    if (!campus) return res.status(404).json({ error: "Campus not found" });
    res.json(campus);
});

// Endpoint to get building polygons for a campus (for map highlighting)
app.get("/campus/:name/buildings", (req, res) => {
    const buildings = getBuildings(req.params.name);
    res.json(buildings);
});

// GET /directions?originLat=&originLng=&destLat=&destLng=&clientTime=
// clientTime: optional ISO string from user's device for shuttle schedule (uses device time)
// Returns walking, transit, and Concordia shuttle routes
app.get("/directions", async (req, res) => {
    const originLat = Number.parseFloat(req.query.originLat);
    const originLng = Number.parseFloat(req.query.originLng);
    const destLat = Number.parseFloat(req.query.destLat);
    const destLng = Number.parseFloat(req.query.destLng);
    const clientTime = req.query.clientTime && String(req.query.clientTime).trim();

    if (Number.isNaN(originLat) || Number.isNaN(originLng) || Number.isNaN(destLat) || Number.isNaN(destLng)) {
        return res.status(400).json({ error: "Invalid origin/destination coordinates" });
    }

    const origin = { lat: originLat, lng: originLng };
    const destination = { lat: destLat, lng: destLng };
    const opts = clientTime ? { clientTime } : {};

    try {
        const { routes, meta } = await getTransportOptionsResult(origin, destination, opts);
        res.json({ routes, meta });
    } catch (err) {
        console.error("Directions error:", err);
        // US-2.5.1: still respond with a normalized shape so frontend can show a proper state
        res.json({
            routes: [],
            meta: { reason: "REQUEST_FAILED", details: String(err) }
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(3000, '0.0.0.0', () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

module.exports = app;