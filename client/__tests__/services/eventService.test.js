import { resolveEventDestination } from '../../src/services/eventServices';

jest.mock('../../src/utils/eventDestinationResolver', () => ({
  getDestinationFromBuildingCode: (code) => {
    if (code === 'H') return { label: 'Hall Building', lat: 45.497, lng: -73.578 };
    return null;
  },
}));

const mockBuildings = [
  { code: 'H', name: 'Hall Building', latitude: 45.497, longitude: -73.578 },
  { code: 'EV', name: 'EV Building', latitude: 45.495, longitude: -73.577 },
];

describe('resolveEventDestination', () => {
  it('returns null if no buildingCode provided', () => {
    expect(resolveEventDestination({ buildingCode: null, buildings: mockBuildings, userLocation: null })).toBeNull();
  });

  it('returns null if building code not found', () => {
    expect(resolveEventDestination({ buildingCode: 'UNKNOWN', buildings: mockBuildings, userLocation: null })).toBeNull();
  });

  it('returns dest, targetBuilding, and null origin when no user location', () => {
    const result = resolveEventDestination({ buildingCode: 'H', buildings: mockBuildings, userLocation: null });
    expect(result.dest).toEqual({ label: 'Hall Building', lat: 45.497, lng: -73.578 });
    expect(result.targetBuilding.code).toBe('H');
    expect(result.origin).toBeNull();
  });

  it('returns origin with user location when available', () => {
    const result = resolveEventDestination({
      buildingCode: 'H',
      buildings: mockBuildings,
      userLocation: { latitude: 45.5, longitude: -73.5 },
    });
    expect(result.origin).toEqual({ label: 'Your location', lat: 45.5, lng: -73.5 });
  });
});
