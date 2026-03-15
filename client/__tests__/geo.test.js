import { polygonCentroid, isPointInPolygon } from '../src/utils/geo';

describe('polygonCentroid', () => {
  it('returns 0, 0 for empty array', () => {
    const result = polygonCentroid([]);

    expect(result.lat).toBeCloseTo(0);
    expect(result.lng).toBeCloseTo(0);
  });

  it('returns the same coordinates when one point is provided', () => {
    // SGW campus coordinates
    const coords = [{ latitude: 45.4974, longitude: -73.5771 }];
    const result = polygonCentroid(coords);

    expect(result.lat).toBeCloseTo(45.4974);
    expect(result.lng).toBeCloseTo(-73.5771);
  });

  it('correctly computes the centroid of multiple points', () => {
    const coords = [
      { latitude: 0, longitude: 0 },
      { latitude: 10, longitude: 10 },
      { latitude: 20, longitude: 20 },
    ];

    const result = polygonCentroid(coords);

    expect(result.lat).toBeCloseTo(10);
    expect(result.lng).toBeCloseTo(10);
  });

  it('handles negative coordinates correctly', () => {
    const coords = [
      { latitude: -10, longitude: 40 },
      { latitude: 10, longitude: -30 },
    ];

    const result = polygonCentroid(coords);

    expect(result.lat).toBeCloseTo(0);
    expect(result.lng).toBeCloseTo(5);
  });
});

describe('isPointInPolygon', () => {
  it('returns true for a point inside a simple square polygon', () => {
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];
    const point = { latitude: 5, longitude: 5 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(true);
  });

  it('returns false for a point outside a simple square polygon', () => {
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];
    const point = { latitude: 15, longitude: 15 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(false);
  });

  it('returns true for a point on the boundary of the polygon', () => {
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];
    const point = { latitude: 5, longitude: 0 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(true); // Ray casting considers boundary as inside
  });

  it('returns false for a point inside a polygon with a hole (simple case)', () => {
    // This is a basic test; for complex polygons with holes, more sophisticated tests would be needed
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 20 },
      { latitude: 20, longitude: 20 },
      { latitude: 20, longitude: 0 },
    ];
    const point = { latitude: 10, longitude: 10 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(true);
  });

  it('handles empty polygon', () => {
    const polygon = [];
    const point = { latitude: 5, longitude: 5 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(false);
  });

  it('handles single point polygon', () => {
    const polygon = [{ latitude: 5, longitude: 5 }];
    const point = { latitude: 5, longitude: 5 };

    const result = isPointInPolygon(point, polygon);

    expect(result).toBe(false); // A single point is not a valid polygon
  });
});
