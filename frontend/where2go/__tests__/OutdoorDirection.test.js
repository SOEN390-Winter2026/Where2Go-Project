import React from "react"; 
import { render, waitFor, fireEvent, act } from "@testing-library/react-native";
import * as Location from "expo-location";

let mockFitToCoordinates;

jest.mock("react-native/Libraries/Pressability/usePressability", () => {
  return (config) => ({
    getEventHandlers: () => ({
      onPress: config?.onPress,
      onLongPress: config?.onLongPress,
      onPressIn: config?.onPressIn,
      onPressOut: config?.onPressOut,
    }),
  });
});

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");

  mockFitToCoordinates = jest.fn();

  const map = React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: mockFitToCoordinates,
    }));
    return <View {...props} />;
  });

  const Mock = (props) => <View {...props} />;

  return {
    __esModule: true,
    default: map,
    Polyline: Mock,
    Marker: Mock,
    Polygon: Mock,
  };
});

jest.mock("@mapbox/polyline", () => ({
  decode: jest.fn((encoded) => {
    if (!encoded) return [];
    return [
      [45, -73],
      [45.1, -73.1],
    ];
  }),
}));

jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return { Ionicons: ({ name }) => <Text>{name}</Text> };
});

jest.mock("../src/config", () => ({
  API_BASE_URL: "http://test-server",
}));

jest.mock("../src/theme/colors", () => ({
  colors: { primary: "#7C2B38" },
}));

jest.mock("../assets/background.png", () => 1);

jest.mock("../src/data/locations", () => ({
  KNOWN_LOCATIONS: [
    { label: "Hall Building", lat: 45.497, lng: -73.579, searchText: "hall building" },
  ],
  SEARCHABLE_LOCATIONS: [
    { label: "Hall Building (H)", lat: 45.497, lng: -73.579, searchText: "hall building" },
    { label: "Loyola Campus", lat: 45.4587, lng: -73.6409, searchText: "loyola campus" },
    { label: "EV Building", lat: 45.495, lng: -73.577, searchText: "ev building" },
    { label: "Library", lat: 45.496, lng: -73.577, searchText: "library" },
  ],
}));

jest.mock("../src/ErrorModal", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  const PropTypes = require("prop-types");

  function ErrorModalMock({ visible, onClose, title, message, buttonText = "OK" }) {
    if (!visible) return null;
    return (
      <View>
        <Text>{title}</Text>
        <Text>{message}</Text>
        <Pressable onPress={onClose}>
          <Text>{buttonText}</Text>
        </Pressable>
      </View>
    );
  }

  ErrorModalMock.propTypes = {
    visible: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    buttonText: PropTypes.string,
  };

  return ErrorModalMock;
});

jest.mock("expo-location");

import OutdoorDirection from "../src/OutdoorDirection.js";
import polyline from "@mapbox/polyline";
const origin = { label: "A", lat: 1, lng: 1 };
const destination = { label: "B", lat: 2, lng: 2 };

