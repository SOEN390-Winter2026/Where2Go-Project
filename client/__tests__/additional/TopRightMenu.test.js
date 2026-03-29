import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TopRightMenu from '../../src/TopRightMenu.js';

describe('TopRightMenu', () => {
    const mockOnPressDirection = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the menu btn', () => {
        const { getByTestId } = render(
            <TopRightMenu onPressDirection={mockOnPressDirection} />
        );
        expect(getByTestId('menu-button')).toBeTruthy();
    });

    it('dropdown menu starts off closed', () => {
        const { queryByText } = render(
            <TopRightMenu onPressDirection={mockOnPressDirection} />
        );
        expect(queryByText('Direction')).toBeNull();
        expect(queryByText('Calendar')).toBeNull();
        expect(queryByText('Feedback')).toBeNull();
    });

    it('opens dropdown menu when hamburger button is pressed', () => {
        const { getByText, getByTestId } = render(
            <TopRightMenu onPressDirection={mockOnPressDirection}/>
        );
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
        
        expect(getByText('Direction')).toBeTruthy();
        expect(getByText('Calendar')).toBeTruthy();
        expect(getByText('Feedback')).toBeTruthy();
    });


    it('calls onPressDirection when Direction menu item is pressed', () => {
        const { getByText, getByTestId } = render(
            <TopRightMenu onPressDirection={mockOnPressDirection} />
        );
        const menuButton = getByTestId('menu-button');
        fireEvent.press(menuButton);
        const directionItem = getByText('Direction');
        fireEvent.press(directionItem);
        
        expect(mockOnPressDirection).toHaveBeenCalledTimes(1);
    });

    it('closes menu when Calendar item is pressed', () => {
        const { getByText, getByTestId } = render(
            <TopRightMenu onPressCalendar={mockOnPressDirection} />
        );
        
        fireEvent.press(getByTestId('menu-button'));
        fireEvent.press(getByText('Calendar'));
        expect(mockOnPressDirection).toHaveBeenCalledTimes(1);
    });


    it('closes menu when Feedback item is pressed', () => {
        const { getByText, queryByText, getByTestId } = render(
            <TopRightMenu onPressDirection={mockOnPressDirection}/>
        );
        fireEvent.press(getByTestId('menu-button'));
        fireEvent.press(getByText('Feedback'));
        expect(queryByText('Feedback')).toBeNull();
    });
});