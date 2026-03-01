import { polygonCentroid } from '../src/utils/geo';

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
