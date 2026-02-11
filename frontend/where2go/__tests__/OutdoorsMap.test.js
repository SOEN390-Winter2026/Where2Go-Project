import { render, fireEvent } from '@testing-library/react-native';
import SideLeftBar from '../src/SideLeftBar.js';
import TopRightMenu from '../src/TopRightMenu.js';
import map from '../../../backend/src/services/map.js';
import { Pressable, Text } from 'react-native';
import React, { useState } from 'react';

// Jest:
// Used for testing (1) UI Components, (2) User interactions, (3) Visual Logic

//VARIABLES FOR API CALLS
const request = require('supertest');
// Assuming your Express app is exported from a file named 'app.js'
const app = require('../../../backend/src/app');

/**
 * - Campus toggle state logic
 * - Default Campus Initialization
 * - Map configuration per campus
 */

describe("Rendering Features Properly", () => {

    it("Render SideLeftBar", () => {
        expect(SideLeftBar).toBeDefined();
    });

    it("Render TopRightMenu", () => {
        expect(TopRightMenu).toBeDefined();
    });

    it("Render map", () => {
        expect(map).toBeDefined();
    });

})


describe(" Buttons Test", () => {

    function TestWrapper() {
        const [currentCampus, setCurrentCampus] = useState('SGW');

        return (
            <>
                <SideLeftBar
                    currentCampus={currentCampus}
                    onToggleCampus={() =>
                        setCurrentCampus((prev) => (prev === 'SGW' ? 'Loyola' : 'SGW'))
                    }
                />
                {/* Add text so we can assert the current campus */}
                <Text testID="campusText">{currentCampus}</Text>
            </>
        );
    }

    function TestButtoneWrapper() {
        return (
            <>
                <Pressable
                    testID="disPress"
                >

                </Pressable>

                {/* -------- POI -------- */}
                <Pressable
                    testID="pOIPress"


                >

                </Pressable>

                {/* -------- GPS -------- */}
                <Pressable
                    testID="gPSPress"

                >

                </Pressable>
            </>
        )
    }

    it("Toggle Button", () => {
        //const mockOnPress = jest.fn();

        const { getByTestId } = render(<TestWrapper />)
        const pressToggleButton = getByTestId("campusToggle");
        const currentCampus = getByTestId("campusText");

        expect(currentCampus.props.children).toBe('SGW');

        fireEvent.press(pressToggleButton);
        //expect(pressToggleButton).toHaveBeenCalled();

        expect(currentCampus.props.children).toBe('Loyola')
    });

    it("Disability Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<TestButtoneWrapper onPress={mockOnPress} />)
        const pressDisButton = getByTestId("disPress");


        fireEvent.press(pressDisButton);
        //expect(pressToggleButton).toHaveBeenCalled();


    });
})

describe("Backend Functions", () => {

    it("Check getCampusCoordinates SGW", () => {
        const campusCoordinatesSGW = map.getCampusCoordinates('SGW');

        expect(campusCoordinatesSGW).toEqual(
            {
                lat: 45.4974,
                lng: -73.5771,
            }
        )
    });

    it("Check getCampusCoordinates Loyola", () => {
        const campusCoordinatesSGW = map.getCampusCoordinates('Loyola');

        expect(campusCoordinatesSGW).toEqual(
            {
                lat: 45.4587,
                lng: -73.6409,
            }
        )
    });


})

describe("API Testing", () => {
    it("/campus/SGW", async () => {
        const response = await request(app).get('/campus/SGW');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ lat: 45.4974, lng: -73.5771 });

    });

    it("/campus/Loyola", async () => {
        const response = await request(app).get('/campus/Loyola');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            lat: 45.4587,
            lng: -73.6409,
        });

    });

    it("/campus/SGW/buildings", async () => {
        const response = await request(app).get('/campus/SGW/buildings');
        expect(response.status).toBe(200);
        expect(response.body[1]).toEqual({
            id: 'jw',
            name: 'McConnell Building',
            coordinates: [
                { latitude: 45.49734, longitude: -73.578063 },
                { latitude: 45.4968756, longitude: -73.5770947 },
                { latitude: 45.4962439, longitude: -73.5777203 },
                { latitude: 45.496684, longitude: -73.5786444 }
            ]
        });




    });

    it("/campus/Loyola/buildings", async () => {
        const response = await request(app).get('/campus/Loyola/buildings');
        expect(response.status).toBe(200);
        expect(response.body[1]).toEqual({
            id: 'pc',
            name: 'PERFORM Center',
            coordinates: [
                { latitude: 45.45728, longitude: -73.63763 },
                { latitude: 45.45695, longitude: -73.63677 },
                { latitude: 45.45668, longitude: -73.63699 },
                { latitude: 45.45702, longitude: -73.63784 },
            ],
        });
    });


})
