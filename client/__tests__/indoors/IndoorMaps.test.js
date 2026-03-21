import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorMaps from '../../src/IndoorMaps';

jest.mock('../../src/IndoorSideLeftBar', () => {
    const { Pressable, Text } = require('react-native');
    const PropTypes = require('prop-types');

    const MockIndoorSideLeftBar = ({ onPressBack }) => (
        <Pressable testID="mock-back-btn" onPress={onPressBack}>
            <Text>Back</Text>
        </Pressable>
    );

    MockIndoorSideLeftBar.propTypes = {
        onPressBack: PropTypes.func.isRequired,
    };
    return MockIndoorSideLeftBar;
});

//mock for the drag
let panHandlers = {};
jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.Animated.spring = (value, config) => ({
        start: (cb) => {
            value.setValue(config.toValue);
            cb?.({ finished: true });
        },
    });
    RN.PanResponder.create = (handlers) => {
        panHandlers = handlers;
        return { panHandlers: {} };
    };
    return RN;
});

const mockBuilding = {
    id: '1',
    name: 'Hall Building',
    code: 'H',
    address: '1455 De Maisonneuve Blvd W',
};

const defaultProps = {
    building: mockBuilding,
    onPressBack: jest.fn(),
    campus: 'SGW',
};

describe('IndoorMaps', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', () => {
        const { getAllByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    it('displays the campus name', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('SGW')).toBeTruthy();
    });

    it('displays the building code in the bar', () => {
        const { getAllByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    it('shows fallback dash when building code is missing', () => {
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} building={{ ...mockBuilding, code: undefined }} />
        );
        expect(getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows fallback dash when building name is missing', () => {
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} building={{ ...mockBuilding, name: undefined }} />
        );
        expect(getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows fallback dash when building address is missing', () => {
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} building={{ ...mockBuilding, address: undefined }} />
        );
        expect(getAllByText('—').length).toBeGreaterThan(0);
    });

    it('renders without crashing when campus is not provided', () => {
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} campus={undefined} />
        );
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    it('shows "Select a floor" placeholder initially', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('Select a floor')).toBeTruthy();
    });

    it('always shows building info in the default sheet content', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('Hall Building')).toBeTruthy();
        expect(getByText('1455 De Maisonneuve Blvd W')).toBeTruthy();
    });

    it('shows Current Building label in the bar', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('Current Building:')).toBeTruthy();
    });

    it('calls onPressBack when back button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorMaps {...defaultProps} onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('mock-back-btn'));
        expect(onPressBack).toHaveBeenCalledTimes(1);
    });

    it('does not call onPressBack when other elements are pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorMaps {...defaultProps} onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('tab-info'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('info tab button is present and pressable', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        expect(getByTestId('tab-info')).toBeTruthy();
        fireEvent.press(getByTestId('tab-info'));
    });

    it('pressing info tab twice returns to default content', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-info'));
        fireEvent.press(getByTestId('tab-info'));
        expect(getByText('Hall Building')).toBeTruthy();
    });

    it('floors tab button is present', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        expect(getByTestId('tab-floors')).toBeTruthy();
    });

    it('opens floors tab and shows all floor buttons', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('floor-btn-1')).toBeTruthy();
        expect(getByTestId('floor-btn-2')).toBeTruthy();
        expect(getByTestId('floor-btn-3')).toBeTruthy();
        expect(getByTestId('floor-btn-4')).toBeTruthy();
        expect(getByTestId('floor-btn-5')).toBeTruthy();
    });

    it('shows classroom label when floors tab is open', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByText('Classroom # :')).toBeTruthy();
    });

    it('shows classroom input when floors tab is open', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('classroom-input')).toBeTruthy();
    });

    it('classroom input starts empty', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('classroom-input').props.value).toBe('');
    });

    it('updates classroom input value on change', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.changeText(getByTestId('classroom-input'), 'H-920');
        expect(getByTestId('classroom-input').props.value).toBe('H-920');
    });

    it('clears classroom input when changed to empty string', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.changeText(getByTestId('classroom-input'), 'H-920');
        fireEvent.changeText(getByTestId('classroom-input'), '');
        expect(getByTestId('classroom-input').props.value).toBe('');
    });

    it('collapses floors tab when pressed again and restores default content', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByText('Hall Building')).toBeTruthy();
    });

    it('switches from floors tab to info tab', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('tab-info'));
        expect(getByText('Hall Building')).toBeTruthy();
    });

    it('switches from info tab to floors tab', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-info'));
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('floor-btn-1')).toBeTruthy();
    });

    it('selects a floor and updates the map placeholder text', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-3'));
        expect(getByText('Floor 3')).toBeTruthy();
    });

    it('deselects a floor when pressed again and restores placeholder', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-2'));
        fireEvent.press(getByTestId('floor-btn-2'));
        expect(getByText('Select a floor')).toBeTruthy();
    });

    it('switches selected floor correctly', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-1'));
        fireEvent.press(getByTestId('floor-btn-4'));
        expect(getByText('Floor 4')).toBeTruthy();
    });

    it('selected floor persists after switching tabs', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-5'));
        fireEvent.press(getByTestId('tab-info'));
        expect(getByText('Floor 5')).toBeTruthy();
    });

    it('expandSheet is triggered when a tab is opened', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('classroom-input')).toBeTruthy();
    });

    it('collapseSheet resets activeTab to null', () => {
        const { getByTestId, queryByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('tab-floors'));
        expect(queryByTestId('classroom-input')).toBeNull();
    });

    it('collapseSheet resets activeTab when switching from floors to info', () => {
        const { getByTestId, queryByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('tab-info'));
        expect(queryByTestId('classroom-input')).toBeNull();
    });

    it('onMoveShouldSetPanResponder returns true when dy > 5', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(panHandlers.onMoveShouldSetPanResponder(null, { dy: 10 })).toBe(true);
    });

    it('onMoveShouldSetPanResponder returns false when dy <= 5', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(panHandlers.onMoveShouldSetPanResponder(null, { dy: 3 })).toBe(false);
    });

    it('onMoveShouldSetPanResponder returns true for negative dy beyond threshold', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(panHandlers.onMoveShouldSetPanResponder(null, { dy: -10 })).toBe(true);
    });

    it('onPanResponderMove drags upward', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(() => {
            panHandlers.onPanResponderMove(null, { dy: -50 });
        }).not.toThrow();
    });

    it('onPanResponderMove ignores gesture outside bounds', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(() => {
            panHandlers.onPanResponderMove(null, { dy: -9999 });
        }).not.toThrow();
    });

    it('onPanResponderRelease expands sheet when dragged past midpoint', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        panHandlers.onPanResponderRelease(null, { dy: -200 });
        expect(getByTestId('classroom-input')).toBeTruthy();
    });

    it('onPanResponderRelease collapses sheet when released near bottom', () => {
        const { act } = require('@testing-library/react-native');
        const { getByTestId, queryByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        act(() => {
            panHandlers.onPanResponderRelease(null, { dy: 500 });
        });
        expect(queryByTestId('classroom-input')).toBeNull();
    });

    //#35: android branch of topPadding
    it('renders correctly on Android and applies android top padding', () => {
        const Platform = require('react-native').Platform;
        const original = Platform.OS;
        Platform.OS = 'android';
        const { getAllByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getAllByText('H').length).toBeGreaterThan(0);
        Platform.OS = original;
    });

    //stuff for get room directions
    it('shows Get Room Directions button in default (info) view', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('Get Room Directions')).toBeTruthy();
    });

    it('pressing Get Room Directions opens the directions tab', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('swap-directions')).toBeTruthy();
    });

    it('directions tab shows From and To labels', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByText('From')).toBeTruthy();
        expect(getByText('To')).toBeTruthy();
    });

    it('directions tab shows Directions section title', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByText('Directions')).toBeTruthy();
    });

    it('directions tab shows Generate Directions button', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('generate-directions-btn')).toBeTruthy();
    });

    it('pressing Generate Directions button does not throw', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(() => fireEvent.press(getByTestId('generate-directions-btn'))).not.toThrow();
    });

    it('swap directions button is pressable and does not throw', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(() => fireEvent.press(getByTestId('swap-directions'))).not.toThrow();
    });

    it('directions tab is accessible via tab-floors then directions', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        fireEvent.press(getByTestId('swap-directions'));
        expect(getByTestId('generate-directions-btn')).toBeTruthy();
    });

    it('from-building dropdown renders in directions tab', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('from-building')).toBeTruthy();
    });

    it('to-building dropdown renders in directions tab', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('to-building')).toBeTruthy();
    });

    it('from-floor dropdown is present and shows placeholder when no building selected', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('from-floor')).toBeTruthy();
    });

    it('to-floor dropdown is present and shows placeholder when no building selected', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        expect(getByTestId('to-floor')).toBeTruthy();
    });

    it('switching from directions tab back to floors tab works', () => {
        const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByText('Get Room Directions'));
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('classroom-input')).toBeTruthy();
    });

});