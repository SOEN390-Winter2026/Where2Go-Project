
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampusMap from '../src/Map';

/**
 * ✅ Custom mock: MapView forwards a ref with animateToRegion()
 * so snapBackToUser() doesn't crash in tests.
 */
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef(({ children, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));

    return (
      <View {...props} testID={props.testID || 'mapView'}>
        {children}
      </View>
    );
  });

  const MockMarker = (props) => <View {...props} testID={props.testID || 'marker'} />;
  const MockPolygon = (props) => <View {...props} testID={props.testID || 'polygon'} />;
  const MockPolyline = (props) => <View {...props} testID={props.testID || 'polyline'} />;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
  };
});

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

  // ✅ route props
  activeSegments: null,
  activeRouteCoords: [],
  routeStart: null,
  routeEnd: null,
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
    const ref = React.createRef();
    render(<CampusMap {...defaultProps} ref={ref} />);

    // our mock exposes animateToRegion via useImperativeHandle
    expect(ref.current).toBeDefined();
    expect(typeof ref.current.animateToRegion).toBe('function');
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

    const map = getByTestId('mapRef');
    map.props.onRegionChange?.();
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

    const map = getByTestId('mapRef');
    map.props.onRegionChange?.();
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

    const map = getByTestId('mapRef');
    map.props.onRegionChangeComplete?.();
    expect(setUserDraggedMap).toHaveBeenCalledWith(false);
  });

  test('onPoiClick handler runs and logs when fired', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { getByTestId } = render(<CampusMap {...defaultProps} />);

    const map = getByTestId('mapRef');
    map.props.onPoiClick?.({
      nativeEvent: { placeId: 'test-id', name: 'Test POI' },
    });

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

  /**
   * ✅ SONAR FIX: cover activeSegments?.map + lineDashPattern branch
   */
  test('renders one Polyline per active segment and sets dash pattern for walk segments', () => {
    const activeSegments = [
      { coords: [{ latitude: 1, longitude: 1 }], isWalk: true },
      { coords: [{ latitude: 2, longitude: 2 }], isWalk: false },
    ];

    const { getAllByTestId } = render(
      <CampusMap {...defaultProps} activeSegments={activeSegments} />
    );

    const polylines = getAllByTestId('polyline');
    expect(polylines).toHaveLength(2);
    expect(polylines[0].props.lineDashPattern).toEqual([8, 8]);
    expect(polylines[1].props.lineDashPattern).toBeUndefined();
  });

  /**
   * ✅ SONAR FIX: cover fallback polyline when activeRouteCoords exists and activeSegments empty
   */
  test('renders fallback Polyline when activeRouteCoords exists and activeSegments is empty', () => {
    const { getAllByTestId } = render(
      <CampusMap
        {...defaultProps}
        activeRouteCoords={[{ latitude: 3, longitude: 3 }]}
        activeSegments={[]}
      />
    );

    const polylines = getAllByTestId('polyline');
    expect(polylines).toHaveLength(1);
    expect(polylines[0].props.strokeWidth).toBe(5);
  });

  test('renders start and destination markers when routeStart and routeEnd are provided', () => {
    const { getAllByTestId } = render(
      <CampusMap
        {...defaultProps}
        routeStart={{ latitude: 1, longitude: 1 }}
        routeEnd={{ latitude: 2, longitude: 2 }}
      />
    );

    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });
});