import { useState, useRef, useEffect } from 'react';
import { Animated, PanResponder } from 'react-native';
import { indoorMaps } from '../data/indoorData';
import { extractFloorPlan } from './floorPlanUtils';

function getBuildingIndoorData(campus, bCode) {
    if (!campus || !bCode) return null;
    return indoorMaps?.[campus]?.[bCode] ?? null;
}

function normalizeCode(code) {
    return String(code ?? "").trim().toUpperCase();
}

function parseBuildingOption(opt, fallbackCampus) {
    const m = String(opt ?? '').match(/^(.+?)\s*\((.+?)\)$/);
    if (m) return { code: normalizeCode(m[1]), campus: m[2].trim() };
    return { code: normalizeCode(opt), campus: fallbackCampus };
}

/**
 * Sort floor keys so pure-integer keys (1, 2, …, 9) come first in numeric
 * order, followed by alphanumeric keys (S1, S2, H-2, …) in locale order.
 * This is more reliable than relying on localeCompare({ numeric: true })
 * which Hermes on Android may not fully support.
 */
function sortedFloorKeys(buildingData) {
    return Object.keys(buildingData)
        .filter(k => buildingData[k]?.image != null)
        .sort((a, b) => {
            const na = Number(a);
            const nb = Number(b);
            const aIsInt = Number.isFinite(na) && String(na) === String(a);
            const bIsInt = Number.isFinite(nb) && String(nb) === String(b);
            if (aIsInt && bIsInt) return na - nb;      // both integers: numeric order
            if (aIsInt) return -1;                      // integer before string
            if (bIsInt) return 1;                       // string after integer
            return String(a).localeCompare(String(b), undefined, { numeric: true });
        });
}

export default function useIndoorMaps(height, campus, buildingCode, _buildings = []) {
    const SHEET_COLLAPSED = height * 0.11;
    const SHEET_EXPANDED = height * 0.45;
    const SHEET_DIRECTIONS = height * 0.72;
    const SHEET_DIRECTIONS_MAX = height * 0.92;

    const [selectedFloor,  setSelectedFloor]  = useState(null);
    const [activeTab,      setActiveTab]      = useState(null);
    const [classroomInput, setClassroomInput] = useState('');
    const [directionsFrom, setDirectionsFrom] = useState({ building: null, floor: null, room: null });
    const [directionsTo,   setDirectionsTo]   = useState({ building: null, floor: null, room: null });

    // Auto-select the LOWEST numbered floor (numerically sorted) when the
    // building or campus changes. Previously used Object.keys()[0] which
    // depends on insertion order in indoorData.js — unreliable and caused
    // MB to default to "S2" instead of "MB1".
    useEffect(() => {
        if (!campus || !buildingCode) return;
        const buildingData = indoorMaps?.[campus]?.[buildingCode];
        if (!buildingData) return;
        const floors = sortedFloorKeys(buildingData);
        const firstFloor = floors[0] ?? Object.keys(buildingData)[0];
        setSelectedFloor(firstFloor);
    }, [campus, buildingCode]);

    useEffect(() => {
        if (!buildingCode || !selectedFloor) return;
        const label = `${String(buildingCode).toUpperCase()} (${campus})`;
        setDirectionsFrom((prev) => (
            prev?.building ? prev : { building: label, floor: selectedFloor, room: null }
        ));
        setDirectionsTo((prev) => (
            prev?.building ? prev : { building: label, floor: selectedFloor, room: null }
        ));
    }, [buildingCode, selectedFloor]);

    const seen = new Set();
    const allBuildingEntries = [];

    for (const c of Object.keys(indoorMaps ?? {})) {
        for (const rawCode of Object.keys(indoorMaps[c] ?? {})) {
            const code = normalizeCode(rawCode);
            if (!code) continue;
            const key = `${c}-${code}`;
            if (!seen.has(key)) {
                seen.add(key);
                allBuildingEntries.push({ code, campus: c });
            }
        }
    }

    const currentCode = normalizeCode(buildingCode);
    const currentKey = `${campus}-${currentCode}`;
    if (currentCode && !seen.has(currentKey)) {
        allBuildingEntries.push({ code: currentCode, campus });
    }

    const BUILDINGS_LIST = allBuildingEntries
        .slice()
        .sort((a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }))
        .map(({ code, campus: c }) => `${code} (${c})`);

    const getFloors = (bOpt) => {
        if (!bOpt) return [];
        const { code, campus: c } = parseBuildingOption(bOpt, campus);
        const data = getBuildingIndoorData(c, code);
        if (!data) return [];
        return Object.keys(data)
            .filter((floor) => data[floor]?.image != null)
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    };

    const getRooms = (bOpt, floor) => {
        if (!bOpt || !floor) return [];
        const { code, campus: c } = parseBuildingOption(bOpt, campus);
        const bData = getBuildingIndoorData(c, code);
        const floorEntry = bData?.[floor] ?? bData?.[Number(floor)];
        if (!floorEntry?.data) return [];
        const floorPlan = extractFloorPlan(floorEntry.data, floor);
        if (!floorPlan?.rooms) return [];
        return [...new Set(
            floorPlan.rooms
                .filter((r) => {
                    const type = String(r?.type || '').toLowerCase().trim();
                    const id = String(r?.id || '').toLowerCase().trim();
                    if (type !== 'classroom') return false;
                    if (id.includes('hallway') || id.includes('corridor') || id.includes('stair')) return false;
                    return true;
                })
                .map((r) => String(r.id))
                .filter(Boolean)
        )];
    };

    const handleSwapDirections = () => {
        setDirectionsFrom(directionsTo);
        setDirectionsTo(directionsFrom);
    };

    const sheetHeight = useRef(new Animated.Value(SHEET_COLLAPSED)).current;
    const lastHeight = useRef(SHEET_COLLAPSED);
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
                const nearest = candidates.reduce(
                    (best, c) => (Math.abs(c - clamped) < Math.abs(best - clamped) ? c : best),
                    candidates[0]
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