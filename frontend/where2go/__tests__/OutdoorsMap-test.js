import { render, fireEvent } from '@testing-library/react-native';
import SideLeftBar from '../src/SideLeftBar.js';
import { Pressable, Text } from 'react-native';
import React, { useState } from 'react';

// Jest:
// Used for testing (1) UI Components, (2) User interactions, (3) Visual Logic

/**
 * - Campus toggle state logic
 * - Default Campus Initialization
 * - Map configuration per campus
 */


describe("Toggle Button Test", () => {

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

    it('Render the application', () => {
    render(<SideLeftBar />);
    });

    it("Check currentCampus", () =>{
       //const mockOnPress = jest.fn();

       const { getByTestId } = render(<TestWrapper />)
       const pressToggleButton = getByTestId("togglePress");
       const currentCampus = getByTestId("campusText");

       expect(currentCampus.props.children).toBe('SGW');

       fireEvent.press(pressToggleButton);
       //expect(pressToggleButton).toHaveBeenCalled();

       expect(currentCampus.props.children).toBe('Loyola')
    })
})

