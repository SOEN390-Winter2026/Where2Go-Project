import React, { useEffect } from "react";
import { render, act } from "@testing-library/react-native";
import * as Location from "expo-location";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: "High" },
}));

function LiveLocationEffect() {
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        () => {}
      );
    })();
  }, []);

  return null;
}

describe("Live location permission handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("denied permission: does not start watchPositionAsync", async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "denied",
    });

    await act(async () => {
      render(<LiveLocationEffect />);
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  test("granted permission: starts watchPositionAsync with correct options", async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    });

    Location.watchPositionAsync.mockResolvedValue({ remove: jest.fn() });

    await act(async () => {
      render(<LiveLocationEffect />);
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);

    const [options, callback] = Location.watchPositionAsync.mock.calls[0];

    expect(options).toMatchObject({
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      distanceInterval: 5,
    });

    expect(typeof callback).toBe("function");
  });
});