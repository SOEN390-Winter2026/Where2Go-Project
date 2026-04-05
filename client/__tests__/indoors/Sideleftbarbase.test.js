import React from 'react';
import { View } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import SideLeftBarBase from '../../src/SideLeftBarBase';

jest.mock('../../assets/hugeicons--disability-02.png',   () => 'disability-icon-1');
jest.mock('../../assets/hugeicons--disability-02-2.png', () => 'disability-icon-2');
jest.mock('../../assets/gis--poi-alt.png',               () => 'poi-icon-1');
jest.mock('../../assets/gis--poi-alt-2.png',             () => 'poi-icon-2');

// Minimal topSection stub — concrete content is tested in the individual
// SideLeftBar / IndoorSideLeftBar suites.
const TOP_TEST_ID = 'top-section-stub';
const topSection = <View testID={TOP_TEST_ID} />;

const defaultProps = {
    topSection,
    isAccessibilityEnabled: false,
    onToggleAccessibility: jest.fn(),
    isPOIEnabled: false,
    onTogglePOI: jest.fn(),
};

describe('SideLeftBarBase — shared template logic', () => {

    beforeEach(() => jest.clearAllMocks());

    // ── Rendering ────────────────────────────────────────────────────────────

    it('renders without crashing', () => {
        const { root } = render(<SideLeftBarBase {...defaultProps} />);
        expect(root).toBeTruthy();
    });

    it('renders the injected topSection', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        expect(getByTestId(TOP_TEST_ID)).toBeTruthy();
    });

    it('always renders the disability button', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        expect(getByTestId('disPress')).toBeTruthy();
    });

    it('always renders the POI button', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        expect(getByTestId('poiPress')).toBeTruthy();
    });

    // ── Disability button ─────────────────────────────────────────────────────

    it('disability button has grey background when isAccessibilityEnabled is false', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        const bg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('disability button has maroon background when isAccessibilityEnabled is true', () => {
        const { getByTestId } = render(
            <SideLeftBarBase {...defaultProps} isAccessibilityEnabled />
        );
        const bg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('calls onToggleAccessibility when disability button is pressed', () => {
        const onToggleAccessibility = jest.fn();
        const { getByTestId } = render(
            <SideLeftBarBase {...defaultProps} onToggleAccessibility={onToggleAccessibility} />
        );
        fireEvent.press(getByTestId('disPress'));
        expect(onToggleAccessibility).toHaveBeenCalledTimes(1);
    });

    it('disability button reacts to updated isAccessibilityEnabled prop', () => {
        const { getByTestId, rerender } = render(
            <SideLeftBarBase {...defaultProps} isAccessibilityEnabled={false} />
        );
        let bg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');

        rerender(<SideLeftBarBase {...defaultProps} isAccessibilityEnabled />);
        bg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    // ── POI button ────────────────────────────────────────────────────────────

    it('POI button has grey background when isPOIEnabled is false', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        const bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('POI button turns maroon when pressed', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        const bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    it('POI button deactivates when pressed twice', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        fireEvent.press(getByTestId('poiPress'));
        const bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('calls onTogglePOI when POI button is pressed', () => {
        const onTogglePOI = jest.fn();
        const { getByTestId } = render(
            <SideLeftBarBase {...defaultProps} onTogglePOI={onTogglePOI} />
        );
        fireEvent.press(getByTestId('poiPress'));
        expect(onTogglePOI).toHaveBeenCalledTimes(1);
    });

    it('POI button syncs with isPOIEnabled prop', () => {
        const { getByTestId, rerender } = render(
            <SideLeftBarBase {...defaultProps} isPOIEnabled={false} />
        );
        let bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');

        rerender(<SideLeftBarBase {...defaultProps} isPOIEnabled />);
        bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#912338');
    });

    // ── Independence ──────────────────────────────────────────────────────────

    it('disability and POI buttons toggle independently', () => {
        const { getByTestId } = render(
            <SideLeftBarBase {...defaultProps} isAccessibilityEnabled />
        );
        fireEvent.press(getByTestId('poiPress'));

        const disBg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        const poiBg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;

        expect(disBg).toBe('#912338');
        expect(poiBg).toBe('#912338');
    });

    it('activating POI does not affect disability state', () => {
        const { getByTestId } = render(<SideLeftBarBase {...defaultProps} />);
        fireEvent.press(getByTestId('poiPress'));
        const disBg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(disBg).toBe('#ccc');
    });

    it('accessibility prop does not activate POI', () => {
        const { getByTestId } = render(
            <SideLeftBarBase {...defaultProps} isAccessibilityEnabled />
        );
        const poiBg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(poiBg).toBe('#ccc');
    });

    // ── Default parameter branches (lines 11-14) ──────────────────────────────
    // Each optional prop has a default value that is only exercised when the
    // caller omits that prop entirely. These tests hit those branches and also
    // invoke the default () => {} callbacks to cover the function gap.

    it('renders correctly with only the required topSection prop', () => {
        // Exercises: isAccessibilityEnabled=false, isPOIEnabled=false defaults
        const { getByTestId } = render(<SideLeftBarBase topSection={topSection} />);
        expect(getByTestId('disPress')).toBeTruthy();
        expect(getByTestId('poiPress')).toBeTruthy();
    });

    it('default onToggleAccessibility does not throw when disability is pressed without handler', () => {
        // Exercises: onToggleAccessibility = () => {} default function
        const { getByTestId } = render(<SideLeftBarBase topSection={topSection} />);
        expect(() => fireEvent.press(getByTestId('disPress'))).not.toThrow();
    });

    it('default onTogglePOI does not throw when POI is pressed without handler', () => {
        // Exercises: onTogglePOI = () => {} default function
        const { getByTestId } = render(<SideLeftBarBase topSection={topSection} />);
        expect(() => fireEvent.press(getByTestId('poiPress'))).not.toThrow();
    });

    it('disability button defaults to grey when isAccessibilityEnabled is omitted', () => {
        const { getByTestId } = render(<SideLeftBarBase topSection={topSection} />);
        const bg = [getByTestId('disPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

    it('POI button defaults to grey when isPOIEnabled is omitted', () => {
        const { getByTestId } = render(<SideLeftBarBase topSection={topSection} />);
        const bg = [getByTestId('poiPress').props.style].flat()
            .find(s => s?.backgroundColor)?.backgroundColor;
        expect(bg).toBe('#ccc');
    });

});