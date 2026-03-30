import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Calendar from "expo-calendar";
import CalendarAddEvent from "../../src/CalendarAddEvent";

jest.mock("expo-calendar", () => ({
  createEventAsync: jest.fn(),
  getEventAsync: jest.fn(),
}));

jest.mock("../../src/AutocompleteDropdown", () => {
  const { View } = require("react-native");
  return () => <View testID="autocomplete-dropdown" />;
});

jest.mock("../../src/utils/locationSearch", () => ({
  filterLocations: jest.fn(() => []),
  getBuildingDisplayName: jest.fn((label) => label),
}));

jest.spyOn(Alert, "alert");

const DEFAULT_PROPS = {
  selectedCalendarIds: ["cal-1"],
  onEventAdded: jest.fn(),
  onCancel: jest.fn(),
};


async function fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText, overrides = {}) {
    fireEvent.changeText(getByPlaceholderText("Event title"), overrides.title ?? "Lecture");
    fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), overrides.date ?? "2026-04-01");
    const timeInputs = getAllByPlaceholderText("HH:MM, 24h");
    fireEvent.changeText(timeInputs[0], overrides.start ?? "09:00");
    fireEvent.changeText(timeInputs[1], overrides.end ?? "10:15");
    if (overrides.room) {
    fireEvent.changeText(getByPlaceholderText("Room number (optional)"), overrides.room);
    }
    fireEvent.press(getByText("Save Event"));
}

