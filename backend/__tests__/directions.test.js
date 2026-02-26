const {
  getTransportOptions,
  getTransportOptionsResult,
  normalizeRoute,
} = require("../src/services/directions");

jest.mock("../src/services/map", () => ({
    getCampusCoordinates: (name) => {
        if (name === "SGW") return { lat: 45.4973, lng: -73.5789 };
        if (name === "Loyola") return { lat: 45.4582, lng: -73.6405 };
        return null;
    },
}));

jest.mock("https", () => ({
  get: jest.fn(),
}));

const https = require("https");

function mockHttpsGet(jsonData) {
  https.get.mockImplementation((url, callback) => {
    const res = {
      on: jest.fn((event, handler) => {
        if (event === "data") handler(JSON.stringify(jsonData));
        if (event === "end") handler();
        return res;
      }),
    };
    callback(res);
    return { on: jest.fn() };
  });
}

function makeMockDirectionsResponse(distanceText, durationText, polyline = "mockPolyline") {
  return {
    status: "OK",
    routes: [
      {
        legs: [
          {
            distance: { value: 300, text: distanceText },
            duration: { value: 240, text: durationText },
          },
        ],
        overview_polyline: { points: polyline },
      },
    ],
  };
}

describe("receive data from google API", () => {
    const mockRaw = {
        legs: [
        {
            distance: { value: 300, text: "0.3 km" },
            duration: { value: 240, text: "4 mins" },
        },
        ],
        overview_polyline: { points: "abc123" },
    };

    it("generate a walking route correctly", () => {
        const result = normalizeRoute(mockRaw, "walking");
        expect(result).toEqual({
        mode: "walking",
        duration: { value: 240, text: "4 mins" },
        distance: { value: 300, text: "0.3 km" },
        polyline: "abc123",
        });
    });

    it("generate a transit route correctly", () => {
        const result = normalizeRoute(mockRaw, "transit");
        expect(result.mode).toBe("transit");
    });

    it("returns null if no legs are present", () => {
        const result = normalizeRoute({ legs: [] }, "walking");
        expect(result).toBeNull();
    });

    it("returns null if legs is undefined", () => {
        const result = normalizeRoute({}, "walking");
        expect(result).toBeNull();
    });
});

