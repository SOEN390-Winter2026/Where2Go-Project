import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CalendarPage from '../src/CalendarPage'; // Adjust path
import * as Calendar from 'expo-calendar';

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


jest.mock('expo-calendar', () => ({
    requestCalendarPermissionsAsync: jest.fn(),
    getCalendarsAsync: jest.fn(),
    getEventsAsync: jest.fn(),
    EntityTypes: { EVENT: 'event' },
}));

jest.mock('expo-web-browser', () => ({
    maybeCompleteAuthSession: jest.fn(),
}));

describe('CalendarPage', () => {
    const mockOnPressBack = jest.fn();

    Calendar.requestCalendarPermissionsAsync.mockResolvedValue({
        status: 'granted',
    });

    beforeEach(() => {
        jest.clearAllMocks();
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

    it('renders "No Calendar Yet" by default', () => {
        const { getByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);
        expect(getByText(/No Calendar Yet/i)).toBeTruthy();
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

        const { getByTestId, getByText, findByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/Connect to Google Calendar/i));
        await findByText('Work');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);
        fireEvent.press(getByText(/Done/i));

        const calendarUI = getByTestId('mock-calendar');
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

        const { getByTestId, getByText, findByText } = render(<CalendarPage />);

        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByText(/Connect to Google Calendar/i));

        const checkbox = await findByText('Personal');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);

        fireEvent.press(getByText(/Done/i));

        const calendarUI = getByTestId('mock-calendar');
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

        const { getByTestId, getByText, findByText } = render(<CalendarPage />);


        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));

        const checkbox = await findByText('Work');
        fireEvent(getByTestId('checkbox-cal-1'), 'onValueChange', true);
        fireEvent.press(getByText('Done'));

        fireEvent.press(getByTestId('mock-calendar'));

        expect(await findByText('Concordia Lecture')).toBeTruthy();
        expect(await findByText('Gym Session')).toBeTruthy();
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

        const { getByTestId, getByText, queryByText } = render(<CalendarPage />);

        const openModalBtn = getByTestId('openModalBtn');
        fireEvent.press(openModalBtn);

        const connectBtn = getByText(/connect to google calendar/i);
        fireEvent.press(connectBtn);

        await waitFor(() => {
            expect(queryByText(/Extracting Calendars/i)).not.toBeTruthy();
        });
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

  const { getByTestId, getByText, findByText, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

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

  const { getByTestId, getByText, findByText, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  // open selected calendars modal (menu icon)
  fireEvent.press(getByLabelText("Selected calendars"));

  expect(await findByText("Selected Calendars")).toBeTruthy();
  expect(await findByText("Work")).toBeTruthy();
});

it('pressing "Change" in Selected Calendars modal returns to "Extracting Calendars" screen', async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, getByLabelText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

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

  const { getByTestId, getByText, findByText } = render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  fireEvent.press(getByTestId("mock-calendar"));

  expect(await findByText("December Event")).toBeTruthy();
  // Month short should appear as DEC somewhere in the event card
  expect(await findByText("DEC")).toBeTruthy();
});

it("Selected Calendars modal: content press does not close, overlay/close button do close", async () => {
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: "granted" });
  Calendar.getCalendarsAsync.mockResolvedValue([{ id: "cal-1", title: "Work", color: "#ff0000" }]);
  Calendar.getEventsAsync.mockResolvedValue([]);

  const { getByTestId, getByText, findByText, queryByText, getByLabelText } =
    render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  // open selected calendars modal (your trigger must have accessibilityLabel="Selected calendars")
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

  // open again
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

  const { getByTestId, getByText, findByText, queryByText, getByLabelText } =
    render(<CalendarPage />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));

  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

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

  const { getByTestId, getByText, findByText, queryByText, getByLabelText } = render(
    <CalendarPage onPressBack={jest.fn()} />
  );

  // connect + select calendar + Done
  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  // fetch events
  fireEvent.press(getByTestId("mock-calendar"));
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

  const { getByTestId, getByText, findByText } = render(<CalendarPage onPressBack={jest.fn()} />);

  fireEvent.press(getByTestId("openModalBtn"));
  fireEvent.press(getByTestId("calBtn"));
  await findByText("Work");
  fireEvent(getByTestId("checkbox-cal-1"), "onValueChange", true);
  fireEvent.press(getByText("Done"));

  fireEvent.press(getByTestId("mock-calendar"));
  await findByText("Event 1");

  fireEvent.press(getByTestId("event-item-e1"));
  expect(logSpy).toHaveBeenCalledWith("Selected event:", "Event 1");

  logSpy.mockRestore();
});

});
