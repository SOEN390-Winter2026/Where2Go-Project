import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import useIndoorMaps from "../../src/utils/useIndoorMaps";

function Probe({ campus = "SGW", buildingCode = "H" }) {
  const h = useIndoorMaps(800, campus, buildingCode);
  return (
    <>
      <Text testID="count">{String(h.BUILDINGS_LIST.length)}</Text>
      <Text testID="floors">{h.getFloors("H").join(",")}</Text>
    </>
  );
}

describe("useIndoorMaps", () => {
  it("exposes BUILDINGS_LIST from indoor data", () => {
    const { getByTestId } = render(<Probe />);
    expect(Number(getByTestId("count").props.children)).toBeGreaterThan(0);
  });

  it("getFloors returns empty for unknown building", () => {
    function Unknown() {
      const h = useIndoorMaps(800, "SGW", "H");
      return <Text testID="z">{String(h.getFloors("__no_such__").length)}</Text>;
    }
    const { getByTestId } = render(<Unknown />);
    expect(getByTestId("z").props.children).toBe("0");
  });
});
