import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../../src/Login.js';

describe('LoginScreen', () => {
    const mockOnSkip = jest.fn();
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the entire login page', () => {
        const { getByText } = render(
            <LoginScreen onSkip={mockOnSkip} />
        );
        expect(getByText('WELCOME TO WHERE2GO')).toBeTruthy();
    });

    it('renders the user icon', () => {
        const { getByTestId } = render(
            <LoginScreen onSkip={mockOnSkip} />
        );
        expect(getByTestId('user-icon')).toBeTruthy();
    });

    it('renders Continue btn', () => {
        const { getByText } = render(
            <LoginScreen onSkip={mockOnSkip} />
        );
        expect(getByText('Continue')).toBeTruthy();
    });

    it('has to call onSkip when Continue btn is pressed', () => {
        const { getByText } = render(
            <LoginScreen onSkip={mockOnSkip} />
        );
        const skipButton = getByText('Continue');
        fireEvent.press(skipButton);
        expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
});