import React from "react";
import { Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";
import useIndoorMaps from "../../src/utils/useIndoorMaps";

jest.mock("../../src/config", () => ({ API_BASE_URL: "http://api.test" }));

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
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("exposes BUILDINGS_LIST from indoor data", () => {
    const { getByTestId } = render(<Probe />);
    expect(Number(getByTestId("count").props.children)).toBeGreaterThan(0);
  });

  it("fetches campus buildings when campus is set", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => [{ code: "H" }],
    });
    render(<Probe campus="SGW" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("http://api.test/campus/SGW/buildings");
    });
  });

  it("handles fetch failure by falling back to indoor map keys", async () => {
    global.fetch.mockRejectedValue(new Error("network"));
    const { getByTestId } = render(<Probe />);
    await waitFor(() => {
      expect(Number(getByTestId("count").props.children)).toBeGreaterThan(0);
    });
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
