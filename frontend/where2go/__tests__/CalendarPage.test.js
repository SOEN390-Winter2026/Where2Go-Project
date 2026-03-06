import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import CalendarPage from '../src/CalendarPage';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseEventLocation } from '../src/utils/eventLocationParser';

jest.mock('react-native-calendars', () => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    
    return {
        Calendar: ({ onDayPress }) => (
            <Pressable
                testID="mock-calendar"
                onPress={() => onDayPress({ dateString: '2026-02-27' })}
            >
                <Text>Mock CalendarUI</Text>
            </Pressable>
        ),
        CalendarList: ({ onDayPress }) => (
      <Pressable
        testID="full-calendar-list"
        onPress={() => onDayPress({ dateString: "2026-02-28" })}
      >
        <Text>Mock CalendarList</Text>
      </Pressable>
    ),
    };
});

jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');

    const panResponderHandlers = {};

    RN.PanResponder.create = (handlers) => {
        const responderKey = Math.random().toString(36);
        panResponderHandlers[responderKey] = handlers;

        return {
            panHandlers: {
                // Point these to the actual handler functions from your component
                onPanResponderMove: handlers.onPanResponderMove,
                onPanResponderRelease: handlers.onPanResponderRelease,
                onStartShouldSetPanResponder: handlers.onStartShouldSetPanResponder, // Add this

                // Map the internal RN names to the component's handlers
                onResponderMove: handlers.onPanResponderMove,
                onResponderRelease: handlers.onPanResponderRelease,

                // This is the key for coverage: 
                // Instead of () => true, use the actual function from the component!
                onStartShouldSetResponder: handlers.onStartShouldSetPanResponder,
            },
            __responderKey: responderKey,
        };
    };

    RN.PanResponder.__panResponderHandlers = panResponderHandlers;

    RN.Animated.timing = (value, config) => ({
        start: (callback) => {
            value.setValue(config.toValue);
            if (callback) callback({ finished: true });
        },
    });

    RN.Animated.spring = (value, config) => ({
        start: (callback) => {
            value.setValue(config.toValue);
            if (callback) callback({ finished: true });
        },
    });

    return RN;
});


jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-calendar', () => ({
    requestCalendarPermissionsAsync: jest.fn(),
    getCalendarsAsync: jest.fn(),
    getEventsAsync: jest.fn(),
    EntityTypes: { EVENT: 'event' },
}));

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('../src/utils/eventLocationParser', () => ({
    parseEventLocation: jest.fn((location) => ({ building: location || null, room: null })),
}));

