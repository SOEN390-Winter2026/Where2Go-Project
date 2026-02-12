import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import UserTypeScreen from "../src/UserType";

describe("UserTypeScreen", () => {
  it("renders the three options and Continue button", () => {
    const onSelectType = jest.fn();
    const { getByText } = render(<UserTypeScreen onSelectType={onSelectType} />);

    expect(getByText("Student")).toBeTruthy();
    expect(getByText("Faculty Member")).toBeTruthy();
    expect(getByText("Visitor")).toBeTruthy();
    expect(getByText("Continue to Map")).toBeTruthy();
  });

  it("Continue is disabled until a type is selected", () => {
    const onSelectType = jest.fn();
    const { getByText } = render(<UserTypeScreen onSelectType={onSelectType} />);

    // Pressing continue without selection should NOT call onSelectType
    fireEvent.press(getByText("Continue to Map"));
    expect(onSelectType).not.toHaveBeenCalled();
  });

  it("selecting a type then pressing Continue calls onSelectType with the chosen type", () => {
    const onSelectType = jest.fn();
    const { getByText } = render(<UserTypeScreen onSelectType={onSelectType} />);

    // choose an option
    fireEvent.press(getByText("Student"));

    // now continue
    fireEvent.press(getByText("Continue to Map"));
    expect(onSelectType).toHaveBeenCalledWith("student");
  });
});