describe("Rendering Features Properly", () => {
  it("component exists", () => {
    expect(OutdoorDirection).toBeDefined();
  });

  it("Back Button calls onPressBack", async () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(<OutdoorDirection onPressBack={mockOnPress} buildings={[]} />);

    await act(async () => {
      fireEvent.press(getByTestId("pressBack"));
    });

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it("Filter Button is pressable (no crash)", async () => {
    const { getByTestId } = render(<OutdoorDirection onPressBack={() => {}} buildings={[]} />);

    await act(async () => {
      fireEvent.press(getByTestId("pressFilter"));
    });
  });
});

describe("Input and Button Features", () => {
  it("updates text in inputStartLoc", async () => {
    const { getByTestId } = render(<OutdoorDirection onPressBack={() => {}} buildings={[]} />);
    const input = getByTestId("inputStartLoc");

    await act(async () => {
      fireEvent.changeText(input, "Central Park");
    });

    expect(input.props.value).toBe("Central Park");
  });

  it("updates text in inputDestLoc", async () => {
    const { getByTestId } = render(<OutdoorDirection onPressBack={() => {}} buildings={[]} />);
    const input = getByTestId("inputDestLoc");

    await act(async () => {
      fireEvent.changeText(input, "Central Park");
    });

    expect(input.props.value).toBe("Central Park");
  });
});

describe("Initial from/to and suggestion selection", () => {
  const mockBuildings = [
    {
      id: "1",
      name: "Hall Building",
      campus: "SGW",
      coordinates: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.578 },
      ],
    },
    {
      id: "2",
      name: "Library",
      campus: "SGW",
      coordinates: [{ latitude: 45.496, longitude: -73.577 }],
    },
  ];

  it("sets From input when initialFrom is provided", async () => {
    const { getByTestId } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} initialFrom="Hall Building" />
    );

    await waitFor(() => {
      expect(getByTestId("inputStartLoc").props.value).toBe("Hall Building");
    });
  });

  it("sets To input when initialTo is provided", async () => {
    const { getByTestId } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} initialTo="Library" />
    );

    await waitFor(() => {
      expect(getByTestId("inputDestLoc").props.value).toBe("Library");
    });
  });

  it("selecting a From suggestion updates input and trims parentheses display name", async () => {
    const { getByTestId, getByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} />
    );

    const fromInput = getByTestId("inputStartLoc");

    await act(async () => {
      fireEvent.changeText(fromInput, "Hall");
    });

    await waitFor(() => {
      expect(getByText("Hall Building")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Hall Building"));
    });

    expect(fromInput.props.value).toBe("Hall Building");
  });

  it("selecting a To suggestion updates input", async () => {
    const { getByTestId, getByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} />
    );

    const toInput = getByTestId("inputDestLoc");

    await act(async () => {
      fireEvent.changeText(toInput, "Lib");
    });

    await waitFor(() => {
      expect(getByText("Library")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Library"));
    });

    expect(toInput.props.value).toBe("Library");
  });

  it("scheduleClose: blur closes dropdown after timeout", async () => {
    jest.useFakeTimers();

    const { getByTestId, getByText, queryByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} />
    );

    const fromInput = getByTestId("inputStartLoc");

    act(() => {
      fireEvent(fromInput, "focus");
    });

    await act(async () => {
      fireEvent.changeText(fromInput, "Hall");
    });

    await waitFor(() => {
      expect(getByText("Hall Building")).toBeTruthy();
    });

    act(() => {
      fireEvent(fromInput, "blur");
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(queryByText("Hall Building")).toBeNull();
    });

    jest.useRealTimers();
  });
});

