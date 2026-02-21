const request = require("supertest");

jest.mock("../src/services/map", () => ({
    getCampusCoordinates: jest.fn(),
    getBuildings: jest.fn(),
}));

jest.mock("../src/services/directions", () => ({
    getTransportOptions: jest.fn(),
}));

const { getCampusCoordinates, getBuildings } = require("../src/services/map");
const { getTransportOptions } = require("../src/services/directions");
const app = require("../src/app");

describe("App endpoints", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /", () => {
        it("returns 200 with backend running message", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ message: "Backend is running" });
        });
    });

    describe("GET endpoint /campus/:name", () => {

        it("returns 200 with coordinates for SGW", async () => {
            getCampusCoordinates.mockReturnValue({ lat: 45.4974, lng: -73.5771 });
            const res = await request(app).get("/campus/SGW");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ lat: 45.4974, lng: -73.5771 });
            expect(getCampusCoordinates).toHaveBeenCalledWith("SGW");
        });

        it("returns 200 with coordinates for Loyola", async () => {
            getCampusCoordinates.mockReturnValue({ lat: 45.4587, lng: -73.6409 });
            const res = await request(app).get("/campus/Loyola");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ lat: 45.4587, lng: -73.6409 });
            expect(getCampusCoordinates).toHaveBeenCalledWith("Loyola");
        });

        it("returns 404 when campus is not found", async () => {
            getCampusCoordinates.mockReturnValue(null);
            const res = await request(app).get("/campus/Unknown");
            expect(res.status).toBe(404);
            expect(res.body).toEqual({ error: "Campus not found" });
        });

    });

    describe("GET endpoint /campus/:name/buildings", () => {
        it("returns 200 with buildings array for SGW", async () => {
            const mockBuildings = [
                { id: "hall", name: "Hall Building", code: "H" },
                { id: "ev", name: "Engineering & Visual Arts", code: "EV" },
            ];
            getBuildings.mockReturnValue(mockBuildings);
            const res = await request(app).get("/campus/SGW/buildings");
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockBuildings);
            expect(getBuildings).toHaveBeenCalledWith("SGW");
        });

        it("returns 200 with buildings array for Loyola", async () => {
            const mockBuildings = [{ id: "vl", name: "Vanier Library", code: "VL" }];
            getBuildings.mockReturnValue(mockBuildings);
            const res = await request(app).get("/campus/Loyola/buildings");
            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockBuildings);
            expect(getBuildings).toHaveBeenCalledWith("Loyola");
        });
    });

    describe("GET /directions", () => {

        const validQuery = {
            originLat: "45.4973",
            originLng: "-73.5789",
            destLat: "45.4582",
            destLng: "-73.6405",
        };

        it("returns 200 with routes for valid coordinates", async () => {
            const mockRoutes = [
                { mode: "walking", duration: { text: "12 mins" }, distance: { text: "1 km" } },
                { mode: "transit", duration: { text: "8 mins" }, distance: { text: "1.2 km" } },
            ];
            getTransportOptions.mockResolvedValue(mockRoutes);
            const res = await request(app).get("/directions").query(validQuery);
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ routes: mockRoutes });
        });

        it("returns 400 if coordinates are missing", async () => {
            const res = await request(app).get("/directions");
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: "Invalid origin/destination coordinates" });
        });

        it("returns 500 if getTransportOptions throws", async () => {
            getTransportOptions.mockRejectedValue(new Error("API failure"));
            const res = await request(app).get("/directions").query(validQuery);
            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: "Failed to fetch directions" });
        });

        it("returns empty routes array when no routes available", async () => {
            getTransportOptions.mockResolvedValue([]);
            const res = await request(app).get("/directions").query(validQuery);
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ routes: [] });
        });
    });
});