import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampusMap from '../src/Map';

jest.mock('react-native-maps');

const defaultProps = {
  campusCoords: { latitude: 45.4974, longitude: -73.5771 },
  buildings: [],
  onBuildingPress: jest.fn(),
  liveLocationEnabled: false,
  userLocation: null,
  userDraggedMap: false,
  setUserDraggedMap: jest.fn(),
  selectedPois: [],
  onPoiPress: jest.fn(),
};

describe('CampusMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with mapRef testID', () => {
    const { getByTestId } = render(<CampusMap {...defaultProps} />);
    expect(getByTestId('mapRef')).toBeTruthy();
  });

  test('passes buildings to BuildingCallout', () => {
    const mockBuildings = [
      {
        id: 'hall',
        code: 'H',
        name: 'Hall Building',
        coordinates: [
          { latitude: 45.497, longitude: -73.579 },
          { latitude: 45.496, longitude: -73.578 },
        ],
      },
    ];
    const { getAllByText } = render(
      <CampusMap {...defaultProps} buildings={mockBuildings} />
    );
    expect(getAllByText('H')).toBeTruthy();
  });

  test('calls onBuildingPress when building marker is pressed', () => {
    const mockBuildings = [
      {
        id: 'hall',
        code: 'H',
        name: 'Hall Building',
        coordinates: [
          { latitude: 45.497, longitude: -73.579 },
          { latitude: 45.496, longitude: -73.578 },
        ],
      },
    ];
    const onBuildingPress = jest.fn();
    const { getAllByText } = render(
      <CampusMap
        {...defaultProps}
        buildings={mockBuildings}
        onBuildingPress={onBuildingPress}
      />
    );

    const firstMarker = getAllByText('H')[0].parent.parent;
    fireEvent.press(firstMarker);

    expect(onBuildingPress).toHaveBeenCalledTimes(1);
    expect(onBuildingPress).toHaveBeenCalledWith(mockBuildings[0]);
  });

  test('calls onPoiPress when POI marker is pressed', () => {
    const mockPois = [
      {
        place_id: 'poi1',
        name: 'Test Cafe',
        vicinity: '123 Main St',
        types: ['cafe'],
        geometry: { location: { lat: 45.497, lng: -73.579 } },
      },
    ];
    const onPoiPress = jest.fn();
    const { getAllByTestId } = render(
      <CampusMap {...defaultProps} selectedPois={mockPois} onPoiPress={onPoiPress} />
    );

    const poiMarker = getAllByTestId('marker')[0];
    fireEvent.press(poiMarker);

    expect(onPoiPress).toHaveBeenCalledTimes(1);
    expect(onPoiPress).toHaveBeenCalledWith(mockPois[0]);
  });

  test('renders user marker when liveLocationEnabled and userLocation are set', () => {
    const userLocation = { latitude: 45.497, longitude: -73.579 };
    const { getByLabelText } = render(
      <CampusMap
        {...defaultProps}
        liveLocationEnabled={true}
        userLocation={userLocation}
      />
    );
    expect(getByLabelText('userMarker')).toBeTruthy();
  });

  test('does not render user marker when liveLocationEnabled is false', () => {
    const userLocation = { latitude: 45.497, longitude: -73.579 };
    const { queryByLabelText } = render(
      <CampusMap
        {...defaultProps}
        liveLocationEnabled={false}
        userLocation={userLocation}
      />
    );
    expect(queryByLabelText('userMarker')).toBeNull();
  });

  test('does not render user marker when userLocation is null', () => {
    const { queryByLabelText } = render(
      <CampusMap {...defaultProps} liveLocationEnabled={true} userLocation={null} />
    );
    expect(queryByLabelText('userMarker')).toBeNull();
  });

  test('forwards ref to parent', () => {
    const ref = { current: null };
    render(<CampusMap {...defaultProps} ref={ref} />);
    expect(ref.current).toBeDefined();
  });

  test('calls setUserDraggedMap(true) on regionChange when liveLocationEnabled', () => {
    const setUserDraggedMap = jest.fn();
    const { getByTestId } = render(
      <CampusMap
        {...defaultProps}
        liveLocationEnabled={true}
        userLocation={{ latitude: 45.497, longitude: -73.579 }}
        setUserDraggedMap={setUserDraggedMap}
      />
    );
    fireEvent.press(getByTestId('regionChangeTrigger'));
    expect(setUserDraggedMap).toHaveBeenCalledWith(true);
  });

  test('does not call setUserDraggedMap on regionChange when liveLocationEnabled is false', () => {
    const setUserDraggedMap = jest.fn();
    const { getByTestId } = render(
      <CampusMap
        {...defaultProps}
        liveLocationEnabled={false}
        setUserDraggedMap={setUserDraggedMap}
      />
    );
    fireEvent.press(getByTestId('regionChangeTrigger'));
    expect(setUserDraggedMap).not.toHaveBeenCalled();
  });

  test('calls snapBackToUser (setUserDraggedMap(false)) on regionChangeComplete when all conditions met', () => {
    const setUserDraggedMap = jest.fn();
    const { getByTestId } = render(
      <CampusMap
        {...defaultProps}
        liveLocationEnabled={true}
        userLocation={{ latitude: 45.497, longitude: -73.579 }}
        userDraggedMap={true}
        setUserDraggedMap={setUserDraggedMap}
      />
    );
    fireEvent.press(getByTestId('regionChangeTrigger'));
    expect(setUserDraggedMap).toHaveBeenCalledWith(false);
  });

  test('onPoiClick handler runs and logs when poiClickTrigger is pressed', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const { getByTestId } = render(<CampusMap {...defaultProps} />);
    fireEvent.press(getByTestId('poiClickTrigger'));
    expect(logSpy).toHaveBeenCalledWith('Clicked on Test POI with ID: test-id');
    logSpy.mockRestore();
  });

  test('renders POI with unknown type (getPoiIcon returns undefined)', () => {
    const mockPois = [
      {
        place_id: 'poi2',
        name: 'Unknown Place',
        vicinity: '456 Other St',
        types: ['unknown_type'],
        geometry: { location: { lat: 45.498, lng: -73.580 } },
      },
    ];
    const { getAllByTestId } = render(
      <CampusMap {...defaultProps} selectedPois={mockPois} />
    );
    expect(getAllByTestId('marker')).toHaveLength(1);
  });

  test('renders POI with empty types array (getPoiIcon loop with no match)', () => {
    const mockPois = [
      {
        place_id: 'poi3',
        name: 'No Type',
        vicinity: '789 St',
        types: [],
        geometry: { location: { lat: 45.499, lng: -73.581 } },
      },
    ];
    const { getAllByTestId } = render(
      <CampusMap {...defaultProps} selectedPois={mockPois} />
    );
    expect(getAllByTestId('marker')).toHaveLength(1);
  });
});