describe("resolveLocationByName fallback coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [{ mode: "walking", duration: { text: "1 min" }, polyline: "x" }] }),
    });
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  it("initialFrom matches SEARCHABLE_LOCATIONS by displayName (covers getBuildingDisplayName path)", async () => {
    render(
      <OutdoorDirection
        onPressBack={() => {}}
        buildings={[]}                    // forces SEARCHABLE_LOCATIONS branch
        initialFrom="Hall Building"       // displayName of "Hall Building (H)"
        initialTo="Loyola Campus"
      />
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  it("initialFrom matches SEARCHABLE_LOCATIONS by raw label (covers label?.toLowerCase() path)", async () => {
    render(
      <OutdoorDirection
        onPressBack={() => {}}
        buildings={[]}                         // forces SEARCHABLE_LOCATIONS branch
        initialFrom="Hall Building (H)"        // raw label match
        initialTo="Loyola Campus"
      />
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
  });

  it("unknown name returns {lat:null,lng:null} and does NOT fetch routes", async () => {
    render(
      <OutdoorDirection
        onPressBack={() => {}}
        buildings={[]}
        initialFrom="Some Unknown Place"
        initialTo="Loyola Campus"
      />
    );

    // Give effects a tick; no fetch should happen because origin has null coords
    await act(async () => {});
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

it("clearOrigin clears origin query (press close-circle wrapper #0)", async () => {
  const { getByTestId, getAllByText } = render(
    <OutdoorDirection onPressBack={() => {}} buildings={[]} />
  );

  await act(async () => {
    fireEvent.changeText(getByTestId("inputStartLoc"), "Hall");
  });

  const closeIcons = getAllByText("close-circle");

  // press the wrapper (parent) because Text itself isn't pressable
  await act(async () => {
    fireEvent.press(closeIcons[0].parent);
  });

  expect(getByTestId("inputStartLoc").props.value).toBe("");
});

it("clearDest clears dest query (single close-circle belongs to active dest field)", async () => {
  const { getByTestId, getAllByText } = render(
    <OutdoorDirection onPressBack={() => {}} buildings={[]} />
  );

  const destInput = getByTestId("inputDestLoc");

  // Make dest the active field so the clear icon belongs to dest
  act(() => {
    fireEvent(destInput, "focus");
  });

  await act(async () => {
    fireEvent.changeText(destInput, "Lib");
  });

  // Your UI renders only ONE close-circle at a time
  const closeIcons = getAllByText("close-circle");
  expect(closeIcons.length).toBe(1);

  await act(async () => {
    fireEvent.press(closeIcons[0].parent);
  });

  expect(getByTestId("inputDestLoc").props.value).toBe("");
});

it("dest dropdown renders when dest is focused and query matches (covers dropdown lines)", async () => {
  const mockBuildings = [
    {
      id: "2",
      name: "Library",
      campus: "SGW",
      coordinates: [{ latitude: 45.496, longitude: -73.577 }],
    },
  ];

  const { getByTestId, getByText } = render(
    <OutdoorDirection onPressBack={() => {}} buildings={mockBuildings} />
  );

  const destInput = getByTestId("inputDestLoc");

  act(() => {
    fireEvent(destInput, "focus");
  });

  await act(async () => {
    fireEvent.changeText(destInput, "Lib");
  });

  await waitFor(() => {
    expect(getByText("Library")).toBeTruthy();
  });
});

describe("Route fetching and mode display", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    globalThis.fetch = undefined;
  });

  it("fetches routes when origin/destination have coords and displays multiple mode labels", async () => {
    const mockRoutes = [
      { mode: "walking", duration: { text: "5 mins" }, distance: { text: "100 m" }, polyline: "x" },
      { mode: "transit", duration: { text: "10 mins" }, distance: { text: "2 km" }, polyline: "y" },
      { mode: "concordia_shuttle", duration: { text: "7 mins" }, distance: { text: "1 km" }, polyline: "z" },
      { mode: "scooter_mode", duration: { text: "3 mins" }, distance: { text: "0.5 km" }, polyline: "w" },
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Walking")).toBeTruthy());
    expect(getByText("Transit")).toBeTruthy();
    expect(getByText("Concordia Shuttle")).toBeTruthy();
    expect(getByText("scooter_mode")).toBeTruthy();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("handles fetch failures and shows no-routes empty state", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "boom" }),
    });

    const { findByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    expect(await findByText("No routes found")).toBeTruthy();
    expect(await findByText("Try selecting different locations or check your connection.")).toBeTruthy();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("empty routes shows empty state + Try Again", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    expect(getByText("No routes found")).toBeTruthy();
    expect(getByText("Try Again")).toBeTruthy();
  });

  it("fetchRoutes early-return path when user edits origin after valid fetch (no second fetch call)", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ mode: "walking", duration: { text: "5 mins" }, polyline: "x" }],
      }),
    });

    const { getByTestId, getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Walking")).toBeTruthy());
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.changeText(getByTestId("inputStartLoc"), "X");
    });

    await act(async () => {});

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("Selecting a route - polyline normalization coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("normalizes polyline from ALL fallback keys and calls onSelectRoute + onPressBack", async () => {
    const mockOnSelectRoute = jest.fn();
    const mockOnPressBack = jest.fn();

    const mockRoutes = [
      {
        mode: "transit",
        duration: { text: "10 mins" },
        distance: { text: "1 km" },
        overview_polyline: { points: "OVERVIEW_POLYLINE_POINTS" },
      },
      {
        mode: "walking",
        duration: { text: "5 mins" },
        distance: { text: "0.5 km" },
        overviewPolyline: { points: "OVERVIEW_POLYLINE_CAMEL" },
      },
      {
        mode: "concordia_shuttle",
        duration: { text: "7 mins" },
        distance: { text: "1 km" },
        polyline: { encodedPolyline: "ENCODED_POLYLINE" },
      },
      {
        mode: "scooter_mode",
        duration: { text: "3 mins" },
        distance: { text: "0.2 km" },
        polyline: { points: "POLYLINE_POINTS_OBJ" },
      },
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={mockOnPressBack}
        onSelectRoute={mockOnSelectRoute}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Transit")).toBeTruthy());
    expect(getByText("Walking")).toBeTruthy();
    expect(getByText("Concordia Shuttle")).toBeTruthy();
    expect(getByText("scooter_mode")).toBeTruthy();

    await act(async () => fireEvent.press(getByText("Transit")));
    await act(async () => fireEvent.press(getByText("Walking")));
    await act(async () => fireEvent.press(getByText("Concordia Shuttle")));
    await act(async () => fireEvent.press(getByText("scooter_mode")));

    expect(mockOnSelectRoute).toHaveBeenCalledTimes(4);
    expect(mockOnPressBack).toHaveBeenCalledTimes(4);

    const call0 = mockOnSelectRoute.mock.calls[0][0];
    const call1 = mockOnSelectRoute.mock.calls[1][0];
    const call2 = mockOnSelectRoute.mock.calls[2][0];
    const call3 = mockOnSelectRoute.mock.calls[3][0];

    expect(call0.route.polyline).toBe("OVERVIEW_POLYLINE_POINTS");
    expect(call1.route.polyline).toBe("OVERVIEW_POLYLINE_CAMEL");
    expect(call2.route.polyline).toBe("ENCODED_POLYLINE");
    expect(call3.route.polyline).toBe("POLYLINE_POINTS_OBJ");

    expect(call0.origin).toMatchObject(origin);
    expect(call0.destination).toMatchObject(destination);
  });
});

