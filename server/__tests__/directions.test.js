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
      statusCode: 200,
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


function makeDirectionsWithSteps({ vehicleType = "BUS" } = {}) {
  return {
    status: "OK",
    routes: [
      {
        overview_polyline: { points: "overview123" },
        legs: [
          {
            distance: { value: 900, text: "0.9 km" },
            duration: { value: 600, text: "10 mins" },
            departure_time: { text: "09:00" },
            arrival_time: { text: "09:10" },
            steps: [
              {
                travel_mode: "WALKING",
                duration: { text: "2 mins" },
                distance: { text: "0.1 km" },
                html_instructions: "<b>Walk</b> to stop",
                polyline: { points: "walkStepPoly" },
              },
              {
                travel_mode: "TRANSIT",
                duration: { text: "6 mins" },
                html_instructions: "<div>Take the metro</div>",
                polyline: { points: "transitStepPoly" },
                transit_details: {
                  headsign: "Downtown",
                  num_stops: 3,
                  departure_stop: { name: "Stop A" },
                  arrival_stop: { name: "Stop B" },
                  departure_time: { text: "09:02" },
                  arrival_time: { text: "09:08" },
                  line: {
                    short_name: "105",
                    name: "105 Express",
                    vehicle: { type: vehicleType }, // BUS / SUBWAY / METRO
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function mockHttpsGetWithStatus({ statusCode, body }) {
  https.get.mockImplementation((url, callback) => {
    const res = {
      statusCode,
      on: jest.fn((event, handler) => {
        if (event === "data") handler(typeof body === "string" ? body : JSON.stringify(body));
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
        expect(result).toMatchObject({
        mode: "walking",
        duration: { value: 240, text: "4 mins" },
        distance: { value: 300, text: "0.3 km" },
        polyline: "abc123",
        });
    });

    it("normalizeRoute sets accessible when third argument is true", () => {
        const result = normalizeRoute(mockRaw, "walking", true);
        expect(result.accessible).toBe(true);
    });

    it("normalizeRoute defaults accessible to false", () => {
        const result = normalizeRoute(mockRaw, "walking");
        expect(result.accessible).toBe(false);
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
it("normalizes steps and strips HTML + sets step polylines", () => {
  const raw = makeDirectionsWithSteps().routes[0];
  const result = normalizeRoute(raw, "transit");

  expect(result.steps).toBeDefined();
  expect(result.steps.length).toBe(2);

  const walk = result.steps.find((s) => s.type === "walk");
  expect(walk.instruction).toBe("Walk to stop"); // HTML stripped
  expect(walk.polyline).toBe("walkStepPoly");
  expect(walk.distanceText).toBe("0.1 km");

  const transit = result.steps.find((s) => s.type === "transit");
  expect(transit.line).toBe("105");
  expect(transit.headsign).toBe("Downtown");
  expect(transit.from).toBe("Stop A");
  expect(transit.to).toBe("Stop B");
  expect(transit.stops).toBe(3);
  expect(transit.polyline).toBe("transitStepPoly");
});

it("normalizes vehicle type BUS -> bus and SUBWAY/METRO -> subway", () => {
  const busRaw = makeDirectionsWithSteps({ vehicleType: "BUS" }).routes[0];
  const busRoute = normalizeRoute(busRaw, "transit");
  expect(busRoute.steps.find((s) => s.type === "transit").vehicle).toBe("bus");

  const subwayRaw = makeDirectionsWithSteps({ vehicleType: "SUBWAY" }).routes[0];
  const subwayRoute = normalizeRoute(subwayRaw, "transit");
  expect(subwayRoute.steps.find((s) => s.type === "transit").vehicle).toBe("subway");

  const metroRaw = makeDirectionsWithSteps({ vehicleType: "METRO" }).routes[0];
  const metroRoute = normalizeRoute(metroRaw, "transit");
  expect(metroRoute.steps.find((s) => s.type === "transit").vehicle).toBe("subway");
});

it("treats OK status with empty routes as no result (returns [])", async () => {
  https.get.mockImplementation((url, callback) => {
    const res = {
      on: jest.fn((event, handler) => {
        if (event === "data") handler(JSON.stringify({ status: "OK", routes: [] }));
        if (event === "end") handler();
        return res;
      }),
    };
    callback(res);
    return { on: jest.fn() };
  });

  const sgwOrigin = { lat: 45.4973, lng: -73.5789 };
  const offCampusDestination = { lat: 45.51, lng: -73.61 };

  const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
  expect(routes).toEqual([]);
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

    it("getTransportOptionsResult returns NO_ACCESSIBLE_ROUTES when accessible and API has no routes", async () => {
        https.get.mockImplementation((url, callback) => {
            const res = {
                statusCode: 200,
                on: jest.fn((event, handler) => {
                    if (event === "data") handler(JSON.stringify({ status: "ZERO_RESULTS", routes: [] }));
                    if (event === "end") handler();
                    return res;
                }),
            };
            callback(res);
            return { on: jest.fn() };
        });
        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination, { accessible: true });
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("NO_ACCESSIBLE_ROUTES");
    });

    it("marks routes accessible when opts.accessible is true", async () => {
        mockHttpsGet(makeMockDirectionsResponse("0.5 km", "6 mins"));
        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination, { accessible: true });
        expect(result.ok).toBe(true);
        result.routes.forEach((route) => {
            expect(route.accessible).toBe(true);
        });
    });

    it("adds transit_routing_preference and transit_mode to transit request when accessible", async () => {
        const urls = [];
        https.get.mockImplementation((url, callback) => {
            urls.push(String(url));
            const res = {
                statusCode: 200,
                on: jest.fn((event, handler) => {
                    if (event === "data") handler(JSON.stringify(makeMockDirectionsResponse("1 km", "10 mins")));
                    if (event === "end") handler();
                    return res;
                }),
            };
            callback(res);
            return { on: jest.fn() };
        });
        await getTransportOptions(sgwOrigin, offCampusDestination, { accessible: true });
        const transitUrl = urls.find((u) => u.includes("mode=transit"));
        expect(transitUrl).toBeDefined();
        expect(transitUrl).toContain("transit_routing_preference=less_walking");
        expect(transitUrl).toContain("transit_mode=bus");
    });

    it("returns shuttle route when trip is SGW to Loyola on a weekday", async () => {
        const mondayInSchedule = new Date("2026-02-02T14:00:00-05:00");
        mockHttpsGet(makeMockDirectionsResponse("11 km", "30 mins", "shuttlePolyline"));
        const routes = await getTransportOptions(sgwOrigin, loyolaDestination, {
            clientTime: mondayInSchedule.toISOString(),
        });
        const shuttleRoute = routes.find((r) => r.mode === "concordia_shuttle");
        expect(shuttleRoute).toBeDefined();
        expect(shuttleRoute.duration.value).toBe(2280);
        expect(shuttleRoute.distance.value).toBe(900);
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

    it("returns empty array when API returns no routes", async () => {
        https.get.mockImplementation((url, callback) => {
            const res = {
            statusCode: 200,
            on: jest.fn((event, handler) => {
                if (event === "data") handler(JSON.stringify({ status: "ZERO_RESULTS", routes: [] }));
                if (event === "end") handler();
                return res;
            }),
            };
            callback(res);
            return { on: jest.fn() };
        });
        const routes = await getTransportOptions(sgwOrigin, offCampusDestination);
        expect(routes).toEqual([]);
        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("NO_ROUTES");
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

    it("handles https network error as UPSTREAM_FAILED", async () => {
        https.get.mockImplementation(() => {
            const emitter = {
            on: jest.fn((event, handler) => {
                if (event === "error") handler(new Error("Network failure"));
                return emitter;
            }),
            };
            return emitter;
        });

        await expect(
            getTransportOptions(sgwOrigin, offCampusDestination)
        ).resolves.toEqual([]);

        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("UPSTREAM_FAILED");
    });
    it("normalizeVehicleType fallback returns 'transit' for unknown vehicle type (covers line 5)", () => {
  const raw = makeDirectionsWithSteps({ vehicleType: "PLANE" }).routes[0]; // unknown
  const route = normalizeRoute(raw, "transit");

  const transitStep = route.steps.find((s) => s.type === "transit");
  expect(transitStep).toBeDefined();
  expect(transitStep.vehicle).toBe("transit"); // ✅ hits return "transit"
});

it("normalizeSteps fallback returns null for unsupported step and filters it out (covers line 285)", () => {
  const raw = makeDirectionsWithSteps().routes[0];

  // inject an invalid step that should hit the fallback (default) -> return null
  raw.legs[0].steps.unshift({
    travel_mode: "UNKNOWN_MODE", // not WALKING or TRANSIT
    polyline: { points: "badStepPoly" },
  });

  const route = normalizeRoute(raw, "transit");

  // The invalid step should be dropped by .filter(Boolean)
  expect(route.steps.length).toBe(2); // still only the 2 valid ones
  expect(route.steps.some((s) => s.polyline === "badStepPoly")).toBe(false);
});

    it("handle malformed JSON from API", async () => {
        https.get.mockImplementation((url, callback) => {
            const res = {
            statusCode: 200,
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
        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("INVALID_RESPONSE");
    });

    it("returns UPSTREAM_FAILED when Directions API responds with non-2xx HTTP status", async () => {
        mockHttpsGetWithStatus({
            statusCode: 500,
            body: { status: "UNKNOWN_ERROR" },
        });

        const result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);

        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("UPSTREAM_FAILED");
    });

    it("handles non-OK statuses and invalid/empty routes shapes", async () => {
        mockHttpsGet({ status: "REQUEST_DENIED" });
        let result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("UPSTREAM_FAILED");

        jest.clearAllMocks();

        mockHttpsGet({ status: "OK", routes: null });
        result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("INVALID_RESPONSE");

        jest.clearAllMocks();

        mockHttpsGet({ status: "OK", routes: [] });
        result = await getTransportOptionsResult(sgwOrigin, offCampusDestination);
        expect(result.ok).toBe(false);
        expect(result.error.code).toBe("NO_ROUTES");
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