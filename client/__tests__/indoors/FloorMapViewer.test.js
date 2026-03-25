import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FloorMapViewer from '../../src/FloorMapViewer';

jest.mock('indoorData', () => ({
    indoorMaps: {
        SGW: {
            H: {
                2: { image: 1, data: { rooms: [] } },
                4: { image: 2, data: null },
                5: { image: null, data: null },
            },
        },
    },
}));

const defaultProps = { campus: 'SGW', building: 'H' };

describe('FloorMapViewer', () => {

    it('shows error when building does not exist', () => {
        const { getByText } = render(<FloorMapViewer campus="SGW" building="ZZ" />);
        expect(getByText('No data for SGW – ZZ')).toBeTruthy();
    });

    it('renders floor tabs', () => {
        const { getByText } = render(<FloorMapViewer {...defaultProps} />);
        expect(getByText('Floor 2')).toBeTruthy();
        expect(getByText('Floor 4')).toBeTruthy();
        expect(getByText('Floor 5')).toBeTruthy();
    });

    it('switches floor on tab press', () => {
        const { getByText } = render(<FloorMapViewer {...defaultProps} />);
        fireEvent.press(getByText('Floor 4'));
        expect(getByText('Floor 4')).toBeTruthy();
    });

    it('shows image when floor has one', () => {
        const { UNSAFE_getByType } = render(<FloorMapViewer {...defaultProps} />);
        expect(UNSAFE_getByType(require('react-native').Image)).toBeTruthy();
    });

    it('shows placeholder when floor has no image', () => {
        const { getByText } = render(<FloorMapViewer {...defaultProps} />);
        fireEvent.press(getByText('Floor 5'));
        expect(getByText('Map coming soon')).toBeTruthy();
    });

    it('shows navigation unavailable badge when floor has no data', () => {
        const { getByText } = render(<FloorMapViewer {...defaultProps} />);
        fireEvent.press(getByText('Floor 4'));
        expect(getByText('Navigation unavailable')).toBeTruthy();
    });

    it('does not show badge when floor has data', () => {
        const { queryByText } = render(<FloorMapViewer {...defaultProps} />);
        expect(queryByText('Navigation unavailable')).toBeNull();
    });

});