describe("Location Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });

    jest.spyOn(console, "error").mockImplementation((message) => {
      if (typeof message === "string" && message.includes("was not wrapped in act")) return;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows error modal when location services are disabled", async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Location services are turned off/i)).toBeTruthy();
  });

  it("shows error modal when location permission is denied", async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(true);
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Location permission denied/i)).toBeTruthy();
  });

  it("shows error modal when coordinates are missing", async () => {
    Location.watchPositionAsync.mockImplementation(async (_opts, cb) => {
      cb(null);
      return { remove: jest.fn() };
    });

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Unable to get your location coordinates/i)).toBeTruthy();
  });

  it("successfully sets location when all permissions are granted", async () => {
    const mockCoords = { latitude: 40.7128, longitude: -74.006 };

    Location.watchPositionAsync.mockImplementation(async (_opts, cb) => {
      cb({ coords: mockCoords });
      return { remove: jest.fn() };
    });

    const { getByTestId, getByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    await waitFor(() => {
      expect(getByTestId("inputStartLoc").props.value).toBe(
        `${mockCoords.latitude},${mockCoords.longitude}`
      );
    });
  });

  it("closes error modal when OK is pressed", async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);

    const { getByTestId, getByText, findByText, queryByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Set to Your Location")));
    expect(await findByText("Location Unavailable")).toBeTruthy();

    act(() => fireEvent.press(getByText("OK")));

    await waitFor(() => {
      expect(queryByText("Location Unavailable")).toBeNull();
    });
  });

  it("shows timeout error when location request times out", async () => {
    const timeoutError = new Error("Location request timed out");
    timeoutError.code = "E_LOCATION_TIMEOUT";
    Location.watchPositionAsync.mockRejectedValue(timeoutError);

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());
    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Location request timed out/i)).toBeTruthy();
  });

  it("shows unavailable error when location is unavailable", async () => {
    const unavailableError = new Error("Location unavailable");
    unavailableError.code = "E_LOCATION_UNAVAILABLE";
    Location.watchPositionAsync.mockRejectedValue(unavailableError);

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());
    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Location is currently unavailable/i)).toBeTruthy();
  });

  it("shows generic error for unknown location errors", async () => {
    const genericError = new Error("Unknown error");
    Location.watchPositionAsync.mockRejectedValue(genericError);

    const { getByTestId, getByText, findByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={[]} />
    );

    const input = getByTestId("inputStartLoc");
    act(() => fireEvent(input, "focus"));

    await waitFor(() => expect(getByText("Set to Your Location")).toBeTruthy());
    await act(async () => fireEvent.press(getByText("Set to Your Location")));

    expect(await findByText("Location Unavailable")).toBeTruthy();
    expect(await findByText(/Unable to get your current location/i)).toBeTruthy();
  });
});

