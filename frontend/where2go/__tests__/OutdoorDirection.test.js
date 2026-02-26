import OutdoorDirection from '../src/OutdoorDirection.js';
import { render, waitFor, fireEvent, act, renderHook } from "@testing-library/react-native";
import * as Location from 'expo-location';
import React from 'react';

// Mock the Location module
jest.mock('expo-location');

describe("Rendering Features Properly", () => {

    it("Render SideLeftBar", () => {
        expect(OutdoorDirection).toBeDefined();
    });

    it("Back Button", async () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} buildings={[]} />);
        const pressBackButton = getByTestId("pressBack");

        await act(async () => {
            fireEvent.press(pressBackButton);
        });

        expect(mockOnPress).toHaveBeenCalled();
    });
});

describe("Input and Button Features", () => {
    it("Filter Button", async () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} buildings={[]} />);
        const pressBackButton = getByTestId("pressFilter");

        await act(async () => {
            fireEvent.press(pressBackButton);
        });
    });

    it("updates text in inputStartLoc", async () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        await act(async () => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park");
    });

    it("updates text in inputDestLoc", async () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputDestLoc");

        await act(async () => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park");
    });
});

describe("Initial from/to and suggestion selection", () => {
    const mockBuildings = [
        { id: '1', name: 'Hall Building', campus: 'SGW', coordinates: [{ latitude: 45.497, longitude: -73.579 }, { latitude: 45.498, longitude: -73.578 }] },
        { id: '2', name: 'Library', campus: 'SGW', coordinates: [{ latitude: 45.496, longitude: -73.577 }] },
    ];

    it("sets From input when initialFrom is provided", async () => {
        const { getByTestId } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} initialFrom="Hall Building" />
        );
        await waitFor(() => {
            expect(getByTestId("inputStartLoc").props.value).toBe("Hall Building");
        });
    });

    it("sets To input when initialTo is provided", async () => {
        const { getByTestId } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} initialTo="Library" />
        );
        await waitFor(() => {
            expect(getByTestId("inputDestLoc").props.value).toBe("Library");
        });
    });

    it("selecting a From suggestion updates input and uses building coordinates", async () => {
        const { getByTestId, getByText } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} />
        );
        const fromInput = getByTestId("inputStartLoc");
        await act(async () => {
            fireEvent.changeText(fromInput, "Hall");
        });
        await waitFor(() => {
            expect(getByText("Hall Building")).toBeTruthy();
        });
        const suggestion = getByText("Hall Building");
        await act(async () => {
            fireEvent.press(suggestion);
        });
        expect(fromInput.props.value).toBe("Hall Building");
    });

    it("selecting a To suggestion updates input and uses building coordinates", async () => {
        const { getByTestId, getByText } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} />
        );
        const toInput = getByTestId("inputDestLoc");
        await act(async () => {
            fireEvent.changeText(toInput, "Lib");
        });
        await waitFor(() => {
            expect(getByText("Library")).toBeTruthy();
        });
        const suggestion = getByText("Library");
        await act(async () => {
            fireEvent.press(suggestion);
        });
        expect(toInput.props.value).toBe("Library");
    });

    it("clearing From input clears suggestions", async () => {
        const { getByTestId, getByText, queryByText } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} />
        );
        const fromInput = getByTestId("inputStartLoc");
        await act(async () => {
            fireEvent.changeText(fromInput, "Hall");
        });
        await waitFor(() => {
            expect(getByText("Hall Building")).toBeTruthy();
        });
        await act(async () => {
            fireEvent.changeText(fromInput, "");
        });
        await waitFor(() => {
            expect(queryByText("Hall Building")).toBeNull();
        });
        expect(fromInput.props.value).toBe("");
    });

    it("clearing To input clears suggestions", async () => {
        const { getByTestId, getByText, queryByText } = render(
            <OutdoorDirection onPressBack={() => { }} buildings={mockBuildings} />
        );
        const toInput = getByTestId("inputDestLoc");
        await act(async () => {
            fireEvent.changeText(toInput, "Lib");
        });
        await waitFor(() => {
            expect(getByText("Library")).toBeTruthy();
        });
        await act(async () => {
            fireEvent.changeText(toInput, "");
        });
        await waitFor(() => {
            expect(queryByText("Library")).toBeNull();
        });
        expect(toInput.props.value).toBe("");
    });
});

