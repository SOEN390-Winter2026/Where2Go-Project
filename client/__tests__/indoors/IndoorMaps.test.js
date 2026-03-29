import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorMaps from '../../src/IndoorMaps';

jest.mock('indoorData', () => ({
    indoorMaps: {
        SGW: {
            H: {
                2:  {
                    image: 1,
                    data: {
                        'H-2': {
                            floor: 'H-2',
                            rooms: [
                                {
                                    id: 'H-201',
                                    type: 'classroom',
                                    bounds: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
                                },
                            ],
                            waypoints: [],
                        },
                    },
                },
                4:  { image: 2, data: { rooms: [], waypoints: [] } },
                5:  { image: 3, data: { rooms: [], waypoints: [] } },
                6:  { image: 4, data: { rooms: [], waypoints: [] } },
                7:  { image: 5, data: { rooms: [], waypoints: [] } },
                8:  { image: 6, data: { rooms: [], waypoints: [] } },
                9:  { image: 7, data: { rooms: [], waypoints: [] } },
                10: { image: 8, data: { rooms: [], waypoints: [] } },
                11: { image: 9, data: { rooms: [], waypoints: [] } },
                12: { image: 10, data: null },
            },
            MB: {
                6:  { image: null, data: null },
                7:  { image: null, data: null },
                8:  { image: null, data: null },
                9:  { image: null, data: null },
                S1: { image: null, data: null },
                S2: { image: null, data: null },
            },
        },
        Loyola: {
            CC: {
                1: { image: 11, data: { rooms: [], waypoints: [] } },
                2: { image: 12, data: { rooms: [], waypoints: [] } },
                3: { image: 13, data: { rooms: [], waypoints: [] } },
                4: { image: 14, data: { rooms: [], waypoints: [] } },
            },
            VE: {
                1: { image: 15, data: { rooms: [], waypoints: [] } },
                2: { image: 16, data: { rooms: [], waypoints: [] } },
                3: { image: 17, data: null },
            },
        },
    },
}));

jest.mock('react-native-gesture-handler', () => {
    const makeGesture = (name) => {
        const store = {};
        if (!globalThis.__gestureCallbacks__) globalThis.__gestureCallbacks__ = {};
        globalThis.__gestureCallbacks__[name] = store;
        const chain = {
            onStart:  (fn) => { store.onStart  = fn; return chain; },
            onUpdate: (fn) => { store.onUpdate = fn; return chain; },
            onEnd:    (fn) => { store.onEnd    = fn; return chain; },
            enabled:  ()   => chain,
            runOnJS:  ()   => chain,
        };
        return chain;
    };
    return {
        Gesture: {
            Pinch: () => makeGesture('pinch'),
            Pan:   () => makeGesture('pan'),
            Simultaneous: () => ({}),
        },
        GestureDetector: ({ children }) => children,
    };
});

jest.mock('../../src/IndoorSideLeftBar', () => {
    const { Pressable, Text } = require('react-native');
    const PropTypes = require('prop-types');
    const MockIndoorSideLeftBar = ({ onPressBack, onOpenDirections }) => (
        <>
            <Pressable testID="mock-back-btn" onPress={onPressBack}>
                <Text>Back</Text>
            </Pressable>
            <Pressable testID="mock-open-directions-btn" onPress={onOpenDirections}>
                <Text>OpenDirections</Text>
            </Pressable>
        </>
    );
    MockIndoorSideLeftBar.propTypes = {
        onPressBack: PropTypes.func.isRequired,
        onOpenDirections: PropTypes.func,
    };
    return MockIndoorSideLeftBar;
});

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
    RN.Image.resolveAssetSource = () => ({ width: 1000, height: 800 });
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

