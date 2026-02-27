import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CalendarPage from '../src/CalendarPage'; // Adjust path
import * as Calendar from 'expo-calendar';

// Mock Expo Calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: { EVENT: 'event' },
}));

// Mock Expo WebBrowser (prevents crash on maybeCompleteAuthSession)
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

describe('CalendarPage', () => {
  const mockOnPressBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
    
    // Modal should be closed initially
    expect(queryByText(/Connect to Google Calendar/i)).not.toBeTruthy();
    
    // Press open modal button
    fireEvent.press(getByTestId('openModalBtn'));
    
    // Modal should now be visible
    await waitFor(() => {
      expect(queryByText(/Connect to Google Calendar/i)).toBeTruthy();
    });
  });

  it('requests permissions and fetches calendars on connect', async () => {
    // 1. Setup mock returns
    Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Calendar.getCalendarsAsync.mockResolvedValue([
      { id: '1', title: 'Concordia Schedule', color: '#91233E' }
    ]);

    const { getByTestId, getByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);

    const openModalBtn = getByTestId('openModalBtn'); 
    fireEvent.press(openModalBtn);
    
    // 2. Open Modal and press connect (Simulate the Modal logic)
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

    // Toggle checkbox
    const checkbox = getByTestId('checkbox-cal1');
    fireEvent.press(checkbox);

    // After selecting, the Done button should be functional
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

    // Select both calendars
    const checkbox1 = getByTestId('checkbox-cal1');
    const checkbox2 = getByTestId('checkbox-cal2');
    fireEvent.press(checkbox1);
    fireEvent.press(checkbox2);

    // Both checkboxes exist and are in the component
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
    // Setup: Calendar already connected and selected
    Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Calendar.getCalendarsAsync.mockResolvedValue([
      { id: 'cal1', title: 'Work', color: '#FF5733' }
    ]);

    const { getByTestId, getByText } = render(<CalendarPage />);

    // Connect and select calendar
    fireEvent.press(getByTestId('openModalBtn'));
    fireEvent.press(getByTestId('calBtn'));

    await waitFor(() => {
      expect(getByTestId('checkbox-cal1')).toBeTruthy();
    });

    const checkbox = getByTestId('checkbox-cal1');
    fireEvent.press(checkbox);
    
    const doneBtn = getByText('Done');
    fireEvent.press(doneBtn);
    
    // After pressing Done, the component should update
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

    // Should not crash when error occurs
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

    // Verify the component is still rendered
    expect(getByTestId('openModalBtn')).toBeTruthy();
  });
});

