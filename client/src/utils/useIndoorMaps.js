import { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { indoorMaps } from '../../indoorData';

export default function useIndoorMaps(height, campus, buildingCode) {
    const SHEET_COLLAPSED  = height * 0.11;
    const SHEET_EXPANDED   = height * 0.45;
    const SHEET_DIRECTIONS = height * 0.6;

    const [selectedFloor, setSelectedFloor] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [classroomInput, setClassroomInput] = useState('');
    const [directionsFrom, setDirectionsFrom] = useState({ building: null, floor: null, room: null });
    const [directionsTo,   setDirectionsTo]   = useState({ building: null, floor: null, room: null });

    //first available floor is selected
    useEffect(() => {
        if (!campus || !buildingCode) return;
        const buildingData = indoorMaps?.[campus]?.[buildingCode];
        if (!buildingData) return;
        const firstFloor = Object.keys(buildingData)[0];
        setSelectedFloor(firstFloor);
    }, [campus, buildingCode]);

    const BUILDINGS_LIST = Object.keys(indoorMaps?.[campus] ?? {});

    //retunr floor keys as strings
    const getFloors = (bCode) => {
        if (!bCode) return [];
        const data = indoorMaps?.[campus]?.[bCode];
        return data ? Object.keys(data) : [];
    };

    // return room id from the floor's json data
    const getRooms = (bCode, floor) => {
        if (!bCode || !floor) return [];
        const floorEntry = indoorMaps?.[campus]?.[bCode]?.[floor]
                        ?? indoorMaps?.[campus]?.[bCode]?.[Number(floor)];
        if (!floorEntry?.data?.rooms) return [];
        return floorEntry.data.rooms.map(r => r.id);
    };

    const handleSwapDirections = () => {
        setDirectionsFrom(directionsTo);
        setDirectionsTo(directionsFrom);
    };

    const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
    const lastHeight  = useRef(SHEET_COLLAPSED);

    const animateSheet = (toValue) => {
        Animated.spring(sheetHeight, {
            toValue,
            useNativeDriver: false,
        }).start();
        lastHeight.current = toValue;
    };

    const expandSheet = (tab) => {
        animateSheet(tab === 'directions' ? SHEET_DIRECTIONS : SHEET_EXPANDED);
    };

    const collapseSheet = () => {
        animateSheet(SHEET_COLLAPSED);
        setActiveTab(null);
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove: (_, g) => {
                const next = lastHeight.current - g.dy;
                if (next >= SHEET_COLLAPSED && next <= SHEET_DIRECTIONS) {
                    sheetHeight.setValue(next);
                }
            },
            onPanResponderRelease: (_, g) => {
                const next = lastHeight.current - g.dy;
                if (next > (SHEET_COLLAPSED + SHEET_EXPANDED) / 2) {
                    expandSheet(activeTab);
                } else {
                    collapseSheet();
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