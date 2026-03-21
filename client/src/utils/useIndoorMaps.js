import { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';

export default function useIndoorMaps(height) {
    const SHEET_COLLAPSED  = height * 0.11;
    const SHEET_EXPANDED   = height * 0.45;
    const SHEET_DIRECTIONS = height * 0.6;

    const [selectedFloor, setSelectedFloor] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [classroomInput, setClassroomInput] = useState('');

    const [buildingData, setBuildingData] = useState({});
    const [directionsFrom, setDirectionsFrom] = useState({ building: null, floor: null, room: null });
    const [directionsTo,   setDirectionsTo]   = useState({ building: null, floor: null, room: null });

    // TO FETCH DATA FROM BACKEND !!!!!!!!!!!!!!!!!!!!!!!!!!1
    useEffect(() => {
        // MOCK INFO (here we replace with proper API call after)
        const mockData = {
            H:  { floors: ['1','2','3','4','5','6','7','8','9', '10', '11', '12'], rooms: { '1':['101','102','110'],'2':['201','202','210'],'3':['301','302'],'4':['401','410'],'5':['501'],'6':['601'],'7':['701'],'8':['801'],'9':['901'] } },
            MB: { floors: ['1','2','S1','S2'], rooms: { '1':['1.100','1.200'],'2':['2.100','2.200'],'S1':['S1.01'],'S2':['S2.01'] } },
        };
        setBuildingData(mockData);
    }, []);

    const BUILDINGS_LIST = Object.keys(buildingData);
    const getFloors = (b)    => (buildingData[b]?.floors ?? []);
    const getRooms  = (b, f) => (buildingData[b]?.rooms?.[f] ?? []);

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
        //sheet for consistency
        sheetHeight,
        panResponder,
        handleTabPress,
        //tabs
        activeTab,
        //floors tab
        selectedFloor,
        setSelectedFloor,
        classroomInput,
        setClassroomInput,
        BUILDINGS_LIST,
        getFloors,
        getRooms,
        // directions handling
        directionsFrom,
        setDirectionsFrom,
        directionsTo,
        setDirectionsTo,
        handleSwapDirections,
    };
}