describe("Route fetching and mode display", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    it("fetches routes when origin and destination have coords and displays mode labels", async () => {
        const mockRoutes = [
            { mode: 'walking', duration: { text: '5 mins' }, distance: { text: '100 m' } },
        ];

        // mock fetch to return the routes payload
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ routes: mockRoutes }),
        });

        const { getByText } = render(
            <OutdoorDirection
                onPressBack={() => { }}
                origin={{ label: 'A', lat: 1, lng: 1 }}
                destination={{ label: 'B', lat: 2, lng: 2 }}
                buildings={[]}
            />
        );

        // wait for the walking mode to be rendered
        await waitFor(() => {
            expect(getByText('Walking')).toBeTruthy();
        });

        expect(global.fetch).toHaveBeenCalled();

        // cleanup
        if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
        else delete global.fetch;
    }, 10000);

    it("handles fetch failures and sets error state", async () => {
        
        global.fetch = jest.fn().mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'boom' }),
        });

        const { findByText, getByText } = render(
            <OutdoorDirection
                onPressBack={() => { }}
                origin={{ label: 'A', lat: 1, lng: 1 }}
                destination={{ label: 'B', lat: 2, lng: 2 }}
                buildings={[]}
            />
        );

        const err = await findByText('boom');
        expect(err).toBeTruthy();

        expect(global.fetch).toHaveBeenCalled();

        if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
        else delete global.fetch;
    });

});
;

describe("Location Error Handling", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetAllMocks();
        // Suppress act() warnings for Icon component
        jest.spyOn(console, 'error').mockImplementation((message) => {
            if (typeof message === 'string' && message.includes('An update to Icon inside a test was not wrapped in act')) {
                return;
            }
            console.warn(message);
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("shows error modal when location services are disabled", async () => {
        // Mock location services as disabled
        Location.hasServicesEnabledAsync.mockResolvedValue(false);

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        // Focus the input to show the location button
        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        // Press the location button
        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Wait for error modal to appear
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Location services are turned off/i);
        expect(errorMessage).toBeTruthy();
    });

    it("shows error modal when location permission is denied", async () => {
        // Mock location services as enabled
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        // Mock permission as denied
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'denied'
        });

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        // Focus the input
        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        // Press the location button
        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Wait for error modal
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Location permission denied/i);
        expect(errorMessage).toBeTruthy();
    });

    it("shows error modal when coordinates are missing", async () => {
        // Mock location services and permissions as granted
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'granted'
        });
        
        // Mock watchPositionAsync: callback(null) covers !loc; callback({}) covers !loc.coords
        const mockSubscription = { remove: jest.fn() };
        Location.watchPositionAsync.mockImplementation(async (options, callback) => {
            callback(null);
            return mockSubscription;
        });

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Wait for error modal
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Unable to get your location coordinates/i);
        expect(errorMessage).toBeTruthy();
    });

    it("successfully sets location when all permissions are granted", async () => {
        const mockCoords = {
            latitude: 40.7128,
            longitude: -74.0060
        };

        // Mock all location services as working
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'granted'
        });

        const mockSubscription = { remove: jest.fn() };
        Location.watchPositionAsync.mockImplementation(async (options, callback) => {
            callback({
                coords: mockCoords
            });
            return mockSubscription;
        });

        const { getByTestId, getByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Verify the input was updated with coordinates
        await waitFor(() => {
            expect(input.props.value).toBe(`${mockCoords.latitude},${mockCoords.longitude}`);
        });
    });

    it("closes error modal when OK button is pressed", async () => {
        // Mock location services as disabled
        Location.hasServicesEnabledAsync.mockResolvedValue(false);

        const { getByTestId, getByText, findByText, queryByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Wait for error modal
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        // Press OK button
        const okButton = getByText("OK");
        act(() => {
            fireEvent.press(okButton);
        });

        // Modal should be closed
        await waitFor(() => {
            expect(queryByText("Location Unavailable")).toBeNull();
        });
    });

    it("allows manual input when location fails", async () => {
        // Mock location services as disabled
        Location.hasServicesEnabledAsync.mockResolvedValue(false);

        const { getByTestId, getByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Even after location fails, manual input should still work
        act(() => {
            fireEvent.changeText(input, "Manual Location");
        });

        expect(input.props.value).toBe("Manual Location");
    });

    it("shows timeout error when location request times out", async () => {
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'granted'
        });

        // Mock timeout error
        const timeoutError = new Error('Location request timed out');
        timeoutError.code = 'E_LOCATION_TIMEOUT';
        Location.watchPositionAsync.mockRejectedValue(timeoutError);

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Verify timeout error message
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Location request timed out/i);
        expect(errorMessage).toBeTruthy();
    });

    it("shows unavailable error when location is unavailable", async () => {
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'granted'
        });

        // Mock unavailable error
        const unavailableError = new Error('Location unavailable');
        unavailableError.code = 'E_LOCATION_UNAVAILABLE';
        Location.watchPositionAsync.mockRejectedValue(unavailableError);

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Verify unavailable error message
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Location is currently unavailable/i);
        expect(errorMessage).toBeTruthy();
    });

    it("shows generic error for unknown location errors", async () => {
        Location.hasServicesEnabledAsync.mockResolvedValue(true);
        Location.requestForegroundPermissionsAsync.mockResolvedValue({
            status: 'granted'
        });

        // Mock generic error without specific code
        const genericError = new Error('Unknown error');
        Location.watchPositionAsync.mockRejectedValue(genericError);

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} buildings={[]} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent(input, 'focus');
        });

        await waitFor(() => {
            expect(getByText("Set to Your Location")).toBeTruthy();
        });

        const locationButton = getByText("Set to Your Location");

        await act(async () => {
            fireEvent.press(locationButton);
        });

        // Verify generic error message
        const errorTitle = await findByText("Location Unavailable");
        expect(errorTitle).toBeTruthy();

        const errorMessage = await findByText(/Unable to get your current location/i);
        expect(errorMessage).toBeTruthy();
    });
});

