const mockFetch = jest.fn();
globalThis.fetch = mockFetch;
globalThis.googleMapsApiKey = "test-api-key";
globalThis.router = { post: jest.fn() };
globalThis.routeController = {};

require("../src/routes/outdoorRouteController.js");
const outdoorRouteController = require("../src/routes/outdoorRouteController.js");
const getRoutes = outdoorRouteController.getRoutes;

describe("getRoutes controller tests", () => {
    let req, res;

    beforeEach(() => {
        req = {
        body: {
            origin: "EV Building, Concordia University",
            destination: "Hall Building, Concordia University",
        },
        };
        res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
        };
        mockFetch.mockReset();
    });

    it("getRoutes is defined and is a function", () => {
        expect(typeof getRoutes).toBe("function");
    });

    it("each returned route has id, distance, duration, and polyline", async () => {
        mockFetch.mockResolvedValueOnce({
        json: jest.fn().mockResolvedValueOnce({
            routes: [
            {
                legs: [{ distance: { text: "0.3 km" }, duration: { text: "4 mins" } }],
                overview_polyline: { points: "somePolyline" },
            },
            ],
        }),
        });
        await getRoutes(req, res);
        const result = res.json.mock.calls[0][0];
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("distance");
        expect(result[0]).toHaveProperty("duration");
        expect(result[0]).toHaveProperty("polyline");
    });

    it("returns 500 if fetch throws a network error", async () => {
        mockFetch.mockRejectedValueOnce(new Error("Network error"));
        await getRoutes(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch routes" });
    });
});