import { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { indoorMaps } from '../../indoorData';
import { API_URL } from '@env';

// Extract floor plan from the nested JSON structure
function extractFloorPlan(dataField, floorKey) {
    if (!dataField || typeof dataField !== 'object') return null;
    const key = String(floorKey);
    if (dataField[key] !== undefined) return dataField[key];
    const suffixMatch = Object.keys(dataField).find(k => k.endsWith(key));
    if (suffixMatch) return dataField[suffixMatch];
    return dataField[Object.keys(dataField)[0]] ?? null;
}

// looks up a building's data across both campuse
function findBuildingData(bCode) {
    return indoorMaps?.['SGW']?.[bCode] ?? indoorMaps?.['Loyola']?.[bCode] ?? null;
}

// Fetches building codes for one campus, falls back to indoorData keys on failure.
async function fetchCampusBuildings(campus) {
    try {
        const res  = await fetch(`${API_URL}/campus/${campus}/buildings`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.buildings ?? []);
        return list.map(b => b.code).filter(Boolean);
    } catch {
        return Object.keys(indoorMaps?.[campus] ?? {});
    }
}

export default function useIndoorMaps(height, campus, buildingCode) {
    const SHEET_COLLAPSED  = height * 0.11;
    const SHEET_EXPANDED   = height * 0.45;
    const SHEET_DIRECTIONS = height * 0.6;

    const [selectedFloor,  setSelectedFloor]  = useState(null);
    const [activeTab,      setActiveTab]      = useState(null);
    const [classroomInput, setClassroomInput] = useState('');
    const [directionsFrom, setDirectionsFrom] = useState({ building: null, floor: null, room: null });
    const [directionsTo,   setDirectionsTo]   = useState({ building: null, floor: null, room: null });

    //all buildings for this campus fetched from the server to be displayed after
    const [allBuildings, setAllBuildings] = useState([]);

    useEffect(() => {
        async function loadAllBuildings() {
            const [sgw, loyola] = await Promise.all([
                fetchCampusBuildings('SGW'),
                fetchCampusBuildings('Loyola'),
            ]);
            setAllBuildings([...sgw, ...loyola]);
        }
        loadAllBuildings();
    }, []);  // runs once cuz building list shouldnt change with campus

    // Auto-select first available floor when building or campus changes
    useEffect(() => {
        if (!campus || !buildingCode) return;
        const buildingData = indoorMaps?.[campus]?.[buildingCode];
        if (!buildingData) return;
        const firstFloor = Object.keys(buildingData)[0];
        setSelectedFloor(firstFloor);
    }, [campus, buildingCode]);

    // All campus buildings from the server
    const BUILDINGS_LIST = allBuildings.length > 0
        ? allBuildings
        : Object.keys(indoorMaps?.[campus] ?? {});

    // Returns floors only when the building has JSON data in indoorData
    const getFloors = (bCode) => {
        if (!bCode) return [];
        const data = findBuildingData(bCode);
        if (!data) return [];
        return Object.keys(data).filter(floor => data[floor]?.data != null);
    };

    // Extract classroom room IDs from the floor's JSON data
    const getRooms = (bCode, floor) => {
        if (!bCode || !floor) return [];
        const bData = findBuildingData(bCode);
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
    const lastHeight  = useRef(SHEET_COLLAPSED);

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

    const onPanMove = (_, g) => {
        const next = lastHeight.current - g.dy;
        if (next >= SHEET_COLLAPSED && next <= SHEET_DIRECTIONS) {
            sheetHeight.setValue(next);
        }
    };

    const onPanRelease = (_, g) => {
        const next = lastHeight.current - g.dy;
        const mid  = (SHEET_COLLAPSED + SHEET_EXPANDED) / 2;
        if (next > mid) {
            expandSheet(activeTab);
        } else {
            collapseSheet();
        }
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove:   onPanMove,
            onPanResponderRelease: onPanRelease,
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