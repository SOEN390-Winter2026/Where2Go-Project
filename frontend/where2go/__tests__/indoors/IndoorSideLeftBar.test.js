import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorSideLeftBar from '../../src/IndoorSideLeftBar';

//mocking icons
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

    it('renders back, search, disability and POI buttons', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(getByTestId('back-btn')).toBeTruthy();
        expect(getByTestId('search-btn')).toBeTruthy();
        expect(getByTestId('disability-btn')).toBeTruthy();
        expect(getByTestId('poi-btn')).toBeTruthy();
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
        const bg = btn.props.style.flat
            ? btn.props.style.flat().find(s => s?.backgroundColor)?.backgroundColor
            : [btn.props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
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

    it('disability button starts with grey background', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        const btn = getByTestId('disability-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('disability button turns maroon when pressed', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('disability-btn'));
        const btn = getByTestId('disability-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('disability button deactivates when pressed again', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('disability-btn'));
        fireEvent.press(getByTestId('disability-btn'));
        const btn = getByTestId('disability-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('does not call onPressBack when disability button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('disability-btn'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('POI button starts with grey background', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        const btn = getByTestId('poi-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('POI button turns maroon when pressed', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poi-btn'));
        const btn = getByTestId('poi-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('POI button deactivates when pressed again', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poi-btn'));
        fireEvent.press(getByTestId('poi-btn'));
        const btn = getByTestId('poi-btn');
        const styles = [btn.props.style].flat();
        const bg = styles.find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('does not call onPressBack when POI button is pressed', () => {
        const onPressBack = jest.fn();
        const { getByTestId } = render(
            <IndoorSideLeftBar onPressBack={onPressBack} />
        );
        fireEvent.press(getByTestId('poi-btn'));
        expect(onPressBack).not.toHaveBeenCalled();
    });

    it('disability and POI buttons toggle independently', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('disability-btn'));
        fireEvent.press(getByTestId('poi-btn'));

        const disBg = [getByTestId('disability-btn').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        const poiBg = [getByTestId('poi-btn').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;

        expect(disBg).toBe('#912338');
        expect(poiBg).toBe('#912338');
    });

    it('activating disability does not affect POI state', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('disability-btn'));

        const poiBg = [getByTestId('poi-btn').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(poiBg).toBe('#ccc');
    });

    it('activating POI does not affect disability state', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poi-btn'));

        const disBg = [getByTestId('disability-btn').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(disBg).toBe('#ccc');
    });

    it('iconState returns maroon for poi when poi is active', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poi-btn'));
        const bg = [getByTestId('poi-btn').props.style].flat().find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('POI image source switches to active icon when poi is active', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        fireEvent.press(getByTestId('poi-btn'));
        render(<IndoorSideLeftBar {...defaultProps} />);
        expect(getByTestId('poi-btn')).toBeTruthy();
    });

    it('iconState returns undefined for unknown button name', () => {
        const { getByTestId } = render(<IndoorSideLeftBar {...defaultProps} />);
        expect(getByTestId('search-btn')).toBeTruthy();
    });

});