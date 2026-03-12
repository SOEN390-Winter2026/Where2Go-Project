// __tests__/RouteDetailSheet.test.js
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import RouteDetailsSheet from "../src/RouteDetailSheet"; // <-- change path if needed


it("RouteDetailsSheet returns null when route is null", () => {
  const { toJSON } = render(<RouteDetailsSheet route={null} onClose={() => {}} />);
  expect(toJSON()).toBeNull();
});

it("RouteDetailsSheet renders duration/distance and calls onClose", () => {
  const onClose = jest.fn();
  const route = { mode: "walking", duration: { text: "4 mins" }, distance: { text: "0.3 km" }, steps: [] };

  const { getByText } = render(<RouteDetailsSheet route={route} onClose={onClose} />);
  expect(getByText("4 mins")).toBeTruthy();
  expect(getByText("0.3 km")).toBeTruthy();

  fireEvent.press(getByText("close"));
  expect(onClose).toHaveBeenCalled();
});

// Mock Ionicons so tests don't depend on native vector-icons implementation
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }) => <Text testID="icon">{name}</Text>,
  };
});

describe("RouteDetailsSheet", () => {
  it("returns null when route is null", () => {
    const { toJSON } = render(<RouteDetailsSheet route={null} onClose={() => {}} />);
    expect(toJSON()).toBeNull();
  });

  it("renders walking header icon and duration, and distance when present", () => {
    const route = {
      mode: "walking",
      duration: { text: "4 mins" },
      distance: { text: "0.3 km" },
      steps: [],
    };

    const { getByText, queryByText, getAllByTestId } = render(
      <RouteDetailsSheet route={route} onClose={() => {}} />
    );

    // duration
    expect(getByText("4 mins")).toBeTruthy();
    // distance
    expect(getByText("0.3 km")).toBeTruthy();
    // walking icon
    const icons = getAllByTestId("icon").map((n) => n.props.children);
    expect(icons).toContain("walk");

    // No chips section for walking
    expect(queryByText("356")).toBeNull();
  });

  it("renders fallback duration when missing", () => {
    const route = { mode: "walking", steps: [] };
    const { getByText } = render(<RouteDetailsSheet route={route} onClose={() => {}} />);
    expect(getByText("—")).toBeTruthy();
  });

  it("pressing close triggers onClose", () => {
    const onClose = jest.fn();
    const route = { mode: "walking", duration: { text: "1 min" }, steps: [] };

    const { getByText } = render(<RouteDetailsSheet route={route} onClose={onClose} />);

    // We mocked Ionicons as Text showing its name; close icon exists
    const closeIcon = getByText("close");
    // Pressable wraps close icon -> pressing the icon works
    fireEvent.press(closeIcon);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders transit chips for transit steps only, filters missing lines, and slices to max 6", () => {
    const route = {
      mode: "transit",
      duration: { text: "22 mins" },
      distance: { text: "6.0 km" },
      steps: [
        { type: "walk", durationText: "3 mins" },
        { type: "transit", vehicle: "bus", line: "356" },
        { type: "transit", vehicle: "subway", line: "Green" },
        { type: "transit", vehicle: "bus", line: null }, // should be ignored
        { type: "transit", vehicle: "bus", line: "51" },
        { type: "transit", vehicle: "bus", line: "24" },
        { type: "transit", vehicle: "bus", line: "165" },
        { type: "transit", vehicle: "bus", line: "10" },
        { type: "transit", vehicle: "bus", line: "999" }, // should be sliced off (7th valid)
      ],
    };

    const { getByText, queryByText, getAllByTestId } = render(
      <RouteDetailsSheet route={route} onClose={() => {}} />
    );

    // transit header icon should be bus
    const icons = getAllByTestId("icon").map((n) => n.props.children);
    expect(icons).toContain("bus");

    // Chips should include first 6 valid transit lines
    expect(getByText("356")).toBeTruthy();
    expect(getByText("Green")).toBeTruthy();
    expect(getByText("51")).toBeTruthy();
    expect(getByText("24")).toBeTruthy();
    expect(getByText("165")).toBeTruthy();
    expect(getByText("10")).toBeTruthy();

    // The 7th valid one should not show due to slice(0, 6)
    expect(queryByText("999")).toBeNull();
  });

  it("renders step rows with correct titles/subtitles for walk, bus, and subway", () => {
    const route = {
      mode: "transit",
      duration: { text: "30 mins" },
      distance: { text: "11 km" },
      steps: [
        {
          type: "walk",
          durationText: "5 mins",
          distanceText: "0.4 km",
        },
        {
          type: "transit",
          vehicle: "bus",
          line: "356",
          durationText: "12 mins",
          from: "Stop A",
          to: "Stop B",
          stops: 6,
        },
        {
          type: "transit",
          vehicle: "subway",
          line: "Green",
          durationText: "8 mins",
          from: "Station X",
          to: "Station Y",
          stops: 4,
        },
      ],
    };

    const { getByText, getAllByTestId } = render(
      <RouteDetailsSheet route={route} onClose={() => {}} />
    );

    // Walk title + sub
    expect(getByText("Walk • 5 mins")).toBeTruthy();
    expect(getByText("0.4 km")).toBeTruthy();

    // Bus title + sub
    expect(getByText("Bus • 356 • 12 mins")).toBeTruthy();
    expect(getByText("Stop A → Stop B • 6 stops")).toBeTruthy();

    // Metro title + sub
    expect(getByText("Metro • Green • 8 mins")).toBeTruthy();
    expect(getByText("Station X → Station Y • 4 stops")).toBeTruthy();

    // Ensure subway icon appears too
    const icons = getAllByTestId("icon").map((n) => n.props.children);
    expect(icons).toContain("subway");
  });

  it("handles non-array steps safely (no crash) and shows no steps section", () => {
    const route = {
      mode: "walking",
      duration: { text: "4 mins" },
      distance: { text: "0.3 km" },
      steps: undefined, // not an array
    };

    const { getByText, queryByText } = render(
      <RouteDetailsSheet route={route} onClose={() => {}} />
    );

    expect(getByText("4 mins")).toBeTruthy();
    // A step title like "Walk •" should not appear because steps array becomes []
    expect(queryByText(/Walk •/)).toBeNull();
  });

  it("uses navigate icon for non-walking/non-transit modes", () => {
    const route = {
      mode: "concordia_shuttle",
      duration: { text: "30 mins" },
      distance: { text: "11 km" },
      steps: [],
    };

    const { getAllByTestId } = render(
      <RouteDetailsSheet route={route} onClose={() => {}} />
    );

    const icons = getAllByTestId("icon").map((n) => n.props.children);
    expect(icons).toContain("navigate");
  });
});