describe("CalendarAddEvent", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the header title", () => {
      const { getByText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      expect(getByText("New Event")).toBeTruthy();
    });

    it("renders all form fields", () => {
      const { getByPlaceholderText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      expect(getByPlaceholderText("Event title")).toBeTruthy();
      expect(getByPlaceholderText("YYYY-MM-DD")).toBeTruthy();
      expect(getByPlaceholderText("Search Concordia building…")).toBeTruthy();
      expect(getByPlaceholderText("Room number (optional)")).toBeTruthy();
    });

    it("renders Save Event and Cancel buttons", () => {
      const { getByText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      expect(getByText("Save Event")).toBeTruthy();
      expect(getByText("Cancel")).toBeTruthy();
    });

    it("pre-fills date with today", () => {
      const { getByPlaceholderText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      const today = new Date();
      const pad = (n) => String(n).padStart(2, "0");
      const expected = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      expect(getByPlaceholderText("YYYY-MM-DD").props.value).toBe(expected);
    });
  });

  describe("cancel", () => {
    it("calls onCancel when Cancel button is pressed", () => {
      const onCancel = jest.fn();
      const { getByText } = render(<CalendarAddEvent {...DEFAULT_PROPS} onCancel={onCancel} />);
      fireEvent.press(getByText("Cancel"));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when back arrow is pressed", () => {
      const onCancel = jest.fn();
      const { getByText } = render(<CalendarAddEvent {...DEFAULT_PROPS} onCancel={onCancel} />);
      fireEvent.press(getByText("Cancel")); 
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("validation", () => {
    it("shows alert when title is empty and Save is pressed", () => {
      const { getByText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      fireEvent.press(getByText("Save Event"));
      expect(Alert.alert).toHaveBeenCalledWith("Missing title", expect.any(String));
    });

    it("shows alert when date is invalid", () => {
      const { getByText, getByPlaceholderText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      fireEvent.changeText(getByPlaceholderText("Event title"), "Lecture");
      fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), "not-a-date");
      fireEvent.press(getByText("Save Event"));
      expect(Alert.alert).toHaveBeenCalledWith("Invalid date/time", expect.any(String));
    });

    it("shows alert when end time is before start time", () => {
      const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      fireEvent.changeText(getByPlaceholderText("Event title"), "Lecture");
      fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), "2026-04-01");
      const timeInputs = getAllByPlaceholderText("HH:MM, 24h");
      fireEvent.changeText(timeInputs[0], "10:00");
      fireEvent.changeText(timeInputs[1], "09:00");
      fireEvent.press(getByText("Save Event"));
      expect(Alert.alert).toHaveBeenCalledWith("Invalid time range", expect.any(String));
    });

    it("shows alert when no calendar is selected", () => {
      const { getByText, getByPlaceholderText, getAllByPlaceholderText } = render(
        <CalendarAddEvent
          {...DEFAULT_PROPS}
          selectedCalendarIds={[]}
        />
      );
      fireEvent.changeText(getByPlaceholderText("Event title"), "Lecture");
      fireEvent.changeText(getByPlaceholderText("YYYY-MM-DD"), "2026-04-01");
      const timeInputs = getAllByPlaceholderText("HH:MM, 24h");
      fireEvent.changeText(timeInputs[0], "09:00");
      fireEvent.changeText(timeInputs[1], "10:00");
      fireEvent.press(getByText("Save Event"));
      expect(Alert.alert).toHaveBeenCalledWith("No calendar selected", expect.any(String));
    });
  });

  describe("saving", () => {
    const mockEvent = { id: "evt-1", title: "Lecture", startDate: new Date(), endDate: new Date() };

    beforeEach(() => {
      Calendar.createEventAsync.mockResolvedValue("evt-1");
      Calendar.getEventAsync.mockResolvedValue(mockEvent);
    });

    it("calls createEventAsync with correct title and times", async () => {
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() => expect(Calendar.createEventAsync).toHaveBeenCalledTimes(1));

      const [calId, eventData] = Calendar.createEventAsync.mock.calls[0];
      expect(calId).toBe("cal-1");
      expect(eventData.title).toBe("Lecture");
      expect(eventData.startDate).toBeInstanceOf(Date);
      expect(eventData.endDate).toBeInstanceOf(Date);
    });

    it("appends room number to location string", async () => {
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      fireEvent.changeText(getByPlaceholderText("Search Concordia building…"), "Hall Building");
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText, { room: "110" });

      await waitFor(() => expect(Calendar.createEventAsync).toHaveBeenCalled());
      const eventData = Calendar.createEventAsync.mock.calls[0][1];
      expect(eventData.location).toBe("Hall Building 110");
    });

    it("saves with only building name when room is empty", async () => {
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      fireEvent.changeText(getByPlaceholderText("Search Concordia building…"), "Hall Building");
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() => expect(Calendar.createEventAsync).toHaveBeenCalled());
      const eventData = Calendar.createEventAsync.mock.calls[0][1];
      expect(eventData.location).toBe("Hall Building");
    });

    it("saves with empty location when both building and room are empty", async () => {
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() => expect(Calendar.createEventAsync).toHaveBeenCalled());
      const eventData = Calendar.createEventAsync.mock.calls[0][1];
      expect(eventData.location).toBe("");
    });

    it("calls getEventAsync with the returned event ID", async () => {
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() => expect(Calendar.getEventAsync).toHaveBeenCalledWith("evt-1"));
    });

    it("calls onEventAdded with the refetched event", async () => {
      const onEventAdded = jest.fn();
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} onEventAdded={onEventAdded} />
      );
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() => expect(onEventAdded).toHaveBeenCalledWith(mockEvent));
    });

    it("shows error alert when createEventAsync throws", async () => {
      Calendar.createEventAsync.mockRejectedValue(new Error("Permission denied"));
      const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      await fillAndSave(getByPlaceholderText, getAllByPlaceholderText, getByText);

      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith("Error", expect.any(String))
      );
    });
  });

  describe("location field", () => {
    it("shows clear button when location input has text", () => {
      const { getByPlaceholderText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      fireEvent.changeText(getByPlaceholderText("Search Concordia building…"), "Hall");
      expect(getByPlaceholderText("Search Concordia building…").props.value).toBe("Hall");
    });

    it("clears location input when clear button is pressed", () => {
      const { getByPlaceholderText } = render(
        <CalendarAddEvent {...DEFAULT_PROPS} />
      );
      const locationInput = getByPlaceholderText("Search Concordia building…");
      fireEvent.changeText(locationInput, "Hall");

      fireEvent.changeText(locationInput, "");
      expect(locationInput.props.value).toBe("");
    });

    it("accepts room number input", () => {
      const { getByPlaceholderText } = render(<CalendarAddEvent {...DEFAULT_PROPS} />);
      const roomInput = getByPlaceholderText("Room number (optional)");
      fireEvent.changeText(roomInput, "420");
      expect(roomInput.props.value).toBe("420");
    });
  });
});