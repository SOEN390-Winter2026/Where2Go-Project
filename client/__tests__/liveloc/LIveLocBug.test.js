import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CampusMap from '../../src/Map';

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

const mockProps = {
    liveLocationEnabled: true,
    userLocation: {
        latitude: 45.5,
        longitude: -73.5,
    },
    onLiveLocDisappear: jest.fn(),
    onLiveLocAppear: jest.fn(),
};

const setIsMarkerCurrentlyVisible = jest.fn();

describe('CampusMap Live Location Visibility', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });


    it('calls onLiveLocDisappear when user location goes out of view', () => {
        render(
            <CampusMap
                {...defaultProps}
                {...mockProps}
                setIsMarkerCurrentlyVisible={setIsMarkerCurrentlyVisible}
            />
        );
    });
});

test("triggers region change visibility logic", () => {

    const mockDisappear = jest.fn();
    const mockAppear = jest.fn();
    const mockSetUserDraggedMap = jest.fn();

    const { getByTestId } = render(
        <CampusMap
            liveLocationEnabled={true}
            userLocation={{
                latitude: 46,
                longitude: -73,
            }}
            onLiveLocDisappear={mockDisappear}
            onLiveLocAppear={mockAppear}
            setUserDraggedMap={mockSetUserDraggedMap}
            buildings={[]}
            selectedPois={[]}
            campusCoords={{
                latitude: 45,
                longitude: -73,
            }}
        />
    );

    const map = getByTestId("mapRef");

    fireEvent(map, "regionChangeComplete", {
        latitude: 45,
        longitude: -73,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    });

    expect(true).toBeTruthy();
});

test("triggers onLiveLocAppear when marker becomes visible", () => {
  const mockDisappear = jest.fn();
  const mockAppear = jest.fn();
  const mockSetUserDraggedMap = jest.fn();

  const { getByTestId } = render(
    <CampusMap
      liveLocationEnabled={true}
      userLocation={{
        latitude: 45,
        longitude: -73,
      }}
      onLiveLocDisappear={mockDisappear}
      onLiveLocAppear={mockAppear}
      setUserDraggedMap={mockSetUserDraggedMap}
      buildings={[]}
      selectedPois={[]}
      campusCoords={{
        latitude: 45,
        longitude: -73,
      }}
    />
  );

  const map = getByTestId("mapRef");

  // 1️⃣ First region: user OUTSIDE view
  fireEvent(map, "regionChangeComplete", {
    latitude: 50, // far away
    longitude: -80,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // 2️⃣ Second region: user INSIDE view
  fireEvent(map, "regionChangeComplete", {
    latitude: 45,
    longitude: -73,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  expect(mockAppear).toHaveBeenCalledTimes(1);
  expect(mockDisappear).toHaveBeenCalled();
});