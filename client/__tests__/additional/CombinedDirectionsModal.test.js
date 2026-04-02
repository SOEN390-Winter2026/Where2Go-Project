import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import CombinedDirectionsModal from "../../src/CombinedDirectionsModal";

describe("CombinedDirectionsModal", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title and Close when visible", () => {
    const { getByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        segments={[
          { kind: "indoor", summary: "Walk inside H", steps: [] },
        ]}
      />
    );
    expect(getByText("Directions")).toBeTruthy();
    expect(getByText("Close")).toBeTruthy();
  });

  it("shows loading state", () => {
    const { getByText, queryByText } = render(
      <CombinedDirectionsModal visible onClose={onClose} loading segments={null} />
    );
    expect(getByText("Building your route…")).toBeTruthy();
    expect(queryByText("Directions")).toBeTruthy();
    expect(queryByText("Indoor")).toBeNull();
  });

  it("shows error when not loading", () => {
    const { getByText, queryByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        loading={false}
        errorMessage="Route failed"
        segments={null}
      />
    );
    expect(getByText("Route failed")).toBeTruthy();
    expect(queryByText("Building your route…")).toBeNull();
  });

  it("renders indoor and outdoor segment badges and summaries", () => {
    const { getByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        segments={[
          { kind: "indoor", summary: "Inside H", steps: ["a"] },
          { kind: "outdoor", summary: "Walk outside", steps: ["Turn left"] },
        ]}
      />
    );
    expect(getByText(/Indoor/)).toBeTruthy();
    expect(getByText(/Outdoor/)).toBeTruthy();
    expect(getByText("Inside H")).toBeTruthy();
    expect(getByText("Walk outside")).toBeTruthy();
    expect(getByText(/Turn left/)).toBeTruthy();
  });

  it("renders outdoor distance and duration meta", () => {
    const { getByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        segments={[
          {
            kind: "outdoor",
            summary: "Campus walk",
            distanceText: "400 m",
            durationText: "5 min",
            steps: [],
          },
        ]}
      />
    );
    expect(getByText("400 m · 5 min")).toBeTruthy();
  });

  it("renders only distance when duration missing", () => {
    const { getByText, queryByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        segments={[
          {
            kind: "outdoor",
            summary: "Leg",
            distanceText: "100 m",
            steps: [],
          },
        ]}
      />
    );
    expect(getByText("100 m")).toBeTruthy();
    expect(queryByText("100 m ·")).toBeNull();
  });

  it("renders outdoor step lines", () => {
    const { getByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        segments={[
          {
            kind: "outdoor",
            summary: "Outside",
            steps: ["First step", "Second step"],
          },
        ]}
      />
    );
    expect(getByText(/First step/)).toBeTruthy();
    expect(getByText(/Second step/)).toBeTruthy();
  });

  it("calls onClose when Close is pressed", () => {
    const { getByText } = render(
      <CombinedDirectionsModal visible onClose={onClose} segments={[]} />
    );
    fireEvent.press(getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not list segment body when segments empty and no error", () => {
    const { queryByText, getByText } = render(
      <CombinedDirectionsModal
        visible
        onClose={onClose}
        loading={false}
        errorMessage={null}
        segments={[]}
      />
    );
    expect(getByText("Directions")).toBeTruthy();
    expect(queryByText(/Indoor/)).toBeNull();
    expect(queryByText(/Outdoor/)).toBeNull();
  });
});
