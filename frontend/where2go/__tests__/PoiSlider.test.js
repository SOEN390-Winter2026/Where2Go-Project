jest.mock('@env', () => ({ GOOGLE_MAPS_API_KEY: 'TEST_API_KEY' }), { virtual: true });

jest.mock('@react-native-community/slider', () => {
    const React = require('react');
    const { View } = require('react-native');
    const PropTypes = require('prop-types');
    const SliderMock = ({ onValueChange, onSlidingComplete, ...props }) => 
        React.createElement(View, { testID: 'slider', onValueChange, onSlidingComplete, ...props });
    
    SliderMock.propTypes = {
        onValueChange: PropTypes.func,
        onSlidingComplete: PropTypes.func,
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

    it('shows "From: Your location" when userLocation is set', async () => {
    const { findByText } = render(
        <PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />
    );
    expect(await findByText('From: Your location')).toBeTruthy();
    });

    it('shows no location message when both location and building are absent', () => {
        const { getByText } = render(
            <PoiSlider onPoisChange={jest.fn()} userLocation={null} selectedBuilding={null} />
        );
        expect(getByText(/No location/)).toBeTruthy();
    });

    it('does not fetch and calls onPoisChange([]) when there is no origin', async () => {
        const onPoisChange = jest.fn();
        render(<PoiSlider onPoisChange={onPoisChange} userLocation={null} selectedBuilding={null} />);
        await waitFor(() => expect(onPoisChange).toHaveBeenCalledWith([]));
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('fetches once per POI type on mount and returns results', async () => {
        const onPoisChange = jest.fn();
        render(<PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />);
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());
        expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    });

    it('updates displayed radius while sliding without triggering a fetch', async () => {
        const onPoisChange = jest.fn();
        const { getByTestId, getByText } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());
        const callsBefore = globalThis.fetch.mock.calls.length;
        act(() => { fireEvent(getByTestId('slider'), 'onValueChange', 300); });
        expect(getByText('Radius Range: 300 m')).toBeTruthy();
        expect(globalThis.fetch.mock.calls.length).toBe(callsBefore);
    });

    it('triggers a new fetch only on onSlidingComplete', async () => {
        const onPoisChange = jest.fn();
        const { getByTestId } = render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());
        const callsBefore = globalThis.fetch.mock.calls.length;
        await act(async () => { fireEvent(getByTestId('slider'), 'onSlidingComplete', 500); });
        await waitFor(() => expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('shows error message when the API returns an error status', async () => {
        globalThis.fetch = jest.fn(() => makeFetchResponse([], 'REQUEST_DENIED'));
        const { findByText } = render(
        <   PoiSlider onPoisChange={jest.fn()} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
        expect(await findByText('Could not load points of interest.')).toBeTruthy();
    });

    it('handles ZERO_RESULTS without showing an error', async () => {
        globalThis.fetch = jest.fn(() => makeFetchResponse([], 'ZERO_RESULTS'));
        const onPoisChange = jest.fn();
        const { queryByText } = render(
        <PoiSlider onPoisChange={onPoisChange} userLocation={USER_LOCATION} selectedBuilding={null} />
        );
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
        render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={null} selectedBuilding={building} />
        );
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());

        const calledUrl = globalThis.fetch.mock.calls[0][0];
        //calculating the correct values that should be displayed: lat = (45.490 + 45.500)/ 2 = 45.495
        //lng = (-73.570 + -73.580)/ 2 = -73.575
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
        render(
            <PoiSlider onPoisChange={onPoisChange} userLocation={null} selectedBuilding={building} />
        );
        await waitFor(() => expect(onPoisChange).toHaveBeenCalled());

        const calledUrl = globalThis.fetch.mock.calls[0][0];
        expect(calledUrl).toContain("location=45.4955,-73.578");
    });
});