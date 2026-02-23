import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorModal from '../src/ErrorModal';

describe('ErrorModal Component', () => {
  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    message: 'Test error message',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress act() warnings for Icon component
    jest.spyOn(console, 'error').mockImplementation((message) => {
      if (message.includes('An update to Icon inside a test was not wrapped in act')) {
        return;
      }
      console.warn(message);
    });
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders correctly when visible', () => {
    const { getByText } = render(<ErrorModal {...defaultProps} />);
    
    expect(getByText('Error')).toBeTruthy(); // Default title
    expect(getByText('Test error message')).toBeTruthy();
    expect(getByText('OK')).toBeTruthy(); // Default button text
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(
      <ErrorModal {...defaultProps} visible={false} />
    );
    
    expect(queryByText('Test error message')).toBeNull();
  });

  it('renders custom title', () => {
    const { getByText } = render(
      <ErrorModal {...defaultProps} title="Custom Title" />
    );
    
    expect(getByText('Custom Title')).toBeTruthy();
  });

  it('renders custom button text', () => {
    const { getByText } = render(
      <ErrorModal {...defaultProps} buttonText="Got it!" />
    );
    
    expect(getByText('Got it!')).toBeTruthy();
  });

  it('calls onClose when button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByText } = render(
      <ErrorModal {...defaultProps} onClose={mockOnClose} />
    );
    
    const button = getByText('OK');
    fireEvent.press(button);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders with custom icon name', () => {
    const { getByText } = render(
      <ErrorModal {...defaultProps} iconName="warning" />
    );
    
    // The modal should still render (icon testing requires native modules)
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('renders with custom icon color', () => {
    const { getByText } = render(
      <ErrorModal {...defaultProps} iconColor="#FF0000" />
    );
    
    // Verify the component renders with custom color prop
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('displays long messages correctly', () => {
    const longMessage = 'This is a very long error message that should wrap properly and display all the text without any issues. It should be fully visible to the user.';
    const { getByText } = render(
      <ErrorModal {...defaultProps} message={longMessage} />
    );
    
    expect(getByText(longMessage)).toBeTruthy();
  });

  it('handles multiple consecutive calls', () => {
    const mockOnClose = jest.fn();
    const { getByText, rerender } = render(
      <ErrorModal {...defaultProps} onClose={mockOnClose} message="First message" />
    );
    
    expect(getByText('First message')).toBeTruthy();
    
    const button = getByText('OK');
    fireEvent.press(button);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    
    // Rerender with new message
    rerender(
      <ErrorModal {...defaultProps} onClose={mockOnClose} message="Second message" />
    );
    
    expect(getByText('Second message')).toBeTruthy();
  });

  it('applies all custom props together', () => {
    const customProps = {
      visible: true,
      onClose: jest.fn(),
      title: 'Custom Error',
      message: 'Custom message text',
      iconName: 'close-circle',
      iconColor: '#FF6B6B',
      buttonText: 'Close',
    };
    
    const { getByText } = render(<ErrorModal {...customProps} />);
    
    expect(getByText('Custom Error')).toBeTruthy();
    expect(getByText('Custom message text')).toBeTruthy();
    expect(getByText('Close')).toBeTruthy();
  });
});
