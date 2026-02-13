import buildings from "../src/data/buildings.json";

describe("buildings.json data sanity", () => {
  test("every building has required fields", () => {
    const required = ["code", "name", "address", "latitude", "longitude"];

    for (const campus of Object.keys(buildings)) {
      const list = buildings[campus] || [];

      for (const b of list) {
        for (const key of required) {
          expect(b[key]).toBeDefined();
        }

        expect(typeof b.code).toBe("string");
        expect(b.code.length).toBeGreaterThan(0);

        expect(typeof b.name).toBe("string");
        expect(b.name.length).toBeGreaterThan(0);

        expect(typeof b.address).toBe("string");
        expect(b.address.length).toBeGreaterThan(0);

        expect(typeof b.latitude).toBe("number");
        expect(Number.isFinite(b.latitude)).toBe(true);

        expect(typeof b.longitude).toBe("number");
        expect(Number.isFinite(b.longitude)).toBe(true);
      }
    }
  });

  test("building codes are unique within each campus", () => {
    for (const campus of Object.keys(buildings)) {
      const list = buildings[campus] || [];
      const codes = list.map((b) => b.code);
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    }
  });
});