describe("Retry button", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Retry calls fetchRoutes after fetch error", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Network failure" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [{ mode: "walking", duration: { text: "5 mins" }, polyline: "x" }] }),
      });

    globalThis.fetch = fetchMock;

    const { getByText } = render(
      <OutdoorDirection onPressBack={() => {}} origin={origin} destination={destination} buildings={[]} />
    );

    const retryButton = await waitFor(() => getByText("Try Again"));

    await act(async () => {
      fireEvent.press(retryButton);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(getByText("Walking")).toBeTruthy());
  });

  it("Retry calls fetchRoutes after empty routes", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ routes: [{ mode: "transit", duration: { text: "10 mins" }, polyline: "x" }] }),
      });

    globalThis.fetch = fetchMock;

    const { getByText } = render(
      <OutdoorDirection onPressBack={() => {}} origin={origin} destination={destination} buildings={[]} />
    );

    const retryButton = await waitFor(() => getByText("Try Again"));

    await act(async () => {
      fireEvent.press(retryButton);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(getByText("Transit")).toBeTruthy());
  });

  it("Retry does not exist if endpoints are invalid", async () => {
    globalThis.fetch = jest.fn();

    const { queryByText } = render(
      <OutdoorDirection onPressBack={() => {}} origin={null} destination={null} buildings={[]} />
    );

    expect(queryByText("Try Again")).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("handleSelectRoute - segments (without MapView ref)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("pressing a route with steps decodes step polylines and calls callbacks", async () => {
    const mockOnPressBack = jest.fn();
    const mockOnSelectRoute = jest.fn();

    const mockRoutes = [
      {
        mode: "transit",
        duration: { text: "10 mins" },
        distance: { text: "1 km" },
        polyline: "FULL_ROUTE_POLYLINE",
        steps: [
          { polyline: "STEP1", type: "walk" },
          { polyline: "STEP2", type: "transit", vehicle: "bus", line: "356", from: "A", to: "B" },
        ],
      },
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={mockOnPressBack}
        onSelectRoute={mockOnSelectRoute}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Transit")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText("Transit"));
    });

    expect(polyline.decode).toHaveBeenCalledWith("STEP1");
    expect(polyline.decode).toHaveBeenCalledWith("STEP2");

    expect(mockOnSelectRoute).toHaveBeenCalledTimes(1);
    expect(mockOnPressBack).toHaveBeenCalledTimes(1);
  });

  it("step with missing polyline triggers the empty-coords branch and still decodes others", async () => {
    const mockRoutes = [
      {
        mode: "walking",
        duration: { text: "5 mins" },
        polyline: "FULL_ROUTE_POLYLINE",
        steps: [
          { polyline: null, type: "walk" },
          { polyline: "STEP_OK", type: "walk" },
        ],
      },
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Walking")).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByText("Walking"));
    });

    expect(polyline.decode).toHaveBeenCalledWith("STEP_OK");
    expect(polyline.decode).toHaveBeenCalledWith("FULL_ROUTE_POLYLINE");
    expect(polyline.decode).not.toHaveBeenCalledWith(null);
  });
});