describe("receiving transportation options", () => {
    const sgwOrigin = { lat: 45.4973, lng: -73.5789 };
    const loyolaDestination = { lat: 45.4582, lng: -73.6405 };
    const offCampusDestination = { lat: 45.51, lng: -73.61 };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SHUTTLE_SCHEDULE_OVERRIDE = "1";
    });

    afterAll(() => {
        delete process.env.SHUTTLE_SCHEDULE_OVERRIDE;
    });

    it("returns walking and transit routes for a trip", async () => {
        mockHttpsGet(makeMockDirectionsResponse("0.5 km", "6 mins"));
        const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
        const modes = routes.map((r) => r.mode);
        expect(modes).toContain("walking");
        expect(modes).toContain("transit");
    });

    it("returns shuttle route when trip is SGW to Loyola on a weekday", async () => {
        const mondayInSchedule = new Date("2026-02-02T14:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins", "shuttlePolyline"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: mondayInSchedule.toISOString(),
        });
        const shuttleRoute = routes.find((r) => r.mode === "concordia_shuttle");
        expect(shuttleRoute).toBeDefined();
        expect(shuttleRoute.duration.value).toBe(1800);
        expect(shuttleRoute.distance.value).toBe(11000);
    });

    it("doesnt return shuttle when origin and destination are the same campus", async () => {
        mockHttpsGet(makeMockDirectionsResponse("0.3 km", "4 mins"));
        const routes = await getTransportOptions(sgwOrigin, sgwOrigin);
        const shuttleRoute = routes.find((r) => r.mode === "concordia_shuttle");
        expect(shuttleRoute).toBeUndefined();
    });

    it("doesnt return shuttle when destination is off campus", async () => {
        mockHttpsGet(makeMockDirectionsResponse("2 km", "25 mins"));
        const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
        const shuttleRoute = routes.find((r) => r.mode === "concordia_shuttle");
        expect(shuttleRoute).toBeUndefined();
    });

    it("returns NO_ROUTES meta when API returns ZERO_RESULTS", async () => {
    https.get.mockImplementation((url, callback) => {
        const res = {
        on: jest.fn((event, handler) => {
            if (event === "data") handler(JSON.stringify({ status: "ZERO_RESULTS", routes: [] }));
            if (event === "end") handler();
            return res;
        }),
        };
        callback(res);
        return { on: jest.fn() };
    });

    const { routes, meta } = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
    expect(routes).toEqual([]);
    expect(meta.reason).toBe("NO_ROUTES");
    });

    it("uses clientTime for shuttle schedule calculation", async () => {
        const friday = new Date("2026-02-06T10:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: friday.toISOString(),
        });
        const shuttleRoute = routes.find((r) => r.mode === "concordia_shuttle");
        expect(shuttleRoute).toBeDefined();
        expect(shuttleRoute.nextDeparture).toBeDefined();
    });

    it("falls back to server time if clientTime is invalid", async () => {
        mockHttpsGet(makeMockDirectionsResponse("0.5 km", "6 mins"));
        await expect(
            getTransportOptions(sgwOrigin, offCampusDestination, { clientTime: "not-a-date" })
        ).resolves.toBeDefined();
    });

    it("each route has mode, duration, distance fields", async () => {
        mockHttpsGet(makeMockDirectionsResponse("1 km", "12 mins"));
        const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
        routes.forEach((route) => {
            expect(route).toHaveProperty("mode");
            expect(route).toHaveProperty("duration");
            expect(route).toHaveProperty("distance");
        });
    });

    it("shuttle is not available on weekends", async () => {
        const saturday = new Date("2026-02-07T14:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: saturday.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("shuttle is not available after last departure on weekday", async () => {
        const lateMonday = new Date("2026-02-02T19:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: lateMonday.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("returns null nextDeparture when no more buses today", async () => {
        const lateFriday = new Date("2026-02-06T19:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: lateFriday.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("handles https network error (returns empty routes)", async () => {
    https.get.mockImplementation(() => {
        const emitter = {
        on: jest.fn((event, handler) => {
            if (event === "error") handler(new Error("Network failure"));
            return emitter;
        }),
        };
        return emitter;
    });

    const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
    expect(routes).toEqual([]);
    });

    it("getTransportOptionsResult sets meta.reason=REQUEST_FAILED on network error", async () => {
    https.get.mockImplementation(() => {
        const emitter = {
        on: jest.fn((event, handler) => {
            if (event === "error") handler(new Error("Network failure"));
            return emitter;
        }),
        };
        return emitter;
    });

    const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
    expect(result.routes).toEqual([]);
    expect(result.meta).toBeDefined();
    expect(result.meta.reason).toBe("REQUEST_FAILED");
    });

    it("handle malformed JSON from API", async () => {
        https.get.mockImplementation((url, callback) => {
            const res = {
                on: jest.fn((event, handler) => {
                    if (event === "data") handler("not valid json {{{{");
                    if (event === "end") handler();
                    return res;
                }),
            };
            callback(res);
            return { on: jest.fn() };
        });
        const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
        expect(routes).toEqual([]);
    });
});


describe("schedule period logic without override", () => {
    const sgwOrigin = { lat: 45.4973, lng: -73.5789 };
    const loyolaDestination = { lat: 45.4582, lng: -73.6405 };

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.SHUTTLE_SCHEDULE_OVERRIDE;
    });

    afterAll(() => {
        delete process.env.SHUTTLE_SCHEDULE_OVERRIDE;
    });

    it("shuttle runs on valid 2026 weekday on schedule", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const monday = new Date("2026-02-02T14:00:00-05:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: monday.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeDefined();
    });

    it("shuttle does not run before Jan 12 2026", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const before = new Date("2026-01-11T14:00:00-05:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: before.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("shuttle does not run after Apr 15 2026", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const after = new Date("2026-04-16T14:00:00-04:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: after.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("shuttle does not run in May 2026", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const may = new Date("2026-05-01T14:00:00-04:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: may.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

    it("shuttle runs in 2025", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const monday2025 = new Date("2025-03-03T14:00:00-05:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: monday2025.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeDefined();
    });

    it("shuttle does not run in 2024", async () => {
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins"));
        const y2024 = new Date("2024-02-05T14:00:00-05:00");
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: y2024.toISOString(),
        });
        expect(routes.find((r) => r.mode === "concordia_shuttle")).toBeUndefined();
    });

});