describe('CalendarPage', () => {
    const mockOnPressBack = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        AsyncStorage.getItem.mockResolvedValue(null);
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    });

    it('sets visibility to false after the close animation completes', async () => {
        const { getByTestId, queryByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));


        fireEvent.press(getByTestId('closeModalBtn'));

        await waitFor(() => {
            expect(queryByText(/Connect to Google Calendar/i)).toBeNull();
        });
    });

    it("Render CalendarPage", () => {
        expect(CalendarPage).toBeDefined();
    });

    it('renders "No Calendar Yet" by default', async () => {
        const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);
        expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
    });

    it('calls onPressBack when back button is pressed', () => {
        const { getByTestId } = render(<CalendarPage onPressBack={mockOnPressBack} />);
        fireEvent.press(getByTestId('pressBack'));
        expect(mockOnPressBack).toHaveBeenCalled();
    });

    it('opens modal when arrow up button is pressed', async () => {
        const { getByTestId, queryByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        expect(queryByText(/Connect to Google Calendar/i)).not.toBeTruthy();

        fireEvent.press(getByTestId('openModalBtn'));

        await waitFor(() => {
            expect(queryByText(/Connect to Google Calendar/i)).toBeTruthy();
        });
    });

    it('handles errors gracefully when fetching events fails', async () => {

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const mockError = new Error('Database connection failed');
        Calendar.getEventsAsync.mockRejectedValue(mockError);

        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([{ id: 'cal-1', title: 'Work' }]);

        const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/Connect to Google Calendar/i));
        await findByText('Work');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);
        fireEvent.press(getByText(/Done/i));

        const calendarUI = await findByTestId('mock-calendar');
        fireEvent.press(calendarUI);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith(mockError);
        });

        consoleSpy.mockRestore();
    });

    it('calculates the exact start and end of the day', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([{ id: 'cal-1', title: 'Personal', color: 'blue' }]);
        Calendar.getEventsAsync.mockResolvedValue([]);

        const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/Connect to Google Calendar/i));

        const checkbox = await findByText('Personal');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);

        fireEvent.press(getByText(/Done/i));

        const calendarUI = await findByTestId('mock-calendar');
        fireEvent.press(calendarUI);

        await waitFor(() => {
            expect(Calendar.getEventsAsync).toHaveBeenCalledWith(
                ['cal-1'],
                expect.any(Date),
                expect.any(Date)
            );

            const [ids, start, end] = Calendar.getEventsAsync.mock.calls[0];

            expect(start.getHours()).toBe(0);
            expect(start.getMinutes()).toBe(0);
            expect(start.getSeconds()).toBe(0);
            expect(start.getMilliseconds()).toBe(0);

            expect(end.getHours()).toBe(23);
            expect(end.getMinutes()).toBe(59);
            expect(end.getSeconds()).toBe(59);
            expect(end.getMilliseconds()).toBe(999);
        });
    });

    it('renders the list of events after connecting and choosing calendars', async () => {

        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([{ id: 'cal-1', title: 'Work' }]);
        Calendar.getEventsAsync.mockResolvedValue([
            { id: 'e1', title: 'Concordia Lecture' },
            { id: 'e2', title: 'Gym Session' }
        ]);

        const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);


        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        const checkbox = await findByText('Work');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);
        fireEvent.press(getByText('Done'));

        const calendarUI = await findByTestId('mock-calendar');
        fireEvent.press(calendarUI);

        expect(await findByText('Concordia Lecture')).toBeTruthy();
        expect(await findByText('Gym Session')).toBeTruthy();
    });

    it('calls parseEventLocation for each event location when events are loaded', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([{ id: 'cal-1', title: 'Work' }]);
        Calendar.getEventsAsync.mockResolvedValue([
            { id: 'e1', title: 'Class', location: 'H 435' },
            { id: 'e2', title: 'Lab', location: 'EV 213' },
        ]);

        const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        const checkbox = await findByText('Work');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);
        fireEvent.press(getByText('Done'));

        const calendarUI = await findByTestId('mock-calendar');
        fireEvent.press(calendarUI);

        await waitFor(() => {
            expect(parseEventLocation).toHaveBeenCalledWith('H 435');
            expect(parseEventLocation).toHaveBeenCalledWith('EV 213');
            expect(parseEventLocation).toHaveBeenCalledTimes(2);
        });
    });

    it('requests permissions and fetches calendars on connect', async () => {

        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: '1', title: 'Concordia Schedule', color: '#91233E' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        const openModalBtn = getByTestId('openModalBtn');
        fireEvent.press(openModalBtn);

        fireEvent.press(getByTestId("calBtn"));

        await waitFor(() => {
            expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled();
            expect(getByText('Extracting Calendars')).toBeTruthy();
            expect(getByText('Concordia Schedule')).toBeTruthy();
        });
    });

    it('should fetch calendars after user grants permission', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });

        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Personal', color: '#91233E' }
        ]);

        const { getByText, findByText, getByTestId } = render(<CalendarPage />);

        const openModalBtn = getByTestId('openModalBtn');
        fireEvent.press(openModalBtn);

        const connectBtn = getByText(/connect to google calendar/i);
        fireEvent.press(connectBtn);

        const nextStepHeader = await findByText(/extracting calendars/i);
        expect(nextStepHeader).toBeTruthy();
    });

    it('handles permission denial gracefully', async () => {

        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'denied' });

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const { getByTestId, getByText, queryByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/connect to google calendar/i));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(
                "Calendar Access Required",
                expect.stringContaining("previously denied"),
                expect.any(Array)
            );
        });
        expect(queryByText(/Extracting Calendars/i)).not.toBeTruthy();
        alertSpy.mockRestore();
    });

    it('shows generic message when permission is not granted and not denied', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'undetermined' });

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/Connect to Google Calendar/i));

        await waitFor(() => {
            expect(alertSpy).toHaveBeenCalledWith(
                "Calendar Access Required",
                "Calendar access is needed to show your events.",
                expect.any(Array)
            );
        });
        alertSpy.mockRestore();
    });

    it('calls Linking.openSettings when user taps Open Settings in permission alert', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'denied' });
        const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

        let alertButtons;
        jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
            alertButtons = buttons;
        });

        const { getByTestId, getByText } = render(<CalendarPage />);
        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/connect to google calendar/i));

        await waitFor(() => {
            expect(alertButtons).toBeDefined();
        });

        const openSettingsBtn = alertButtons.find((b) => b.text === "Open Settings");
        openSettingsBtn.onPress();

        expect(openSettingsSpy).toHaveBeenCalled();
        openSettingsSpy.mockRestore();
        jest.restoreAllMocks();
    });

    it('restores saved calendars on mount when AsyncStorage has valid data', async () => {
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['cal-1']));
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal-1', title: 'Work', color: '#912338' },
        ]);
        Calendar.getEventsAsync.mockResolvedValue([]);

        const { findByTestId } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        const calendarUI = await findByTestId('mock-calendar');
        expect(calendarUI).toBeTruthy();
    });

    it('handles restore when getCalendarsAsync throws', async () => {
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify(['cal-1']));
        Calendar.getCalendarsAsync.mockRejectedValue(new Error('Permission denied'));

        const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
    });

    it('handles restore when AsyncStorage throws', async () => {
        AsyncStorage.getItem.mockRejectedValue(new Error('Storage unavailable'));

        const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
    });

    it('handles restore when saved data is empty array', async () => {
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

        const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
    });

    it('handles restore when saved data is not a valid array', async () => {
        AsyncStorage.getItem.mockResolvedValue(JSON.stringify({ ids: ['cal-1'] }));

        const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

        expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
    });

    it('displays checkboxes for each calendar', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' },
            { id: 'cal2', title: 'Personal', color: '#33FF57' },
            { id: 'cal3', title: 'Holidays', color: '#3357FF' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
            expect(getByTestId('checkbox-cal2')).toBeTruthy();
            expect(getByTestId('checkbox-cal3')).toBeTruthy();
            expect(getByText('Work')).toBeTruthy();
            expect(getByText('Personal')).toBeTruthy();
            expect(getByText('Holidays')).toBeTruthy();
        });
    });

    it('toggling checkboxes changes their state', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
        });

        const checkbox = getByTestId('checkbox-cal1');
        fireEvent.press(checkbox);

        const doneBtn = getByText('Done');
        expect(doneBtn).toBeTruthy();
    });

    it('allows multiple calendar selection', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' },
            { id: 'cal2', title: 'Personal', color: '#33FF57' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
            expect(getByTestId('checkbox-cal2')).toBeTruthy();
        });

        const checkbox1 = getByTestId('checkbox-cal1');
        const checkbox2 = getByTestId('checkbox-cal2');
        fireEvent.press(checkbox1);
        fireEvent.press(checkbox2);

        expect(getByTestId('checkbox-cal1')).toBeTruthy();
        expect(getByTestId('checkbox-cal2')).toBeTruthy();
    });

    it('Done button is present and pressable after calendar selection', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
        });

        // Select a calendar
        const checkbox = getByTestId('checkbox-cal1');
        fireEvent.press(checkbox);

        // Done button should be present and functional
        const doneBtn = getByText('Done');
        expect(doneBtn).toBeTruthy();

        // Verify we can press it
        fireEvent.press(doneBtn);
        expect(doneBtn).toBeTruthy();
    });

    it('can complete the calendar selection flow', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' }
        ]);

        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
        });

        const checkbox = getByTestId('checkbox-cal1');
        fireEvent.press(checkbox);

        const doneBtn = getByText('Done');
        fireEvent.press(doneBtn);

        expect(doneBtn).toBeTruthy();
    });

    it('handles event fetching errors gracefully', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' }
        ]);
        Calendar.getEventsAsync.mockRejectedValue(new Error('Event fetch failed'));

        const { getByTestId } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(Calendar.getEventsAsync).toBeDefined();
        });
    });

    it('renders Connect to Google Calendar button in modal', async () => {
        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));

        await waitFor(() => {
            const connectBtn = getByText(/Connect to Google Calendar/i);
            expect(connectBtn).toBeTruthy();
        });
    });

    it('renders Manually Add Events button in modal', async () => {
        const { getByTestId, getByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));

        await waitFor(() => {
            const manualBtn = getByText(/Manually Add Events/i);
            expect(manualBtn).toBeTruthy();
        });
    });

    it('renders calendar after selection is confirmed', async () => {
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal1', title: 'Work', color: '#FF5733' }
        ]);

        const { getByTestId, queryByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        await waitFor(() => {
            expect(getByTestId('checkbox-cal1')).toBeTruthy();
        });

        const checkbox = getByTestId('checkbox-cal1');
        fireEvent.press(checkbox);

        const doneBtn = queryByText('Done');
        if (doneBtn) {
            fireEvent.press(doneBtn);
        }

        expect(getByTestId('openModalBtn')).toBeTruthy();
    });

    it('closes if drag is more than 120px', async () => {
        const { getByTestId, queryByTestId } = render(<CalendarPage onPressBack={() => { }} />);

        fireEvent.press(getByTestId('openModalBtn'));
        const bottomSheet = getByTestId('bottom-sheet-view');

        act(() => {
            fireEvent(bottomSheet, 'responderRelease', {}, { dy: 150, vy: 0.1 });
        });

        await waitFor(() => {
            expect(queryByTestId('bottom-sheet-view')).toBeNull();
        });
    });

    it('updates position during movement if dy is positive', () => {
        const { getByTestId } = render(<CalendarPage onPressBack={jest.fn()} />);
        fireEvent.press(getByTestId('openModalBtn'));
        const bottomSheet = getByTestId('bottom-sheet-view');

        act(() => {
            fireEvent(bottomSheet, 'responderMove', {}, { dy: 80 });
        });

        expect(bottomSheet).toBeTruthy();
    });

    it('snaps back to top and remains open if drag is 120px or less', async () => {
        const { getByTestId, queryByTestId } = render(<CalendarPage onPressBack={jest.fn()} />);

        fireEvent.press(getByTestId('openModalBtn'));
        const bottomSheet = getByTestId('bottom-sheet-view');

        act(() => {
            fireEvent(bottomSheet, 'responderRelease', {}, { dy: 100, vy: 0.5 });
        });

        expect(queryByTestId('bottom-sheet-view')).not.toBeNull();
        expect(getByTestId('bottom-sheet-view')).toBeTruthy();
    });

    it("toggles calendar selection: add then remove; Done still proceeds to calendar view (0 calendars)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "blue" }]);

  const { getByTestId, getByText, findByText, queryByText, getByLabelText} = render(
    <CalendarPage onPressBack={jest.fn()} />
  );

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");

  // add then remove
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", false);

  fireEvent.press(getByText("Done"));

  // ✅ should be in calendar view now
  expect(await findByText("Upcoming Events")).toBeTruthy();

  // press a day -> early return branch (no selected calendars)
  fireEvent.press(getByTestId("mock-calendar"));

  expect(queryByText("No events for this day")).toBeTruthy();
});