describe("Extra render branches (coverage)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders scheduleNote when provided", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "walking",
            duration: { text: "5 mins" },
            distance: { text: "100 m" },
            polyline: "FULL_ROUTE_POLYLINE",
            scheduleNote: "Runs every 10 mins",
          },
        ],
      }),
    });

    const { getByText } = render(
      <OutdoorDirection onPressBack={() => {}} origin={origin} destination={destination} buildings={[]} />
    );

    await waitFor(() => expect(getByText("Runs every 10 mins")).toBeTruthy());
  });
});

describe("Autocomplete MAX_RESULTS coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("caps autocomplete suggestions to MAX_RESULTS (8)", async () => {
    const manyBuildings = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `Hall Extra ${i}`,
      coordinates: [{ latitude: 45 + i * 0.001, longitude: -73 - i * 0.001 }],
    }));

    const { getByTestId, queryAllByText } = render(
      <OutdoorDirection onPressBack={() => {}} buildings={manyBuildings} />
    );

    const fromInput = getByTestId("inputStartLoc");

    act(() => {
      fireEvent(fromInput, "focus");
    });

    await act(async () => {
      fireEvent.changeText(fromInput, "Hall");
    });

    await waitFor(() => {
      const items = queryAllByText(/Hall Extra/i);
      expect(items.length).toBe(8);
    });
  });
});

describe("Polyline normalization - explicit object polyline branches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete globalThis.fetch;
  });

  it("extracts polyline.encodedPolyline and polyline.points when polyline is an object", async () => {
    const mockOnSelectRoute = jest.fn();

    const mockRoutes = [
      {
        mode: "walking",
        duration: { text: "5 mins" },
        polyline: { encodedPolyline: "ENCODED_POLYLINE" },
      },
      {
        mode: "transit",
        duration: { text: "10 mins" },
        polyline: { points: "POLYLINE_POINTS_OBJ" },
      },
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ routes: mockRoutes }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        onSelectRoute={mockOnSelectRoute}
        origin={origin}
        destination={destination}
        buildings={[]}
      />
    );

    await waitFor(() => expect(getByText("Walking")).toBeTruthy());
    expect(getByText("Transit")).toBeTruthy();

    await act(async () => fireEvent.press(getByText("Walking")));
    await act(async () => fireEvent.press(getByText("Transit")));

    const call0 = mockOnSelectRoute.mock.calls[0][0];
    const call1 = mockOnSelectRoute.mock.calls[1][0];

    expect(call0.route.polyline).toBe("ENCODED_POLYLINE");
    expect(call1.route.polyline).toBe("POLYLINE_POINTS_OBJ");
  });
});

describe("Map fitToCoordinates coverage (test ref injection)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fitRouteOnMap calls mapRef.fitToCoordinates when selectedRouteCoords exist", async () => {
    const mockRef = { fitToCoordinates: jest.fn() };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [{ mode: "walking", duration: { text: "5 mins" }, polyline: "FULL_ROUTE_POLYLINE" }],
      }),
    });

    render(
      <OutdoorDirection
        onPressBack={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
        __testMapRef={mockRef}
      />
    );

    await waitFor(() => {
      expect(mockRef.fitToCoordinates).toHaveBeenCalled();
    });
  });

  it("handleSelectRoute calls mapRef.fitToCoordinates when pressing a route", async () => {
    const mockRef = { fitToCoordinates: jest.fn() };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            mode: "transit",
            duration: { text: "10 mins" },
            polyline: "FULL_ROUTE_POLYLINE",
            steps: [{ polyline: "STEP1", type: "walk" }],
          },
        ],
      }),
    });

    const { getByText } = render(
      <OutdoorDirection
        onPressBack={() => {}}
        onSelectRoute={() => {}}
        origin={origin}
        destination={destination}
        buildings={[]}
        __testMapRef={mockRef}
      />
    );

    await waitFor(() => expect(getByText("Transit")).toBeTruthy());

    await act(async () => fireEvent.press(getByText("Transit")));

    expect(mockRef.fitToCoordinates).toHaveBeenCalled();
  });
});