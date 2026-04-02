import {
    getExitWaypoints,
    getAllExitsForCampus,
    exitPositionToLatLng,
    findClosestExitPair,
} from '../../src/utils/Buildingexits';

jest.mock('indoorData', () => ({
    indoorMaps: {
        SGW: {
            H: {
                2: {
                    image: 1,
                    data: {
                        'H2': {
                            floor: 'H2',
                            waypoints: [
                                { id: 'wp_exit1', type: 'exit',      position: { x: 0.5, y: 0.9 }, connections: [] },
                                { id: 'wp_exit2', type: 'exit',      position: { x: 0.2, y: 0.8 }, connections: [] },
                                { id: 'wp_door1', type: 'door',      position: { x: 0.3, y: 0.5 }, connections: [] },
                                { id: 'wp_stair', type: 'staircase', position: { x: 0.4, y: 0.4 }, connections: [] },
                            ],
                            rooms: [],
                        },
                    },
                },
                4: {
                    image: 2,
                    data: {
                        'H4': {
                            floor: 'H4',
                            waypoints: [
                                { id: 'wp_upper_exit', type: 'exit', position: { x: 0.5, y: 0.5 }, connections: [] },
                            ],
                            rooms: [],
                        },
                    },
                },
            },
            MB: {
                6: { image: null, data: null },
            },
        },
        Loyola: {
            CC: {
                1: {
                    image: 3,
                    data: {
                        'CC1': {
                            floor: 'CC1',
                            waypoints: [
                                { id: 'wp_cc_exit', type: 'exit', position: { x: 0.1, y: 0.95 }, connections: [] },
                            ],
                            rooms: [],
                        },
                    },
                },
            },
        },
    },
}));

const mockBuildings = [
    {
        code: 'H',
        coordinates: [
            { latitude: 45.498, longitude: -73.58 },
            { latitude: 45.497, longitude: -73.578 },
            { latitude: 45.496, longitude: -73.579 },
            { latitude: 45.497, longitude: -73.581 },
        ],
    },
    {
        code: 'CC',
        coordinates: [
            { latitude: 45.459, longitude: -73.641 },
            { latitude: 45.458, longitude: -73.64 },
            { latitude: 45.457, longitude: -73.641 },
            { latitude: 45.458, longitude: -73.642 },
        ],
    },
];

describe('getExitWaypoints', () => {
    it('returns exit waypoints from every floor that has data', () => {
        const exits = getExitWaypoints('H', 'SGW');
        expect(exits).toHaveLength(3);
        expect(exits.every(e => e.waypointId.includes('exit'))).toBe(true);
    });

    it('does not include door or staircase waypoints', () => {
        const exits = getExitWaypoints('H', 'SGW');
        expect(exits.find(e => e.waypointId === 'wp_door1')).toBeUndefined();
        expect(exits.find(e => e.waypointId === 'wp_stair')).toBeUndefined();
    });

    it('includes upper-floor exits when present', () => {
        const exits = getExitWaypoints('H', 'SGW');
        expect(exits.find(e => e.waypointId === 'wp_upper_exit')).toBeDefined();
    });

    it('returns correct shape for each exit', () => {
        const exits = getExitWaypoints('H', 'SGW');
        expect(exits[0]).toMatchObject({
            buildingCode: 'H',
            campus: 'SGW',
            floor: '2',
            waypointId: expect.any(String),
            position: { x: expect.any(Number), y: expect.any(Number) },
        });
    });

    it('returns [] for unknown building', () => {
        expect(getExitWaypoints('ZZ', 'SGW')).toEqual([]);
    });

    it('returns [] when no floor has graph data', () => {
        expect(getExitWaypoints('MB', 'SGW')).toEqual([]);
    });

    it('returns [] for unknown campus', () => {
        expect(getExitWaypoints('H', 'Unknown')).toEqual([]);
    });
});

describe('getAllExitsForCampus', () => {
    it('returns exits from all buildings on the campus', () => {
        const exits = getAllExitsForCampus('SGW');
        expect(exits.length).toBeGreaterThan(0);
        expect(exits.every(e => e.campus === 'SGW')).toBe(true);
    });

    it('returns [] for unknown campus', () => {
        expect(getAllExitsForCampus('Unknown')).toEqual([]);
    });
});

describe('exitPositionToLatLng', () => {
    const exit = {
        buildingCode: 'H',
        campus: 'SGW',
        floor: '2',
        waypointId: 'wp_exit1',
        position: { x: 0.5, y: 0.5 },
    };

    it('returns latitude and longitude', () => {
        const result = exitPositionToLatLng(exit, mockBuildings);
        expect(result).toHaveProperty('latitude');
        expect(result).toHaveProperty('longitude');
    });

    it('result is within the building bounding box', () => {
        const result = exitPositionToLatLng(exit, mockBuildings);
        expect(result.latitude).toBeGreaterThanOrEqual(45.496);
        expect(result.latitude).toBeLessThanOrEqual(45.498);
        expect(result.longitude).toBeGreaterThanOrEqual(-73.581);
        expect(result.longitude).toBeLessThanOrEqual(-73.578);
    });

    it('returns null when building is not in the list', () => {
        expect(exitPositionToLatLng({ ...exit, buildingCode: 'ZZ' }, mockBuildings)).toBeNull();
    });

    it('returns null when buildings list is empty', () => {
        expect(exitPositionToLatLng(exit, [])).toBeNull();
    });
});

describe('findClosestExitPair', () => {
    it('returns from and to exit waypoints', () => {
        const result = findClosestExitPair('H', 'SGW', 'CC', 'Loyola', mockBuildings);
        expect(result).not.toBeNull();
        expect(result.from.buildingCode).toBe('H');
        expect(result.to.buildingCode).toBe('CC');
    });

    it('includes distanceMeters in result', () => {
        const result = findClosestExitPair('H', 'SGW', 'CC', 'Loyola', mockBuildings);
        expect(result.distanceMeters).toBeGreaterThan(0);
    });

    it('returns null when from building has no exits', () => {
        expect(findClosestExitPair('MB', 'SGW', 'CC', 'Loyola', mockBuildings)).toBeNull();
    });

    it('returns null when to building has no exits', () => {
        expect(findClosestExitPair('H', 'SGW', 'MB', 'SGW', mockBuildings)).toBeNull();
    });
});