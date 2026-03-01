import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import BuildingInfoModal from '../src/BuildingInfoModal';

beforeAll(() => {
    jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
});

beforeEach(() => {
    jest.clearAllMocks();
});

afterAll(() => {
    jest.restoreAllMocks();
});

describe('BuildingInfoModal', () => {
  const mockBuilding = {
    id: 'h',
    name: 'Hall Building',
    code: 'H',
    address: '1455 De Maisonneuve Blvd W, Montreal, QC',
    link: 'https://www.concordia.ca/maps/buildings/h.html',
    coordinates: [
      { latitude: 45.497, longitude: -73.579 },
    ],
  };

  const mockOnClose = jest.fn();
  const mockOnSetDeparture = jest.fn();
  const mockOnSetDestination = jest.fn();

  const buildingModal = (overrides = {}) => render(
    <BuildingInfoModal
      building={mockBuilding}
      visible={true}
      onClose={mockOnClose}
      onSetDeparture={mockOnSetDeparture}
      onSetDestination={mockOnSetDestination}
      selectedRole={null}
      {...overrides}
    />
  );

  test('renders modal when visible is true', () => {
    const { getByText } = buildingModal();
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('H')).toBeTruthy();
    expect(getByText('1455 De Maisonneuve Blvd W, Montreal, QC')).toBeTruthy();
  });

  test('returns null when building is null', () => {
    const { toJSON } = buildingModal({ building: null });
    expect(toJSON()).toBeNull();
  });

  test('returns null when building is undefined', () => {
    const { toJSON } = buildingModal({ building: undefined });
    expect(toJSON()).toBeNull();
  });

  test('renders building image when image exists for building code', () => {
    const { getByTestId, queryByTestId } = buildingModal();
    expect(getByTestId('buildingImage')).toBeTruthy();
    expect(queryByTestId('imagePlaceholder')).toBeNull();
  });

  test('renders placeholder when building image does not exist', () => {
    const { getByTestId, queryByTestId } = buildingModal({ building: { ...mockBuilding, code: 'NONEXISTENT' } });
    expect(getByTestId('imagePlaceholder')).toBeTruthy();
    expect(queryByTestId('buildingImage')).toBeNull();
  });

  test('displays building code', () => {
    const { getByText } = buildingModal();
    expect(getByText('H')).toBeTruthy();
  });

  test('displays address section', () => {
    const { getByText } = buildingModal();
    expect(getByText('Address')).toBeTruthy();
    expect(getByText(mockBuilding.address)).toBeTruthy();
  });

  test('displays services section with default text', () => {
    const { getByText } = buildingModal();
    expect(getByText('Services')).toBeTruthy();
    expect(getByText('Services info coming soon.')).toBeTruthy();
  });

  test('displays "View on Concordia.ca" link', () => {
    const { getByText } = buildingModal();
    expect(getByText('View on Concordia.ca')).toBeTruthy();
  });

  test('displays both buttons for departure/destination', () => {
    const { getByText } = buildingModal();
    expect(getByText('Set as Departure')).toBeTruthy();
    expect(getByText('Set as Destination')).toBeTruthy();
  });

  // interactions tests
  test('calls onClose when close button is pressed', () => {
    const { getByLabelText } = buildingModal();
    const closeButton = getByLabelText('Close');
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('opens Concordia link when pressed', () => {
    const { getByText } = buildingModal();
    const link = getByText('View on Concordia.ca');
    fireEvent.press(link);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.concordia.ca/maps/buildings/h.html'
    );
  });

  test('calls onSetDestination when destination btn is pressed', () => {
    const { getByText } = buildingModal();
    fireEvent.press(getByText('Set as Destination'));
    expect(mockOnSetDestination).toHaveBeenCalledWith(mockBuilding);
  });

  test('calls onSetDeparture when departure btn is pressed', () => {
    const { getByText } = buildingModal();
    fireEvent.press(getByText('Set as Departure'));
    expect(mockOnSetDeparture).toHaveBeenCalledWith(mockBuilding);
  });

  // edge cases
  test('handles building with missing address properly', () => {
    const { getByText } = buildingModal({ building: { ...mockBuilding, address: '' } });
    expect(getByText('Address')).toBeTruthy();
  });

  test('handles building with long name', () => {
    const buildingWithLongName = { ...mockBuilding, name: 'St. Ignatius of Loyola Church' };
    const { getByText } = buildingModal({ building: buildingWithLongName });
    expect(getByText(buildingWithLongName.name)).toBeTruthy();
  });

  test('modal does not close when modal container is pressed', () => {
    const { getByText } = buildingModal();
    const modalContent = getByText('Hall Building');
    fireEvent.press(modalContent);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  test('shows cancel button with departure label when selectedRole is departure', () => {
    const { getByText, queryByText } = buildingModal({ selectedRole: 'departure' });
    expect(getByText('Selected as Departure. Press again to cancel.')).toBeTruthy();
    expect(queryByText('Set as Departure')).toBeNull();
    expect(queryByText('Set as Destination')).toBeNull();
  });

  test('shows cancel button with destination label when selectedRole is destination', () => {
    const { getByText, queryByText } = buildingModal({ selectedRole: 'destination' });
    expect(getByText('Selected as Destination. Press again to cancel.')).toBeTruthy();
    expect(queryByText('Set as Departure')).toBeNull();
    expect(queryByText('Set as Destination')).toBeNull();
  });

  test('calls onSetDeparture with null when cancel is pressed on departure role', () => {
    const { getByText } = buildingModal({ selectedRole: 'departure' });
    fireEvent.press(getByText('Selected as Departure. Press again to cancel.'));
    expect(mockOnSetDeparture).toHaveBeenCalledWith(null);
  });

  test('calls onSetDestination with null when cancel is pressed on destination role', () => {
    const { getByText } = buildingModal({ selectedRole: 'destination' });
    fireEvent.press(getByText('Selected as Destination. Press again to cancel.'));
    expect(mockOnSetDestination).toHaveBeenCalledWith(null);
  });
});