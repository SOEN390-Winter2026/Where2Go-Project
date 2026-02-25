jest.mock('@env', () => ({ GOOGLE_MAPS_API_KEY: 'TEST_API_KEY' }), { virtual: true });
jest.mock('../src/utils/placePhotoUrl', () => ({ getPlacePhotoUrl: jest.fn(() => null) }));
jest.mock('../src/theme/colors', () => ({ colors: { primary: '#912338' } }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PoiInfoModal from '../src/PoiInfoModal';

const POI = {
    place_id: 'place_001',
    name: 'Test Restaurant',
    vicinity: '123 Test Street',
    rating: 4.5,
    user_ratings_total: 200,
    price_level: 2,
    photos: [{ photo_reference: 'ref_abc' }],
    geometry: { location: { lat: 45.497, lng: -73.577 } },
};

describe('PoiInfoModal', () => {
    it('renders nothing when poi is null', () => {
        const { toJSON } = render(<PoiInfoModal poi={null} visible={true} onClose={jest.fn()} />);
        expect(toJSON()).toBeNull();
    });

    it('displays POI name, rating, price level and address', () => {
        const { getByText } = render(<PoiInfoModal poi={POI} visible={true} onClose={jest.fn()} />);
        expect(getByText('Test Restaurant')).toBeTruthy();
        expect(getByText(/4\.5/)).toBeTruthy();
        expect(getByText('$$')).toBeTruthy();
        expect(getByText('123 Test Street')).toBeTruthy();
    });

    it('shows fallback text when address is missing', () => {
        const { getByText } = render(
            <PoiInfoModal poi={{ place_id: 'x', name: 'No Address' }} visible={true} onClose={jest.fn()} />
        );
        expect(getByText('Address not available')).toBeTruthy();
    });

    it('calls onClose when close is pressed', () => {
        const onClose = jest.fn();
        const { getByText } = render(<PoiInfoModal poi={POI} visible={true} onClose={onClose} />);
        fireEvent.press(getByText('Close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onSetAsDestination when the button is pressed', () => {
        const onSetAsDestination = jest.fn();
        const { getByText } = render(
            <PoiInfoModal poi={POI} visible={true} onClose={jest.fn()} onSetAsDestination={onSetAsDestination} />
        );
        fireEvent.press(getByText('Set as destination'));
        expect(onSetAsDestination).toHaveBeenCalledTimes(1);
    });

    it('renders an image when there is one available', () => {
        const { getPlacePhotoUrl } = require('../src/utils/placePhotoUrl');
        getPlacePhotoUrl.mockReturnValueOnce('https://example.com/photo.jpg');
        const { UNSAFE_getByType } = render(
            <PoiInfoModal poi={POI} visible={true} onClose={jest.fn()} />
        );
        const image = UNSAFE_getByType(require('react-native').Image);
        expect(image.props.source).toEqual({ uri: 'https://example.com/photo.jpg' });
    });

});