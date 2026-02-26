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

  it('requests permissions and fetches calendars on connect', async () => {
    // 1. Setup mock returns
    Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Calendar.getCalendarsAsync.mockResolvedValue([
      { id: '1', title: 'Concordia Schedule', color: '#91233E' }
    ]);

    const { getByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);
    
    // 2. Open Modal and press connect (Simulate the Modal logic)
    fireEvent.press(getByText(/Connect to Google Calendar/i));

    await waitFor(() => {
      expect(Calendar.requestCalendarPermissionsAsync).toHaveBeenCalled();
      expect(getByText('Extracting Calendars')).toBeTruthy();
      expect(getByText('Concordia Schedule')).toBeTruthy();
    });
  });

  it('does not allow "Done" if no calendars are selected', async () => {
    // Manually setting state for this test case
    Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Calendar.getCalendarsAsync.mockResolvedValue([{ id: '1', title: 'Test Cal' }]);

    const { getByText, queryByText } = render(<CalendarPage onPressBack={mockOnPressBack} />);
    
    fireEvent.press(getByText(/Connect to Google Calendar/i));
    
    await waitFor(() => {
      const doneBtn = getByText('Done');
      fireEvent.press(doneBtn);
      // Logic: length > 0. Since we didn't check the box, it shouldn't move to state 3
      expect(queryByText('Upcoming Events:')).toBeNull();
    });
  });
});