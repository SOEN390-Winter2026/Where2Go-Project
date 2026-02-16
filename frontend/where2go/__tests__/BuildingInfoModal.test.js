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

  test('renders modal when visible is true', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('H')).toBeTruthy();
    expect(getByText('1455 De Maisonneuve Blvd W, Montreal, QC')).toBeTruthy();
  });


  test('returns null when building is null', () => {
    const { toJSON } = render(
      <BuildingInfoModal 
        building={null} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(toJSON()).toBeNull();
  });

  test('returns null when building is undefined', () => {
    const { toJSON } = render(
      <BuildingInfoModal 
        building={undefined} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(toJSON()).toBeNull();
  });

  test('renders building image when image exists for building code', () => {
    const { getByTestId, queryByTestId } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    expect(getByTestId('buildingImage')).toBeTruthy();
    expect(queryByTestId('imagePlaceholder')).toBeNull();
  });

  test('renders placeholder when building image does not exist', () => {
    const buildingWithoutImage = { ...mockBuilding, code: 'NONEXISTENT' };

    const { getByTestId, queryByTestId } = render(
      <BuildingInfoModal 
        building={buildingWithoutImage} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(getByTestId('imagePlaceholder')).toBeTruthy();
    expect(queryByTestId('buildingImage')).toBeNull();
  });


  test('displays building code', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(getByText('H')).toBeTruthy();
  });

  test('displays address section', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(getByText('Address')).toBeTruthy();
    expect(getByText(mockBuilding.address)).toBeTruthy();
  });

  test('displays services section with default text', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    expect(getByText('Services')).toBeTruthy();
    expect(getByText('Services info coming soon.')).toBeTruthy();

  });

  test('displays "View on Concordia.ca" link', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    expect(getByText('View on Concordia.ca')).toBeTruthy();
  });


  //interactions tests
  test('calls onClose when close button is pressed', () => {
    const { getByLabelText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    const closeButton = getByLabelText('Close');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });


  test('opens Concordia link when pressed', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    const link = getByText('View on Concordia.ca');
    fireEvent.press(link);
    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://www.concordia.ca/maps/buildings/h.html'
    );
  });

  // edge cases
  test('handles building with missing address properly', () => {
    const buildingWithoutAddress = { ...mockBuilding, address: '' };

    const { getByText } = render(
      <BuildingInfoModal 
        building={buildingWithoutAddress} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    expect(getByText('Address')).toBeTruthy();
  });

  test('handles building with long name', () => {
    const buildingWithLongName = {
      ...mockBuilding,
      name: 'St. Ignatius of Loyola Church',
    };
    const { getByText } = render(
      <BuildingInfoModal 
        building={buildingWithLongName} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );

    expect(getByText(buildingWithLongName.name)).toBeTruthy();
  });

  test('modal does not close when modal container is pressed', () => {
    const { getByText } = render(
      <BuildingInfoModal 
        building={mockBuilding} 
        visible={true} 
        onClose={mockOnClose} 
      />
    );
    const modalContent = getByText('Hall Building');
    fireEvent.press(modalContent);

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});