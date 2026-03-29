import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Animated } from "react-native";
import IndoorMapsBottomSheet from "../../src/IndoorMapsBottomSheet";

const building = { code: "H", name: "Hall", address: "1 Main St" };

function makeBase(overrides = {}) {
  return {
    sheetHeight: new Animated.Value(88),
    panResponder: { panHandlers: {} },
    activeTab: null,
    handleTabPress: jest.fn(),
    campus: "SGW",
    building,
    ICON_SIZE: 24,
    FONT_LG: 18,
    FONT_SM: 12,
    FONT_MD: 14,
    FLOOR_BTN: 40,
    classroomInput: "",
    setClassroomInput: jest.fn(),
    selectedFloor: "2",
    setSelectedFloor: jest.fn(),
    BUILDINGS_LIST: ["H", "MB"],
    getFloors: () => ["2", "7"],
    getRooms: () => ["H-201"],
    directionsFrom: { building: "H", floor: "2", room: null },
    setDirectionsFrom: jest.fn(),
    directionsTo: { building: "H", floor: "7", room: null },
    setDirectionsTo: jest.fn(),
    handleSwapDirections: jest.fn(),
    onGenerateDirections: jest.fn(),
    generatingDirections: false,
    routeError: null,
    routeSegments: null,
    ...overrides,
  };
}

describe("IndoorMapsBottomSheet", () => {
  it("renders campus and building code", () => {
    const { getAllByText } = render(<IndoorMapsBottomSheet {...makeBase()} />);
    expect(getAllByText("SGW").length).toBeGreaterThan(0);
    expect(getAllByText("H").length).toBeGreaterThan(0);
  });

  it("info tab triggers handleTabPress", () => {
    const handleTabPress = jest.fn();
    const { getByTestId } = render(<IndoorMapsBottomSheet {...makeBase({ handleTabPress })} />);
    fireEvent.press(getByTestId("tab-info"));
    expect(handleTabPress).toHaveBeenCalledWith("info");
  });

  it("shows Directions Summary when directions tab has segments", () => {
    const { getByText } = render(
      <IndoorMapsBottomSheet
        {...makeBase({
          activeTab: "directions",
          routeSegments: [
            {
              kind: "indoor",
              summary: "Inside",
              steps: ["Line one"],
            },
            {
              kind: "outdoor",
              summary: "Outside",
              steps: ["Walk"],
              distanceText: "100 m",
              durationText: "2 min",
            },
          ],
        })}
      />
    );
    expect(getByText("Directions Summary")).toBeTruthy();
    expect(getByText("• Line one")).toBeTruthy();
  });

  it("shows route error inline on directions tab", () => {
    const { getByText } = render(
      <IndoorMapsBottomSheet
        {...makeBase({
          activeTab: "directions",
          routeError: "Could not find path",
        })}
      />
    );
    expect(getByText("Could not find path")).toBeTruthy();
  });
});