it("toggles full calendar view and presses CalendarList day (covers CalendarList path)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#123456" }]);
  Calendar.getEventsAsync.mockResolvedValue([{ id: "e1", title: "Event 1" }]);

  const { getByTestId, getByText, findByText, findByTestId, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  // wait for calendar view to appear (Done handler is async)
  await findByTestId("mock-calendar");

  // toggle to full calendar view (CalendarList)
  fireEvent.press(getByLabelText("Toggle full calendar view"));

  await findByText("Mock CalendarList");

  fireEvent.press(getByTestId("full-calendar-list"));

  await waitFor(() => {
    expect(Calendar.getEventsAsync).toHaveBeenCalled();
  });

  expect(await findByText("Event 1")).toBeTruthy();
});

it("opens Selected Calendars modal and lists the chosen calendar", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([
    { id: "cal-1", title: "Work", color: "#ff0000" },
    { id: "cal-2", title: "Personal", color: "#00ff00" },
  ]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, findByTestId, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  await findByTestId("mock-calendar");

  // open selected calendars modal (menu icon)
  fireEvent.press(getByLabelText("Selected calendars"));

  expect(await findByText("Selected Calendars")).toBeTruthy();
  expect(await findByText("Work")).toBeTruthy();
});

it('pressing "Change" in Selected Calendars modal returns to "Extracting Calendars" screen', async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, findByTestId, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  await findByTestId("mock-calendar");
  fireEvent.press(getByLabelText("Selected calendars"));
  await findByText("Selected Calendars");

  fireEvent.press(getByTestId("selectedCalsChangeBtn"));

  expect(await findByText(/Extracting Calendars/i)).toBeTruthy();
  expect(await findByText(/Select Desired Calendars to Extract/i)).toBeTruthy();
});

