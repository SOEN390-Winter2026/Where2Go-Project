import { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { indoorMaps } from '../data/indoorData';
import { extractFloorPlan } from './floorPlanUtils';
import { API_BASE_URL } from '../config';

// Indoor JSON for this campus only (avoids mixing Loyola/SGW when the directions list includes all API codes)
function getBuildingIndoorData(campus, bCode) {
    if (!campus || !bCode) return null;
    return indoorMaps?.[campus]?.[bCode] ?? null;
}

// Fetches building codes for one campus, falls back to indoorData keys on failure.
async function fetchCampusBuildings(campus) {
    try {
        const res  = await fetch(`${API_BASE_URL}/campus/${campus}/buildings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.buildings ?? []);
        return list.map(b => String(b?.code ?? "").trim()).filter(Boolean);
    } catch {
        return Object.keys(indoorMaps?.[campus] ?? {});
    }
}

function normalizeCode(code) {
    return String(code ?? "").trim().toUpperCase();
}

export default function useIndoorMaps(height, campus, buildingCode, _buildings = []) {
    const SHEET_COLLAPSED = height * 0.11;
    const SHEET_EXPANDED = height * 0.45;
    /** Default height when opening the directions tab. */
    const SHEET_DIRECTIONS = height * 0.72;
    /** Extra-tall snap when on directions so long step lists are reachable (drag handle up). */
    const SHEET_DIRECTIONS_MAX = height * 0.92;

    const [selectedFloor,  setSelectedFloor]  = useState(null);
    const [activeTab,      setActiveTab]      = useState(null);
    const [classroomInput, setClassroomInput] = useState('');
    const [directionsFrom, setDirectionsFrom] = useState({ building: null, floor: null, room: null });
    const [directionsTo,   setDirectionsTo]   = useState({ building: null, floor: null, room: null });

    //all buildings for this campus fetched from the server to be displayed after
    const [allBuildings, setAllBuildings] = useState([]);

    useEffect(() => {
        let cancelled = false;
        async function loadForCampus() {
            if (!campus) {
                setAllBuildings([]);
                return;
            }
            const codes = await fetchCampusBuildings(campus);
            if (!cancelled) setAllBuildings(codes);
        }
        loadForCampus();
        return () => { cancelled = true; };
    }, [campus]);

    // Auto-select first available floor when building or campus changes
    useEffect(() => {
        if (!campus || !buildingCode) return;
        const buildingData = indoorMaps?.[campus]?.[buildingCode];
        if (!buildingData) return;
        const firstFloor = Object.keys(buildingData)[0];
        setSelectedFloor(firstFloor);
    }, [campus, buildingCode]);

    // Keep directions defaults anchored to the building/floor currently open in IndoorMaps.
    useEffect(() => {
        if (!buildingCode || !selectedFloor) return;
        setDirectionsFrom((prev) => (
            prev?.building ? prev : { building: String(buildingCode).toUpperCase(), floor: selectedFloor, room: null }
        ));
        setDirectionsTo((prev) => (
            prev?.building ? prev : { building: String(buildingCode).toUpperCase(), floor: selectedFloor, room: null }
        ));
    }, [buildingCode, selectedFloor]);

    // Show only buildings that have indoor floor plans on this campus; this guarantees selection is routable.
    const indoorCodes = Object.keys(indoorMaps?.[campus] ?? {}).map(normalizeCode).filter(Boolean);
    const currentCode = normalizeCode(buildingCode);
    const mergedCodes = [...indoorCodes, currentCode].filter(Boolean);
    const BUILDINGS_LIST = [...new Set(mergedCodes)].sort((a, b) =>
        String(a).localeCompare(String(b), undefined, { numeric: true })
    );

    // Returns floors only when the building has JSON data in indoorData (numeric order, e.g. 2,4,…,12)
    const getFloors = (bCode) => {
        if (!bCode) return [];
        const data = getBuildingIndoorData(campus, bCode);
        if (!data) return [];
        return Object.keys(data)
            .filter((floor) => data[floor]?.image != null)
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    };

    // Extract classroom room IDs from the floor's JSON data
    const getRooms = (bCode, floor) => {
        if (!bCode || !floor) return [];
        const bData = getBuildingIndoorData(campus, bCode);
        const floorEntry = bData?.[floor] ?? bData?.[Number(floor)];
        if (!floorEntry?.data) return [];
        const floorPlan = extractFloorPlan(floorEntry.data, floor);
        if (!floorPlan?.rooms) return [];
        return [...new Set(
            floorPlan.rooms
                .filter(r => r.type === 'classroom')
                .map(r => String(r.id))
        )];
    };

    const handleSwapDirections = () => {
        setDirectionsFrom(directionsTo);
        setDirectionsTo(directionsFrom);
    };

    const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
    const lastHeight = useRef(SHEET_COLLAPSED);
    /** Keeps pan callbacks in sync (PanResponder is created once). */
    const sheetMetricsRef = useRef({});

    const animateSheet = (toValue) => {
        Animated.spring(sheetHeight, { toValue, useNativeDriver: false }).start();
        lastHeight.current = toValue;
    };

    const expandSheet = (tab) => {
        animateSheet(tab === 'directions' ? SHEET_DIRECTIONS : SHEET_EXPANDED);
    };

    const collapseSheet = () => {
        animateSheet(SHEET_COLLAPSED);
        setActiveTab(null);
    };

    sheetMetricsRef.current = {
        activeTab,
        SHEET_COLLAPSED,
        SHEET_EXPANDED,
        SHEET_DIRECTIONS,
        SHEET_DIRECTIONS_MAX,
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove: (_, g) => {
                const s = sheetMetricsRef.current;
                const max = s.activeTab === 'directions' ? s.SHEET_DIRECTIONS_MAX : s.SHEET_EXPANDED;
                const next = lastHeight.current - g.dy;
                if (next >= s.SHEET_COLLAPSED && next <= max) {
                    sheetHeight.setValue(next);
                }
            },
            onPanResponderRelease: (_, g) => {
                const s = sheetMetricsRef.current;
                const max = s.activeTab === 'directions' ? s.SHEET_DIRECTIONS_MAX : s.SHEET_EXPANDED;
                const next = lastHeight.current - g.dy;
                const clamped = Math.min(Math.max(next, s.SHEET_COLLAPSED), max);
                const candidates =
                    s.activeTab === 'directions'
                        ? [s.SHEET_COLLAPSED, s.SHEET_DIRECTIONS, s.SHEET_DIRECTIONS_MAX]
                        : [s.SHEET_COLLAPSED, s.SHEET_EXPANDED];
                const nearest = candidates.reduce((best, c) =>
                    Math.abs(c - clamped) < Math.abs(best - clamped) ? c : best
                );
                animateSheet(nearest);
                if (nearest === s.SHEET_COLLAPSED) {
                    setActiveTab(null);
                }
            },
        })
    ).current;

    const handleTabPress = (tab) => {
        if (activeTab === tab) {
            collapseSheet();
        } else {
            setActiveTab(tab);
            expandSheet(tab);
        }
    };

    return {
        sheetHeight,
        panResponder,
        handleTabPress,
        activeTab,
        selectedFloor,
        setSelectedFloor,
        classroomInput,
        setClassroomInput,
        BUILDINGS_LIST,
        getFloors,
        getRooms,
        directionsFrom,
        setDirectionsFrom,
        directionsTo,
        setDirectionsTo,
        handleSwapDirections,
    };
}