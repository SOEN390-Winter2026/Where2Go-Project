import React, { useEffect } from "react";
import { render, waitFor} from "@testing-library/react-native";
import * as Location from "expo-location";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  Accuracy: { High: 3 },
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
    render(<LiveLocationEffect/>)

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });
    expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  });

  test("granted permission: starts watchPositionAsync with correct options", async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    render(<LiveLocationEffect />);

    await waitFor(() => {
      expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
    });
    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 5,
      }),
      expect.any(Function)
    );
  });
});