import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import BuildingCallout from "../src/BuildingCallout";

jest.mock("react-native-maps");

describe("BuildingCallout", () => {
  // Define mock buildings here
  const mockBuildings = [
    {
      id: 'h',
      name: 'Hall Building',
      code: 'H',
      address: '1455 De Maisonneuve Blvd W',
      link: 'https://www.concordia.ca/maps/buildings/h.html',
      coordinates: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.496, longitude: -73.578 },
        { latitude: 45.495, longitude: -73.577 },
      ],
    },
    {
      id: 'jw',
      name: 'McConnell Building',
      code: 'JW',
      address: '1400 De Maisonneuve Blvd W',
      link: 'https://www.concordia.ca/maps/buildings/jw.html',
      coordinates: [
        { latitude: 45.497, longitude: -73.578 },
        { latitude: 45.496, longitude: -73.577 },
        { latitude: 45.495, longitude: -73.576 },
      ],
    },
  ];

  const mockOnBuildingPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders markers for all buildings", () => {
    const { getAllByText } = render(
      <BuildingCallout 
        buildings={mockBuildings} 
        onBuildingPress={mockOnBuildingPress} 
      />
    );

    expect(getAllByText("H")).toBeTruthy();
    expect(getAllByText("JW")).toBeTruthy();
  });

  test("pressing a marker calls onBuildingPress with correct building", () => {
    const { getAllByText } = render(
      <BuildingCallout 
        buildings={mockBuildings} 
        onBuildingPress={mockOnBuildingPress} 
      />
    );

    const firstMarker = getAllByText("H")[0].parent.parent;
    fireEvent.press(firstMarker);

    expect(mockOnBuildingPress).toHaveBeenCalledTimes(1);
    expect(mockOnBuildingPress).toHaveBeenCalledWith(mockBuildings[0]);
  });

  test("renders nothing when buildings array is empty", () => {
    const { queryByText } = render(
      <BuildingCallout 
        buildings={[]} 
        onBuildingPress={mockOnBuildingPress} 
      />
    );

    expect(queryByText("H")).toBeNull();
    expect(queryByText("JW")).toBeNull();
  });

  test("renders nothing when buildings is null", () => {
    const { toJSON } = render(
      <BuildingCallout 
        buildings={null} 
        onBuildingPress={mockOnBuildingPress} 
      />
    );

    expect(toJSON()).toBeNull();
  });
});