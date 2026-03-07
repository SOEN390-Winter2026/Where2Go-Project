import { getDestinationFromBuildingCode } from '../src/utils/eventDestinationResolver';

describe('getDestinationFromBuildingCode', () => {
  const buildingsWithCoordinates = [
    {
      id: 'hall',
      code: 'H',
      name: 'Hall Building',
      coordinates: [{ latitude: 45.497, longitude: -73.579 }],
    },
    {
      id: 'ev',
      code: 'EV',
      name: 'EV Building',
      latitude: 45.495,
      longitude: -73.577,
    },
    {
      id: 'mb',
      code: 'MB',
      name: 'John Molson Building',
      coordinates: [],
    },
    {
      id: 'noCoords',
      code: 'X',
      name: 'No Coords Building',
    },
  ];

  it('returns destination when building has coordinates array', () => {
    const result = getDestinationFromBuildingCode('H', buildingsWithCoordinates);
    expect(result).toEqual({
      label: 'Hall Building',
      lat: 45.497,
      lng: -73.579,
    });
  });

  it('returns destination when building has latitude/longitude fields', () => {
    const result = getDestinationFromBuildingCode('EV', buildingsWithCoordinates);
    expect(result).toEqual({
      label: 'EV Building',
      lat: 45.495,
      lng: -73.577,
    });
  });

  it('returns null when building code not in list', () => {
    const result = getDestinationFromBuildingCode('UNKNOWN', buildingsWithCoordinates);
    expect(result).toBeNull();
  });

  it('returns null when building has no coordinates', () => {
    const result = getDestinationFromBuildingCode('X', buildingsWithCoordinates);
    expect(result).toBeNull();
  });

  it('returns null when building has empty coordinates array', () => {
    const result = getDestinationFromBuildingCode('MB', buildingsWithCoordinates);
    expect(result).toBeNull();
  });

  it('returns null when buildingCode is null or undefined', () => {
    expect(getDestinationFromBuildingCode(null, buildingsWithCoordinates)).toBeNull();
    expect(getDestinationFromBuildingCode(undefined, buildingsWithCoordinates)).toBeNull();
  });

  it('returns null when buildings is not an array', () => {
    expect(getDestinationFromBuildingCode('H', null)).toBeNull();
    expect(getDestinationFromBuildingCode('H', undefined)).toBeNull();
    expect(getDestinationFromBuildingCode('H', {})).toBeNull();
  });
});
