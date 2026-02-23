const { getCampusCoordinates, getBuildings } = require("../src/services/map");

describe("get campus coordinates", () => {
    it("returns correct coordinates for SGW", () => {
        const result = getCampusCoordinates("SGW");
        expect(result).toEqual({ lat: 45.4974, lng: -73.5771 });
    });

    it("returns correct coordinates for Loyola", () => {
        const result = getCampusCoordinates("Loyola");
        expect(result).toEqual({ lat: 45.4587, lng: -73.6409 });
    });

    it("returns null for empty string", () => {
        expect(getCampusCoordinates("")).toBeNull();
    });
});

describe("get buildings", () => {
    it("returns an array for SGW", () => {
        const result = getBuildings("SGW");
        expect(Array.isArray(result)).toBe(true);
    });

    it("returns an array for Loyola", () => {
        const result = getBuildings("Loyola");
        expect(Array.isArray(result)).toBe(true);
    });

    it("returns empty array for empty string", () => {
        expect(getBuildings("")).toEqual([]);
    });

    it("every SGW building has required fields", () => {
        const buildings = getBuildings("SGW");
        buildings.forEach((building) => {
        expect(building).toHaveProperty("id");
        expect(building).toHaveProperty("name");
        expect(building).toHaveProperty("code");
        expect(building).toHaveProperty("address");
        expect(building).toHaveProperty("link");
        expect(building).toHaveProperty("coordinates");
        });
    });

    it("every Loyola building has required fields", () => {
        const buildings = getBuildings("Loyola");
        buildings.forEach((building) => {
        expect(building).toHaveProperty("id");
        expect(building).toHaveProperty("name");
        expect(building).toHaveProperty("code");
        expect(building).toHaveProperty("address");
        expect(building).toHaveProperty("link");
        expect(building).toHaveProperty("coordinates");
        });
    });
});