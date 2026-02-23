import { act, render, fireEvent } from '@testing-library/react-native';
import SideLeftBar from '../src/SideLeftBar.js';
import TopRightMenu from '../src/TopRightMenu.js';
import { Pressable, Text } from 'react-native';
import React, { useState } from 'react';

//mocking backend
const map = {
    getCampusCoordinates: (name) => {
        const campuses = {
        SGW: { lat: 45.4974, lng: -73.5771 },
        Loyola: { lat: 45.4587, lng: -73.6409 },
        };
        return campuses[name] || null;
    },
    getBuildings: (name) => [],
};

jest.mock('supertest', () => () => ({
    get: jest.fn().mockResolvedValue({ status: 200, body: {} }),
}));

let fetchSpy;
beforeAll(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(jest.fn());
});

afterEach(() => {
  fetchSpy.mockReset();
});

afterAll(() => {
  fetchSpy.mockRestore();
});

afterAll(async () => {
    //close any open connections
    await new Promise(resolve => setTimeout(resolve, 500));
});

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

    it("Toggle Button", async () => {
        const { getByTestId } = render(<TestWrapper />);
        
        const pressToggleButton = getByTestId("campusToggle");
        const currentCampus = getByTestId("campusText");

        expect(currentCampus.props.children).toBe('SGW');

        await act(async () => {
            fireEvent.press(pressToggleButton);
        });

        expect(currentCampus.props.children).toBe('Loyola');
    }, 15000);

    it("Disability Button", () => {
        const mockOnPress = jest.fn();

        const { getByTestId } = render(<TestButtoneWrapper onPress={mockOnPress} />)
        const pressDisButton = getByTestId("disPress");

        fireEvent.press(pressDisButton);
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

    const sgwBuildings = [
        {
            id: 'hall',
            code: 'H',
            name: 'Hall Building',
            address: '1455 De Maisonneuve Blvd W, Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/h.html',
            coordinates: [
                { latitude: 45.4977303, longitude: -73.5790279 },
                { latitude: 45.4973808, longitude: -73.5783087 },
                { latitude: 45.4968633, longitude: -73.57891 },
                { latitude: 45.497163, longitude: -73.5795962 },
            ],
        },
        {
            id: 'jw',
            code: 'JW',
            name: 'McConnell Building',
            address: '1400 De Maisonneuve Blvd W, Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/jw.html',
            coordinates: [
                { latitude: 45.49734, longitude: -73.578063 },
                { latitude: 45.4968756, longitude: -73.5770947 },
                { latitude: 45.4962439, longitude: -73.5777203 },
                { latitude: 45.496684, longitude: -73.5786444 },
            ],
        },
    ];

    const loyolaBuildings = [
        {
            id: 'do',
            code: 'DO',
            name: 'Stinger Dome (seasonal)',
            address: '7141 Sherbrooke St. W., Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/do.html',
            coordinates: [
                { latitude: 45.45834, longitude: -73.63596 },
                { latitude: 45.45793, longitude: -73.63524 },
                { latitude: 45.45697, longitude: -73.63636 },
                { latitude: 45.45738, longitude: -73.63708 },
            ],
        },
        {
            id: 'pc',
            code: 'PC',
            name: 'PERFORM Centre',
            address: '7200 Sherbrooke St. W., Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/pc.html',
            coordinates: [
                { latitude: 45.45728, longitude: -73.63763 },
                { latitude: 45.45695, longitude: -73.63677 },
                { latitude: 45.45668, longitude: -73.63699 },
                { latitude: 45.45702, longitude: -73.63784 },
            ],
        },
    ];

    it("/campus/SGW", async () => {
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ lat: 45.4974, lng: -73.5771 }),
        });
        const response = await fetch('http://localhost:3000/campus/SGW');
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body).toEqual({ lat: 45.4974, lng: -73.5771 });
    });

    it("/campus/Loyola", async () => {
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ lat: 45.4587, lng: -73.6409 }),
        });
        const response = await fetch('http://localhost:3000/campus/Loyola');
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body).toEqual({ lat: 45.4587, lng: -73.6409 });
    });

    it("/campus/SGW/buildings", async () => {
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => sgwBuildings,
        });
        const response = await fetch('http://localhost:3000/campus/SGW/buildings');
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body[1]).toEqual({
            id: 'jw',
            code: 'JW',
            name: 'McConnell Building',
            address: '1400 De Maisonneuve Blvd W, Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/jw.html',
            coordinates: [
                { latitude: 45.49734, longitude: -73.578063 },
                { latitude: 45.4968756, longitude: -73.5770947 },
                { latitude: 45.4962439, longitude: -73.5777203 },
                { latitude: 45.496684, longitude: -73.5786444 }
            ]
        });
    });

    it("/campus/Loyola/buildings", async () => {
        fetchSpy.mockResolvedValueOnce({
            status: 200,
            json: async () => loyolaBuildings,
        });
        const response = await fetch('http://localhost:3000/campus/Loyola/buildings');
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body[1]).toEqual({
            id: 'pc',
            code: 'PC',
            name: 'PERFORM Centre',
            address: '7200 Sherbrooke St. W., Montreal, QC',
            link: 'https://www.concordia.ca/maps/buildings/pc.html',
            coordinates: [
                { latitude: 45.45728, longitude: -73.63763 },
                { latitude: 45.45695, longitude: -73.63677 },
                { latitude: 45.45668, longitude: -73.63699 },
                { latitude: 45.45702, longitude: -73.63784 },
            ],
        });
    });


})
