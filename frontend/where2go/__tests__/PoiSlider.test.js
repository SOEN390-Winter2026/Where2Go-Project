jest.mock('@env', () => ({ GOOGLE_MAPS_API_KEY: 'TEST_API_KEY' }), { virtual: true });

jest.mock('@react-native-community/slider', () => {
    const React = require('react');
    const { View } = require('react-native');
    const PropTypes = require('prop-types');
    const SliderMock = ({ onValueChange, ...props }) => 
        React.createElement(View, { testID: 'slider', onValueChange, ...props });
    
    SliderMock.propTypes = {
        onValueChange: PropTypes.func,
    };
    return SliderMock;
});

const makeFetchResponse = (results, status = 'OK') =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ status, results }) });

const USER_LOCATION = { latitude: 45.497, longitude: -73.577 };
const MOCK_RESULTS = [
  { place_id: 'p1', name: 'Place 1', geometry: { location: { lat: 45.5, lng: -73.5 } } },
];

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PoiSlider from '../src/PoiSlider';

describe('PoiSlider', () => {
  beforeEach(() => { globalThis.fetch = jest.fn(() => makeFetchResponse(MOCK_RESULTS)); });
  afterEach(() => { jest.clearAllMocks(); });

    it('shows "From: Your location" when userLocation is set', () => {
        const { getByText } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        expect(getByText('From: Your location')).toBeTruthy();
    });

    it('shows no location message when both location and building are absent', () => {
        const { getByText } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={null} selectedBuilding={null} />
        );
        expect(getByText(/No location/)).toBeTruthy();
    });

    it('does not fetch on mount', () => {
        render(<PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />);
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('Load button is disabled when there is no origin', () => {
        const { getByTestId } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={null} selectedBuilding={null} />
        );
        expect(getByTestId('loadButton').props.accessibilityState?.disabled ?? 
               getByTestId('loadButton').props.disabled).toBeTruthy();
    });

    it('fetches once per POI type when Load is pressed', async () => {
        const onPoisChange = jest.fn();
        const { getByTestId } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        await act(async () => { fireEvent.press(getByTestId('loadButton')); });
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());
        expect(globalThis.fetch).toHaveBeenCalledTimes(5); // one per POI_TYPE
    });

    it('updates displayed radius while sliding without triggering a fetch', () => {
        const { getByTestId, getByText } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        act(() => { fireEvent(getByTestId('slider'), 'onValueChange', 300); });
        expect(getByText('Radius Range: 300 m')).toBeTruthy();
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('shows error message when the API returns an error status', async () => {
        globalThis.fetch = jest.fn(() => makeFetchResponse([], 'REQUEST_DENIED'));
        const { getByTestId, findByText } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        await act(async () => { fireEvent.press(getByTestId('loadButton')); });
        expect(await findByText('Could not load points of interest.')).toBeTruthy();
    });

    it('handles ZERO_RESULTS without showing an error', async () => {
        globalThis.fetch = jest.fn(() => makeFetchResponse([], 'ZERO_RESULTS'));
        const onPoisChange = jest.fn();
        const { getByTestId, queryByText } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        await act(async () => { fireEvent.press(getByTestId('loadButton')); });
        await waitFor(() => expect(onPoisChange).toHaveBeenCalledWith([]));
        expect(queryByText('Could not load points of interest.')).toBeNull();
    });

    it("uses building coordinates as fetch origin", async () => {
        const onPoisChange = jest.fn();
        const building = {
            name: "Hall Building",
            coordinates: [
                { latitude: 45.49, longitude: -73.57 },
                { latitude: 45.5, longitude: -73.58 },
            ],
        };
        const { getByTestId } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={null} selectedBuilding={building} />
        );
        await act(async () => { fireEvent.press(getByTestId('loadButton')); });
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());

        const calledUrl = globalThis.fetch.mock.calls[0][0];
        expect(calledUrl).toContain("location=45.49");
        expect(calledUrl).toContain("-73.57");
    });

    it("uses lat/lng on building when coordinates are not there", async () => {
        const onPoisChange = jest.fn();
        const building = {
            name: "EV Building",
            latitude: 45.4955,
            longitude: -73.578,
        };
        const { getByTestId } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={null} selectedBuilding={building} />
        );
        await act(async () => { fireEvent.press(getByTestId('loadButton')); });
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());

        const calledUrl = globalThis.fetch.mock.calls[0][0];
        expect(calledUrl).toContain("location=45.4955,-73.578");
    });
});