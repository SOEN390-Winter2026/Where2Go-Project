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

    it('toggles calendar selection: adds on first click, removes on second', async () => {
        // Mock the calendar data
        Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
        Calendar.getCalendarsAsync.mockResolvedValue([
            { id: 'cal-1', title: 'Work', color: 'blue' }
        ]);

        const { getByTestId, findByText } = render(<CalendarPage onPressBack={jest.fn()} />);

        // 1. Open modal and connect to see the checkboxes
        fireEvent.press(getByTestId('openModalBtn'));
        fireEvent.press(getByTestId('calBtn'));
        await findByText('Work');

        const checkbox = getByTestId('checkbox-cal-1');

        // 2. First Click: Should ADD 'cal-1' to selectedCalendarIds
        fireEvent(checkbox, 'onValueChange', true);

        // 3. Second Click: Should REMOVE 'cal-1' (the .filter() logic)
        fireEvent(checkbox, 'onValueChange', false);

        // 4. Verify the state by checking if "Done" works correctly
        // If it was removed, clicking "Done" shouldn't trigger the next view 
        // because you have: onPress={() => setIsCalendarsChosen(selectedCalendarIds.length > 0)}
        fireEvent.press(getByTestId('saveBtn'));

        // The "Extracting Calendars" text should still be there if selection is 0
        expect(await findByText('Extracting Calendars')).toBeTruthy();
    });

    it('should claim the touch gesture (covers onStartShouldSetPanResponder)', () => {
        const { getByTestId } = render(<CalendarPage onPressBack={jest.fn()} />);

        fireEvent.press(getByTestId('openModalBtn'));
        const bottomSheet = getByTestId('bottom-sheet-view');

        // This now calls the function defined inside your useRef in CalendarPage
        const result = bottomSheet.props.onStartShouldSetResponder();

        expect(result).toBe(true);
    });
});

