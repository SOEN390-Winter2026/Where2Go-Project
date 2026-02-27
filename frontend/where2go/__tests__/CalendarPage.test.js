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
  // 1. Mock the Calendar module to say "Permission Granted"
  Calendar.requestCalendarPermissionsAsync.mockResolvedValue({ status: 'granted' });
  
  // 2. Mock some dummy calendars to return
  Calendar.getCalendarsAsync.mockResolvedValue([
    { id: 'cal1', title: 'Personal', color: '#91233E' }
  ]);

  const { getByText, findByText, getByTestId } = render(<CalendarPage />);

  const openModalBtn = getByTestId('openModalBtn'); 
    fireEvent.press(openModalBtn);

  // 3. Find the button using that Case-Insensitive Regex
  const connectBtn = getByText(/connect to google calendar/i);
  fireEvent.press(connectBtn);

  // 4. Check if the code proceeded to the next step
  // We use findByText (async) because the UI takes a moment to update
  const nextStepHeader = await findByText(/extracting calendars/i);
  expect(nextStepHeader).toBeTruthy();
});
});