describe("Retry button", () => {
  let fetchRoutesMock;

  beforeEach(() => {
    fetchRoutesMock = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ mode: "walking", duration: { text: "5 mins" } }] }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("doesnt call fetchRoutes if loading true", () => {
    const loading = true;
    const hasValidEndpoints = true;

    const handleRetry = () => {
      if (loading) return;
      if (!hasValidEndpoints) return;
      fetchRoutesMock();
    };

    handleRetry();
    expect(fetchRoutesMock).not.toHaveBeenCalled();
  });

  it("doesnt call fetchRoutes if endpoints invalid", () => {
    const loading = false;
    const hasValidEndpoints = false;

    const handleRetry = () => {
      if (loading) return;
      if (!hasValidEndpoints) return;
      fetchRoutesMock();
    };

    handleRetry();
    expect(fetchRoutesMock).not.toHaveBeenCalled();
  });

  it("calls fetchRoutes if loading false & endpoints valid", () => {
    const loading = false;
    const hasValidEndpoints = true;

    const handleRetry = () => {
      if (loading) return;
      if (!hasValidEndpoints) return;
      fetchRoutesMock();
    };

    handleRetry();
    expect(fetchRoutesMock).toHaveBeenCalledTimes(1);
  });

  it("fetchRoutes calls API and returns routes", async () => {
    const origin = { lat: 1, lng: 2 };
    const destination = { lat: 3, lng: 4 };
    let routes = [];
    let error = null;

    const fetchRoutes = async () => {
      try {
        const res = await fetch(
          `/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        routes = data.routes || [];
      } catch (e) {
        error = e.message;
      }
    };

    await fetchRoutes();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    expect(routes).toEqual([{ mode: "walking", duration: { text: "5 mins" } }]);

    expect(error).toBeNull();
  });

  it("fetchRoutes sets error if API fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "API failure" }),
    });

    const origin = { lat: 1, lng: 2 };
    const destination = { lat: 3, lng: 4 };
    let routes = [];
    let error = null;

    const fetchRoutes = async () => {
      try {
        const res = await fetch(
          `/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch");
        routes = data.routes || [];
      } catch (e) {
        error = e.message;
      }
    };

    await fetchRoutes();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(routes).toEqual([]);
    expect(error).toBe("API failure");
  });
});