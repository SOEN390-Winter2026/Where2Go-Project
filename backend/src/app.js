const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { getCampusCoordinates, getBuildings } = require("./services/map");

dotenv.config();
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});