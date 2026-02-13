import OutdoorDirection from '../src/OutdoorDirection.js';
import { render, waitFor, fireEvent } from "@testing-library/react-native";
import { act } from "react-test-renderer";
import * as Location from 'expo-location';

// Mock the Location module
jest.mock('expo-location');

describe("Rendering Features Properly", () => {

    it("Render SideLeftBar", () => {
        expect(OutdoorDirection).toBeDefined();
    });

    it("Back Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />)
        const pressBackButton = getByTestId("pressBack");


        fireEvent.press(pressBackButton);
        expect(mockOnPress).toHaveBeenCalled();


    });
});

describe("Input and Button Features", () => {
    it("Filter Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} />)
        const pressBackButton = getByTestId("pressFilter");


        fireEvent.press(pressBackButton);
        //expect(pressBackButton).toHaveBeenCalled();


    });

    it("updates text in inputDestLoc", () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputStartLoc");

        act(() => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park"); // ✅ checks that value updated
    });

    it("updates text in inputDestLoc", () => {
        const { getByTestId } = render(<OutdoorDirection onPressBack={() => { }} />);

        const input = getByTestId("inputDestLoc");

        act(() => {
            fireEvent.changeText(input, "Central Park");
        });

        expect(input.props.value).toBe("Central Park"); // ✅ checks that value updated
    });
});

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

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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
        
        // Mock watchPositionAsync to call callback with null coords
        const mockSubscription = { remove: jest.fn() };
        Location.watchPositionAsync.mockImplementation(async (options, callback) => {
            callback(null); // Simulate missing location
            return mockSubscription;
        });

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText, findByText, queryByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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

        const { getByTestId, getByText, findByText } = render(<OutdoorDirection onPressBack={() => { }} />);

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