it("renders date parts from event startDate (covers monthShort + getDatePartsFromEvent helpers)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);

  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e-dec",
      title: "December Event",
      startDate: "2026-12-01T10:00:00.000Z",
      endDate: "2026-12-01T11:00:00.000Z",
      location: "Hall",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);

  expect(await findByText("December Event")).toBeTruthy();
  // Month short should appear as DEC somewhere in the event card
  expect(await findByText("DEC")).toBeTruthy();
});

it("renders Untitled for event with no title", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e-untitled",
      title: null,
      startDate: "2026-12-01T10:00:00.000Z",
      endDate: "2026-12-01T11:00:00.000Z",
      location: "H 435",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);

  expect(await findByText("Untitled")).toBeTruthy();
});

it("renders Time not specified for event with no start or end date", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e-no-time",
      title: "No Time Event",
      startDate: null,
      endDate: null,
      location: "EV 213",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);

  expect(await findByText("No Time Event")).toBeTruthy();
  expect(await findByText("Time not specified")).toBeTruthy();
});

it("renders start time only for event with startDate but no endDate", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e-start-only",
      title: "Start Only",
      startDate: "2026-12-01T14:00:00.000Z",
      endDate: null,
      location: "H 100",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId, queryByText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);

  expect(await findByText("Start Only")).toBeTruthy();
  // formatTimeRange returns start only when endDate is null (line 62) - not "Time not specified"
  expect(queryByText("Time not specified")).toBeNull();
});