const FIRST_FLOOR = '2';
const ANOTHER_FLOOR = '5';

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
        const { getAllByText } = render(<IndoorMaps {...defaultProps} campus={undefined} />);
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    it('shows "Select a floor" placeholder when no campus is provided', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} campus={undefined} />);
        expect(getByText('Select a floor')).toBeTruthy();
    });

    it('auto-selects the first floor on mount and shows floor label', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText(`Floor ${FIRST_FLOOR}`)).toBeTruthy();
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
        const { getByTestId } = render(<IndoorMaps {...defaultProps} onPressBack={onPressBack} />);
        fireEvent.press(getByTestId('mock-back-btn'));
        expect(onPressBack).toHaveBeenCalledTimes(1);
    });

    it('does not call onPressBack when other elements are pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(<IndoorMaps {...defaultProps} onPressBack={onPressBack} />);
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

    it('opens floors tab and shows floor buttons for Hall building', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        expect(getByTestId('floor-btn-2')).toBeTruthy();
        expect(getByTestId('floor-btn-4')).toBeTruthy();
        expect(getByTestId('floor-btn-5')).toBeTruthy();
        expect(getByTestId('floor-btn-6')).toBeTruthy();
        expect(getByTestId('floor-btn-7')).toBeTruthy();
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
        expect(getByTestId('floor-btn-2')).toBeTruthy();
    });

    it('selects a floor and updates the floor label', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-4'));
        expect(getByText('Floor 4')).toBeTruthy();
    });

    it('deselects the active floor when pressed again and restores placeholder', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId(`floor-btn-${FIRST_FLOOR}`));
        expect(getByText('Select a floor')).toBeTruthy();
    });

    it('selected floor persists after switching tabs', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId(`floor-btn-${ANOTHER_FLOOR}`));
        fireEvent.press(getByTestId('tab-info'));
        expect(getByText(`Floor ${ANOTHER_FLOOR}`)).toBeTruthy();
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
        expect(() => panHandlers.onPanResponderMove(null, { dy: -50 })).not.toThrow();
    });

    it('onPanResponderMove ignores gesture outside bounds', () => {
        render(<IndoorMaps {...defaultProps} />);
        expect(() => panHandlers.onPanResponderMove(null, { dy: -9999 })).not.toThrow();
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
        act(() => { panHandlers.onPanResponderRelease(null, { dy: 500 }); });
        expect(queryByTestId('classroom-input')).toBeNull();
    });

    it('renders correctly on Android', () => {
        const Platform = require('react-native').Platform;
        const original = Platform.OS;
        Platform.OS = 'android';
        const { getAllByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getAllByText('H').length).toBeGreaterThan(0);
        Platform.OS = original;
    });

    it('shows Get Room Directions button in default (info) view', () => {
        const { getByText } = render(<IndoorMaps {...defaultProps} />);
        expect(getByText('Get Room Directions')).toBeTruthy();
    });

    it('onOpenDirections from sidebar opens the directions tab', () => {
        const { getByTestId } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('mock-open-directions-btn'));
        expect(getByTestId('swap-directions')).toBeTruthy();
    });

    it('shows Navigation unavailable badge for floor with no JSON data', () => {
        const { getByTestId, getByText } = render(<IndoorMaps {...defaultProps} />);
        fireEvent.press(getByTestId('tab-floors'));
        fireEvent.press(getByTestId('floor-btn-12'));
        expect(getByText('Navigation unavailable')).toBeTruthy();
    });

    it('renders with isAccessibilityEnabled prop without crashing', () => {
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} isAccessibilityEnabled={true} />
        );
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    it('renders with onToggleAccessibility prop without crashing', () => {
        const toggle = jest.fn();
        const { getAllByText } = render(
            <IndoorMaps {...defaultProps} onToggleAccessibility={toggle} />
        );
        expect(getAllByText('H').length).toBeGreaterThan(0);
    });

    describe('RoomActionModal', () => {
        // Room labels only render once the ZoomableImage container has a layout
        // and Image.resolveAssetSource returns a valid aspect ratio.
        // We simulate both by firing onLayout and mocking resolveAssetSource.
        const triggerRoomLabel = (getByTestId) => {
            const container = getByTestId('zoomable-container');
            fireEvent(container, 'layout', {
                nativeEvent: { layout: { width: 400, height: 600 } },
            });
        };

        beforeAll(() => {
            jest.spyOn(require('react-native').Image, 'resolveAssetSource')
                .mockReturnValue({ width: 800, height: 600 });
        });

        afterAll(() => {
            require('react-native').Image.resolveAssetSource.mockRestore();
        });

        it('room label tap opens the action modal with the room id', () => {
            const { getByText, getByTestId } = render(<IndoorMaps {...defaultProps} />);
            triggerRoomLabel(getByTestId);
            fireEvent.press(getByTestId('room-label-H-201'));
            expect(getByText('Set as departure')).toBeTruthy();
            expect(getByText('Set as destination')).toBeTruthy();
        });

        it('modal closes when Cancel is pressed', () => {
            const { getByText, getByTestId, queryByText } = render(<IndoorMaps {...defaultProps} />);
            triggerRoomLabel(getByTestId);
            fireEvent.press(getByTestId('room-label-H-201'));
            fireEvent.press(getByText('Cancel'));
            expect(queryByText('Set as departure')).toBeNull();
        });

        it('Set as departure sets directionsFrom and opens directions tab', () => {
            const { getByText, getByTestId, queryByText } = render(<IndoorMaps {...defaultProps} />);
            triggerRoomLabel(getByTestId);
            fireEvent.press(getByTestId('room-label-H-201'));
            fireEvent.press(getByText('Set as departure'));
            expect(queryByText('Set as departure')).toBeNull();
            expect(getByTestId('swap-directions')).toBeTruthy();
        });

        it('Set as destination sets directionsTo and opens directions tab', () => {
            const { getByText, getByTestId, queryByText } = render(<IndoorMaps {...defaultProps} />);
            triggerRoomLabel(getByTestId);
            fireEvent.press(getByTestId('room-label-H-201'));
            fireEvent.press(getByText('Set as destination'));
            expect(queryByText('Set as destination')).toBeNull();
            expect(getByTestId('swap-directions')).toBeTruthy();
        });
    });

    describe('directions tab', () => {
        let getByText, getByTestId, getAllByText;

        beforeEach(() => {
            ({ getByText, getByTestId, getAllByText } = render(<IndoorMaps {...defaultProps} />));
            fireEvent.press(getByText('Get Room Directions'));
        });

        it('opens showing swap button', () => {
            expect(getByTestId('swap-directions')).toBeTruthy();
        });

        it('shows From and To labels', () => {
            expect(getByText('From')).toBeTruthy();
            expect(getByText('To')).toBeTruthy();
        });

        it('shows Directions section title', () => {
            expect(getByText('Directions')).toBeTruthy();
        });

        it('shows Generate Directions button', () => {
            expect(getByTestId('generate-directions-btn')).toBeTruthy();
        });

        it('pressing Generate Directions button does not throw', () => {
            expect(() => fireEvent.press(getByTestId('generate-directions-btn'))).not.toThrow();
        });

        it('swap button is pressable and does not throw', () => {
            expect(() => fireEvent.press(getByTestId('swap-directions'))).not.toThrow();
        });

        it('remains on directions tab after pressing swap', () => {
            fireEvent.press(getByTestId('swap-directions'));
            expect(getByTestId('generate-directions-btn')).toBeTruthy();
        });

        it('renders from-building dropdown', () => {
            expect(getByTestId('from-building')).toBeTruthy();
        });

        it('renders to-building dropdown', () => {
            expect(getByTestId('to-building')).toBeTruthy();
        });

        it('renders from-floor dropdown', () => {
            expect(getByTestId('from-floor')).toBeTruthy();
        });

        it('renders to-floor dropdown', () => {
            expect(getByTestId('to-floor')).toBeTruthy();
        });

        it('switching to floors tab works', () => {
            fireEvent.press(getByTestId('tab-floors'));
            expect(getByTestId('classroom-input')).toBeTruthy();
        });

        it('opens from-building dropdown modal and shows building options', () => {
            fireEvent.press(getByTestId('from-building'));
            expect(getByText('MB')).toBeTruthy();
        });

        it('selects a building from the dropdown', () => {
            fireEvent.press(getByTestId('from-building'));
            fireEvent.press(getByText('MB'));
            expect(getByTestId('from-floor')).toBeTruthy();
        });

        it('handles directions with no selected floor', () => {
            fireEvent.press(getByTestId('generate-directions-btn'));
            // Should not throw
        });

        it('directions tab persists after tab switches', () => {
            fireEvent.press(getByTestId('tab-info'));
            fireEvent.press(getByText('Get Room Directions'));
            expect(getByTestId('swap-directions')).toBeTruthy();
        });
    });});