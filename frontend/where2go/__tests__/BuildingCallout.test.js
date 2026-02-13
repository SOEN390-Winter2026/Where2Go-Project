import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import BuildingCallout, { buildingImages } from "../src/BuildingCallout";

// ---- mocks ----

beforeEach(() => {
  jest.spyOn(Linking, "openURL").mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View, Pressable } = require("react-native");

  const Marker = ({ children }) => <View testID="marker">{children}</View>;

  const Callout = ({ children, onPress }) => (
    <Pressable testID="callout" onPress={onPress}>
      {children}
    </Pressable>
  );

  return { __esModule: true, Marker, Callout };
});


jest.mock("../src/data/buildings.json", () => ({
  SGW: [
    {
      code: "H",
      name: "Hall Building",
      address: "1455 De Maisonneuve Blvd W",
      latitude: 45.4973,
      longitude: -73.5789,
      link: "https://example.com/hall",
    },
  ],
  Loyola: [],
}));

describe("BuildingCallout", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    if (buildingImages) {
      Object.keys(buildingImages).forEach((k) => delete buildingImages[k]);
    }
  });

  test("renders markers + building info for the current campus", () => {
    const { getAllByTestId, getByText } = render(
      <BuildingCallout currentCampus="SGW" />
    );

    expect(getAllByTestId("marker")).toHaveLength(1);

    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("1455 De Maisonneuve Blvd W")).toBeTruthy();
    expect(getByText("View on Concordia.ca")).toBeTruthy();
  });

  test("pressing the callout opens the building link", () => {
    const { getByTestId } = render(<BuildingCallout currentCampus="SGW" />);

    fireEvent.press(getByTestId("callout"));

    expect(Linking.openURL).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith("https://example.com/hall");
  });

  test("renders nothing when campus has no buildings", () => {
    const { queryAllByTestId, queryByText } = render(
      <BuildingCallout currentCampus="Loyola" />
    );

    expect(queryAllByTestId("marker")).toHaveLength(0);
    expect(queryByText("View on Concordia.ca")).toBeNull();
  });
});