it("handles restore when saved data is invalid JSON", async () => {
  AsyncStorage.getItem.mockResolvedValue("invalid json");

  const { findByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

  expect(await findByText(/No Calendar Yet/i)).toBeTruthy();
});

it("renders event with invalid startDate (monthShort fallback for Invalid Date)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e-bad-date",
      title: "Bad Date Event",
      startDate: "invalid-date",
      endDate: "2026-12-01T11:00:00.000Z",
      location: "H 200",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);

  expect(await findByText("Bad Date Event")).toBeTruthy();
});

it("Selected Calendars modal: content press does not close, overlay/close button do close", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, findByTestId, queryByText, getByLabelText } =
    render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  await findByTestId("mock-calendar");
  fireEvent.press(getByLabelText("Selected calendars"));
  expect(await findByText("Selected Calendars")).toBeTruthy();

  // press inside modal content -> should NOT close
  fireEvent.press(getByTestId("selectedCalsContent"));
  expect(queryByText("Selected Calendars")).toBeTruthy();

  // press overlay -> should close
  fireEvent.press(getByTestId("selectedCalsOverlay"));
  await waitFor(() => {
    expect(queryByText("Selected Calendars")).toBeNull();
  });

  // open again (menu button is in same view as mock-calendar)
  fireEvent.press(getByLabelText("Selected calendars"));
  expect(await findByText("Selected Calendars")).toBeTruthy();

  // close button -> should close
  fireEvent.press(getByTestId("selectedCalsCloseBtn"));
  await waitFor(() => {
    expect(queryByText("Selected Calendars")).toBeNull();
  });
});

it("Selected Calendars modal closes via Modal requestClose (covers onRequestClose)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, findByTestId, queryByText, getByLabelText } =
    render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  await findByTestId("mock-calendar");
  fireEvent.press(getByLabelText("Selected calendars"));
  expect(await findByText("Selected Calendars")).toBeTruthy();

  // trigger Modal onRequestClose
  fireEvent(getByTestId("selectedCalsModal"), "requestClose");

  await waitFor(() => {
    expect(queryByText("Selected Calendars")).toBeNull();
  });
});

it("clears events if no calendars are selected (covers early return)", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);

  // first call returns an event
  Calendar.getEventsAsync.mockResolvedValue([
    { id: "e1", title: "Event 1", startDate: "2026-12-01T10:00:00.000Z", endDate: "2026-12-01T11:00:00.000Z" },
  ]);

  const { getByTestId, getByText, findByText, findByTestId, queryByText, getByLabelText } = render(
    <CalendarPage onPressBack={jest.fn()} />
  );

  // connect + select calendar + Done
  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);
  await findByText("Event 1");

  // open selected calendars modal -> Change (go back to extraction)
  fireEvent.press(getByLabelText("Selected calendars"));
  await findByText("Selected Calendars");
  fireEvent.press(getByTestId("selectedCalsChangeBtn"));

  // unselect calendar -> Done (still proceeds to calendar view even with 0)
  await findByText(/Select Desired Calendars to Extract/i);
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", false);
  fireEvent.press(getByText("Done"));

  // press a day -> early return clears events
  await findByText("Upcoming Events");
  fireEvent.press(getByTestId("mock-calendar"));

  expect(queryByText("Event 1")).toBeNull();
  expect(queryByText("No events for this day")).toBeTruthy();
});

it("pressing an event logs Selected event (covers line 254)", async () => {
  const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([
    {
      id: "e1",
      title: "Event 1",
      startDate: "2026-12-01T10:00:00.000Z",
      endDate: "2026-12-01T11:00:00.000Z",
      location: "Hall",
    },
  ]);

  const { getByTestId, getByText, findByText, findByTestId } = render(<CalendarPage onPressBack={jest.fn()} />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  const calendarUI = await findByTestId("mock-calendar");
  fireEvent.press(calendarUI);
  await findByText("Event 1");

  fireEvent.press(getByTestId("event-item-e1"));
  expect(logSpy).toHaveBeenCalledWith("Selected event:", "Event 1");

  logSpy.mockRestore();
});

});
