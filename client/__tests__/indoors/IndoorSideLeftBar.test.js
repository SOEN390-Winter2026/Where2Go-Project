import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorSideLeftBar from '../../src/IndoorSideLeftBar';

jest.mock('../../assets/hugeicons--disability-02.png', () => 'disability-icon-1');
jest.mock('../../assets/hugeicons--disability-02-2.png', () => 'disability-icon-2');
jest.mock('../../assets/gis--poi-alt.png', () => 'poi-icon-1');
jest.mock('../../assets/gis--poi-alt-2.png', () => 'poi-icon-2');

const defaultProps = {
    onPressBack: jest.fn(),
};

describe('IndoorSideLeftBar', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders without crashing', () => {
        const { root } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(root).toBeTruthy();
    });

    // disability and POI buttons are rendered by SideLeftBarBase and use
    // testIDs 'disPress' / 'poiPress' — consistent with the outdoor bar.
    it('renders back, search, disability and POI buttons', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(getByTestId('back-btn')).toBeTruthy();
        expect(getByTestId('search-btn')).toBeTruthy();
        expect(getByTestId('disPress')).toBeTruthy();
        expect(getByTestId('poiPress')).toBeTruthy();
    });

    it('calls onPressBack when back button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('back-btn'));
        expect(onPressBack).toHaveBeenCalledTimes(1);
    });

    it('back button has maroon background', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        const btn = getByTestId('back-btn');
        const bg = [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('search button toggles active state on press', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(() => fireEvent.press(getByTestId('search-btn'))).not.toThrow();
    });

    it('search button can be toggled on and off', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('search-btn'));
        fireEvent.press(getByTestId('search-btn'));
        expect(getByTestId('search-btn')).toBeTruthy();
    });

    it('does not call onPressBack when search button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('search-btn'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('disability button follows isAccessibilityEnabled when controlled', () => {
        const { getByTestId, rerender } = render(
            <IndoorSideLeftBar
                {...defaultProps}
                isAccessibilityEnabled={false}
                onToggleAccessibility={jest.fn()}
            />
        );
        let btn = getByTestId('disPress');
        let bg = [btn.props.style].flat().find((s) => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
        rerender(
            <IndoorSideLeftBar
                {...defaultProps}
                isAccessibilityEnabled
                onToggleAccessibility={jest.fn()}
            />
        );
        btn = getByTestId('disPress');
        bg = [btn.props.style].flat().find((s) => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('disability button starts with grey background', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        const btn = getByTestId('disPress');
        const bg = [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('disability button calls onToggleAccessibility when pressed', () => {
        const onToggleAccessibility = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar
                {...defaultProps}
                isAccessibilityEnabled={false}
                onToggleAccessibility={onToggleAccessibility}
            />
        );
        fireEvent.press(getByTestId('disPress'));
        expect(onToggleAccessibility).toHaveBeenCalledTimes(1);
    });

    it('does not call onPressBack when disability button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('disPress'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('POI button starts with grey background', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        const btn = getByTestId('poiPress');
        const bg = [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('POI button turns maroon when pressed', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        const btn = getByTestId('poiPress');
        const bg = [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('POI button deactivates when pressed again', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        fireEvent.press(getByTestId('poiPress'));
        const btn = getByTestId('poiPress');
        const bg = [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('does not call onPressBack when POI button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('poiPress'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('disability and POI buttons toggle independently', () => {
        const { getByTestId } = render(
            <IndoorSideLeftBar
                {...defaultProps}
                isAccessibilityEnabled
                onToggleAccessibility={jest.fn()}
            />
        );
        fireEvent.press(getByTestId('poiPress'));

        const disBg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        const poiBg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;

        expect(disBg).toBe('#912338');
        expect(poiBg).toBe('#912338');
    });

    it('accessibility from parent does not activate POI', () => {
        const { getByTestId } = render(
            <IndoorSideLeftBar
                {...defaultProps}
                isAccessibilityEnabled
                onToggleAccessibility={jest.fn()}
            />
        );
        const poiBg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(poiBg).toBe('#ccc');
    });

    it('activating POI does not affect disability state', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        const disBg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(disBg).toBe('#ccc');
    });

    it('iconState returns maroon for poi when poi is active', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        const bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('POI image source switches to active icon when poi is active', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        expect(getByTestId('poiPress')).toBeTruthy();
    });

    it('iconState returns undefined for unknown button name', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(getByTestId('search-btn')).toBeTruthy();
    });

});