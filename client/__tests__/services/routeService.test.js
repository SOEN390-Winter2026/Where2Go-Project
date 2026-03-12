import { decodePolylineToCoords, buildRouteFromResponse } from '../../src/services/routeServices';

jest.mock('@mapbox/polyline', () => ({
  decode: (encoded) => {
    if (encoded === 'validPolyline') return [[45.5, -73.5], [45.6, -73.6]];
    return [];
  },
}));

describe('decodePolylineToCoords', () => {
  it('returns empty array for null input', () => {
    expect(decodePolylineToCoords(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(decodePolylineToCoords(undefined)).toEqual([]);
  });

  it('decodes a valid polyline into lat/lng objects', () => {
    const result = decodePolylineToCoords('validPolyline');
    expect(result).toEqual([
      { latitude: 45.5, longitude: -73.5 },
      { latitude: 45.6, longitude: -73.6 },
    ]);
  });
});

describe('buildRouteFromResponse', () => {
  it('returns empty coords and segments for empty route', () => {
    const result = buildRouteFromResponse({ route: {} });
    expect(result.coords).toEqual([]);
    expect(result.segments).toEqual([]);
  });

  it('decodes route polyline into coords', () => {
    const result = buildRouteFromResponse({ route: { polyline: 'validPolyline' } });
    expect(result.coords).toHaveLength(2);
  });

  it('builds segments from steps', () => {
    const route = {
      polyline: 'validPolyline',
      steps: [
        { polyline: 'validPolyline', type: 'walk', vehicle: null },
        { polyline: 'validPolyline', type: 'transit', vehicle: 'bus' },
      ],
    };
    const result = buildRouteFromResponse({ route });
    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].isWalk).toBe(true);
    expect(result.segments[1].isWalk).toBe(false);
    expect(result.segments[1].vehicle).toBe('bus');
  });

  it('filters out steps with empty polylines', () => {
    const route = {
      steps: [
        { polyline: '', type: 'walk' },
        { polyline: 'validPolyline', type: 'walk' },
      ],
    };
    const result = buildRouteFromResponse({ route });
    expect(result.segments).toHaveLength(1);
  });
});
