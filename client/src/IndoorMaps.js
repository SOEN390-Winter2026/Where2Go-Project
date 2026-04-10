import React, { useRef, useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    Platform,
    StatusBar,
    useWindowDimensions,
    Image,
    Animated,
    ActivityIndicator,
    StyleSheet,
    Pressable,
    Modal,
    TouchableOpacity,
    Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PropTypes from 'prop-types';
import IndoorSideLeftBar from './IndoorSideLeftBar';
import IndoorMapsBottomSheet from './IndoorMapsBottomSheet';
import styles from './styles/IndoorMapsStyles';
import useIndoorMaps from './utils/useIndoorMaps';
import { indoorMaps } from './data/indoorData';
import { extractFloorPlan } from './utils/floorPlanUtils';
import { getPOIOverlay } from './data/indoorPoisLogic';
import { buildInterBuildingDirections } from './services/interBuildingDirections';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { BURGUNDY_LIGHT } from './styles/Map_styles';
import {
    buildIndoorRoutePolylinesByFloor,
    getPolylinesForFloor,
} from './utils/indoorRouteOverlay';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.75;
const INDOOR_ROUTE_STROKE_DASH = [8, 6];
const DEFAULT_ROUTE_COLOR = BURGUNDY_LIGHT;
const ACCESSIBLE_ROUTE_COLOR = '#F4C542';
const ACCESSIBLE_ROUTE_GLOW = '#FFE680';

const clamp = (value, max) => Math.min(Math.max(value, -max), max);

const getMaxTranslate = (containerSize, s) => ({
    x: (containerSize.width * (s - 1)) / 2,
    y: (containerSize.height * (s - 1)) / 2,
});

const clampTranslation = (containerSize, tx, ty, s) => {
    const { x: maxX, y: maxY } = getMaxTranslate(containerSize, s);
    return { x: clamp(tx, maxX), y: clamp(ty, maxY) };
};

const routePolylineKey = (pts) => {
    if (!Array.isArray(pts) || pts.length === 0) return 'indoor-route-empty';
    const first = pts[0];
    const last = pts.at(-1);
    return `indoor-route-${pts.length}-${first?.x}-${first?.y}-${last?.x}-${last?.y}`;
};

const roomLabelKey = (room) => {
    const b = room?.bounds || {};
    return `${String(room?.id || 'room')}|${b.x}|${b.y}|${b.w}|${b.h}`;
};

// Compute rendered image rect inside a contain-mode container
function getContainBounds(containerW, containerH, imageAspect) {
    if (!containerW || !containerH || !imageAspect) return null;
    const containerAspect = containerW / containerH;
    if (imageAspect > containerAspect) {
        const h = containerW / imageAspect;
        return { left: 0, top: (containerH - h) / 2, width: containerW, height: h };
    }
    const w = containerH * imageAspect;
    return { left: (containerW - w) / 2, top: 0, width: w, height: containerH };
}

function ZoomButton({ iconName, onPress, accessibilityLabel }) {
    // Add testID for testability
    let testID;
    if (iconName === 'add') testID = 'zoom-in-btn';
    else if (iconName === 'remove') testID = 'zoom-out-btn';
    else if (iconName === 'locate-outline') testID = 'recenter-btn';
    return (
        <Pressable
            style={({ pressed }) => [styles.zoomBtn, pressed && styles.zoomBtnPressed]}
            onPress={onPress}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            testID={testID}
        >
            <Ionicons name={iconName} size={22} color="#912338" />
        </Pressable>
    );
}

ZoomButton.propTypes = {
    iconName: PropTypes.string.isRequired,
    onPress: PropTypes.func.isRequired,
    accessibilityLabel: PropTypes.string.isRequired,
};

function IndoorRouteOverlay({
  containBounds,
  containerWidth,
  containerHeight,
  routePolylines,
  isAccessibilityEnabled,
})  {
    if (
        !containBounds
        || !containerWidth
        || !routePolylines?.length
    ) {
        return null;
    }

    const toPx = (p) => ({
        x: containBounds.left + p.x * containBounds.width,
        y: containBounds.top + p.y * containBounds.height,
    });

    return (
        <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width={containerWidth}
            height={containerHeight}
            testID="indoor-route-overlay"
        >
            {routePolylines.map((pts) => {
                if (!pts?.length) return null;
                const pxPts = pts.map(toPx);
                const pointsStr = pxPts.map((q) => `${q.x},${q.y}`).join(' ');
                return (
                    <React.Fragment key={routePolylineKey(pts)}>
                        {pxPts.length >= 2 ? (
                        <>
                            {isAccessibilityEnabled ? (
                            <Polyline
                                points={pointsStr}
                                fill="none"
                                stroke={ACCESSIBLE_ROUTE_GLOW}
                                strokeWidth={10}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.9}
                            />
                            ) : null}

                            <Polyline
                            points={pointsStr}
                            fill="none"
                            stroke={isAccessibilityEnabled ? ACCESSIBLE_ROUTE_COLOR : DEFAULT_ROUTE_COLOR}
                            strokeWidth={isAccessibilityEnabled ? 6 : 4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={INDOOR_ROUTE_STROKE_DASH}
                            />
                        </>
                        ) : null}
                        {pxPts.length > 0 ? (
                            <>
                                <Circle
                                    cx={pxPts[0].x}
                                    cy={pxPts[0].y}
                                    r={6}
                                    fill={isAccessibilityEnabled ? ACCESSIBLE_ROUTE_COLOR : DEFAULT_ROUTE_COLOR}
                                    stroke="#fff"
                                    strokeWidth={2}
                                />
                                {pxPts.length > 1 ? (
                                    <Circle
                                        cx={pxPts[pxPts.length - 1].x}
                                        cy={pxPts[pxPts.length - 1].y}
                                        r={6}
                                        fill={isAccessibilityEnabled ? ACCESSIBLE_ROUTE_COLOR : DEFAULT_ROUTE_COLOR}
                                        stroke="#fff"
                                        strokeWidth={2}
                                    />
                                ) : null}
                            </>
                        ) : null}
                    </React.Fragment>
                );
            })}
        </Svg>
    );
}

IndoorRouteOverlay.propTypes = {
    containBounds: PropTypes.shape({
        left: PropTypes.number,
        top: PropTypes.number,
        width: PropTypes.number,
        height: PropTypes.number,
    }),
    containerWidth: PropTypes.number,
    containerHeight: PropTypes.number,
    routePolylines: PropTypes.arrayOf(
        PropTypes.arrayOf(PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }))
    ),
    isAccessibilityEnabled: PropTypes.bool,
};

IndoorRouteOverlay.defaultProps = {
    containBounds: null,
    containerWidth: 0,
    containerHeight: 0,
    routePolylines: [],
    isAccessibilityEnabled: false,
};

function ZoomableImage({ source, rooms, onRoomPress, poiOverlay, isPOIEnabled, targetRoom, routePolylines, isAccessibilityEnabled }) {
    const scale = useRef(new Animated.Value(1)).current;
    const lastScale = useRef(1);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);
    const isPinching = useRef(false);
    const containerSize = useRef({ width: 0, height: 0 });

    const [isZoomed, setIsZoomed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [containerDims, setContainerDims] = useState({ width: 0, height: 0 });
    const [imageAspect, setImageAspect] = useState(null);

    // resolve natural image aspect ratio for letterbox calculation
    useEffect(() => {
        try {
            const asset = Image.resolveAssetSource(source);
            if (asset?.width && asset?.height) {
                setImageAspect(asset.width / asset.height);
            }
        } catch (e) {
            console.warn('IndoorMaps: could not resolve asset source for label overlay:', e?.message);
        }
    }, [source]);

    const hasShownInitialHighlight = useRef(false);
    const [highlightedRoomId, setHighlightedRoomId] = useState(null);

    useEffect(() => {
    if (!targetRoom || !rooms || rooms.length === 0 || hasShownInitialHighlight.current) return;

    const normalizedTarget = String(targetRoom).toLowerCase();
    const matchedRoom = rooms.find(r => {
        const rId = String(r.id).toLowerCase();
        return rId === normalizedTarget || rId.endsWith(normalizedTarget);
    });

    if (matchedRoom) {
        hasShownInitialHighlight.current = true; // Lock it immediately
        setHighlightedRoomId(matchedRoom.id);

        const timer = setTimeout(() => {
            setHighlightedRoomId(null);
        }, 6000);

        return () => {
            clearTimeout(timer);
            setHighlightedRoomId(null); 
        };
    }
}, [targetRoom, rooms.length]);

    const commitTranslation = (tx, ty, s, animated = false) => {
        const { x, y } = clampTranslation(containerSize.current, tx, ty, s);
        lastTranslateX.current = x;
        lastTranslateY.current = y;
        if (animated) {
            Animated.spring(translateX, { toValue: x, useNativeDriver: true }).start();
            Animated.spring(translateY, { toValue: y, useNativeDriver: true }).start();
        } else {
            translateX.setValue(x);
            translateY.setValue(y);
        }
    };

    const previewTranslation = (tx, ty, s) => {
        const { x, y } = clampTranslation(containerSize.current, tx, ty, s);
        translateX.setValue(x);
        translateY.setValue(y);
    };

    const resetToOrigin = (animated = false) => {
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        if (animated) {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        } else {
            translateX.setValue(0);
            translateY.setValue(0);
        }
    };

    const applyScale = (next, animated = false) => {
        lastScale.current = next;
        if (animated) {
            Animated.spring(scale, { toValue: next, useNativeDriver: true }).start();
        } else {
            scale.setValue(next);
        }
        if (next <= MIN_SCALE) {
            resetToOrigin(animated);
            setIsZoomed(false);
        } else {
            commitTranslation(lastTranslateX.current, lastTranslateY.current, next, animated);
            setIsZoomed(true);
        }
    };

    const handleZoomIn = () => applyScale(Math.min(lastScale.current + ZOOM_STEP, MAX_SCALE), true);
    const handleZoomOut = () => applyScale(Math.max(lastScale.current - ZOOM_STEP, MIN_SCALE), true);
    const handleRecenter = () => {
        lastScale.current = MIN_SCALE;
        lastTranslateX.current = 0;
        lastTranslateY.current = 0;
        Animated.parallel([
            Animated.spring(scale, { toValue: MIN_SCALE, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
        ]).start();
        setIsZoomed(false);
    };

    const pinchGesture = Gesture.Pinch()
        .onStart(() => { isPinching.current = true; })
        .onUpdate((e) => {
            scale.setValue(Math.min(Math.max(lastScale.current * e.scale, MIN_SCALE), MAX_SCALE));
        })
        .onEnd((e) => {
            const next = Math.min(Math.max(lastScale.current * e.scale, MIN_SCALE), MAX_SCALE);
            applyScale(next);
            isPinching.current = false;
        })
        .runOnJS(true);

    const panGesture = Gesture.Pan()
        .enabled(isZoomed)
        .onUpdate((e) => {
            if (isPinching.current) return;
            previewTranslation(
                lastTranslateX.current + e.translationX,
                lastTranslateY.current + e.translationY,
                lastScale.current
            );
        })
        .onEnd((e) => {
            if (isPinching.current) return;
            commitTranslation(
                lastTranslateX.current + e.translationX,
                lastTranslateY.current + e.translationY,
                lastScale.current
            );
        })
        .runOnJS(true);

    const composed = Gesture.Simultaneous(pinchGesture, panGesture);
    const containBounds = getContainBounds(containerDims.width, containerDims.height, imageAspect);

    return (
        <View
            testID="zoomable-container"
            style={styles.zoomableContainer}
            onLayout={({ nativeEvent: { layout } }) => {
                containerSize.current = { width: layout.width, height: layout.height };
                setContainerDims({ width: layout.width, height: layout.height });
            }}
        >
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#912338" />
                </View>
            )}
            <GestureDetector gesture={composed}>
                <Animated.View style={[
                    styles.zoomableAnimatedView,
                    { transform: [{ translateX }, { translateY }, { scale }] },
                ]}>
                    {/* Base floor plan */}
                    <Image
                        source={source}
                        style={styles.mapImage}
                        resizeMode="contain"
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />

                    {/* POI overlay */}
                    {poiOverlay && (
                        <Image
                            source={poiOverlay}
                            style={[styles.poiOverlay, { opacity: isPOIEnabled ? 1 : 0 }]}
                            resizeMode="contain"
                            pointerEvents="none"
                        />
                    )}

                    {/* maestro poi loaded */}
                    {isPOIEnabled && (
                        <Text
                            style={{ position: 'absolute', color: 'transparent', fontSize: 1 }}
                        >
                            Maestro visible - POI loaded
                        </Text>
                    )}

                    {/* Classroom label overlay */}
                    {containBounds && rooms?.length > 0 && (
                        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                            {rooms.map((room, index) => {
                                const { x, y, w, h } = room.bounds;
                                const cx = containBounds.left + (x + w / 2) * containBounds.width;
                                const cy = containBounds.top + (y + h / 2) * containBounds.height;

                                // Determine if this specific label should change color
                                const isTarget = room.id === highlightedRoomId;

                                return (
                                    <TouchableOpacity
                                        key={`${roomLabelKey(room)}-${index}`}
                                        testID={`room-label-${room.id}`}
                                        style={[
                                            styles.roomLabel,
                                            { left: cx, top: cy },
                                            // CHANGE: Conditional Background Color
                                            isTarget && {
                                                backgroundColor: '#FFD700', // Bright Gold/Yellow
                                                borderColor: '#912338',
                                                borderWidth: 2,
                                                zIndex: 10 // Ensure it sits above other labels
                                            }
                                        ]}
                                        onPress={() => onRoomPress?.(room.id)}
                                    >
                                        <Text style={[
                                            styles.roomLabelText,
                                            // CHANGE: Conditional Text Style
                                            isTarget && { color: '#912338', fontWeight: 'bold' }
                                        ]}>
                                            {room.id}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}

                    <IndoorRouteOverlay
                        containBounds={containBounds}
                        containerWidth={containerDims.width}
                        containerHeight={containerDims.height}
                        routePolylines={routePolylines}
                        isAccessibilityEnabled={isAccessibilityEnabled}
                    />
                </Animated.View>
            </GestureDetector>
            <View style={styles.zoomControls}>
                <ZoomButton iconName="add" onPress={handleZoomIn} accessibilityLabel="Zoom in" />
                <View style={styles.divider} />
                <ZoomButton iconName="remove" onPress={handleZoomOut} accessibilityLabel="Zoom out" />
                <View style={styles.divider} />
                <ZoomButton iconName="locate-outline" onPress={handleRecenter} accessibilityLabel="Recenter map" />
            </View>
        </View>
    );
}

ZoomableImage.propTypes = {
    source: PropTypes.oneOfType([PropTypes.number, PropTypes.object]).isRequired,
    rooms: PropTypes.array,
    onRoomPress: PropTypes.func,
    poiOverlay: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    isPOIEnabled: PropTypes.bool,
    targetRoom: PropTypes.string,
    routePolylines: PropTypes.arrayOf(
        PropTypes.arrayOf(PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }))
    ),
    isAccessibilityEnabled: PropTypes.bool,
};

ZoomableImage.defaultProps = {
    rooms: [],
    onRoomPress: null,
    poiOverlay: null,
    isPOIEnabled: false,
    targetRoom: null,
    routePolylines: [],
    isAccessibilityEnabled: false,
};

function Placeholder({ width, text }) {
    return (
        <View style={styles.placeholderContainer}>
            <Ionicons name="map-outline" size={width * 0.12} color="#ccc" />
            <Text style={styles.placeholderText}>{text}</Text>
        </View>
    );
}

Placeholder.propTypes = {
    width: PropTypes.number.isRequired,
    text: PropTypes.string.isRequired,
};

function FloorMapImage({ campus, buildingCode, selectedFloor, width, onRoomPress, isPOIEnabled, targetRoom, routeByFloor, isAccessibilityEnabled }) {
    const buildingData = indoorMaps?.[campus]?.[buildingCode];
    const routePolylines = getPolylinesForFloor(routeByFloor, selectedFloor);

    if (!selectedFloor) return <Placeholder width={width} text="Select a floor" />;
    if (!buildingData) return <Placeholder width={width} text="No map available." />;

    return (
        <View style={styles.floorLayersContainer}>
            {/* Floor label */}
            <View style={styles.badge} pointerEvents="none">
                <Text style={styles.floorLabelText}>{`Floor ${selectedFloor}`}</Text>
            </View>

            {Object.entries(buildingData).map(([floor, entry]) => {
                const isActive = selectedFloor === floor || Number(selectedFloor) === Number(floor);
                const floorPlan = isActive ? extractFloorPlan(entry?.data, floor) : null;
                const allRooms = (floorPlan?.rooms ?? []).filter(r => r.bounds);
                const poiOverlay = isActive ? getPOIOverlay(campus, buildingCode, floor) : null;

                return (
                    <View
                        key={floor}
                        style={[StyleSheet.absoluteFill, { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }]}
                        pointerEvents={isActive ? 'auto' : 'none'}
                    >
                        {isActive && (entry.image ? (
                            <>
                                <ZoomableImage
                                    source={entry.image}
                                    rooms={allRooms}
                                    onRoomPress={onRoomPress}
                                    poiOverlay={poiOverlay}
                                    isPOIEnabled={isPOIEnabled}
                                    targetRoom={targetRoom}
                                    routePolylines={isActive ? routePolylines : []}
                                    isAccessibilityEnabled={isAccessibilityEnabled}
                                />

                                {!entry.data && (
                                    <View style={styles.navUnavailableBadge}>
                                        <Text style={styles.navUnavailableText}>Navigation unavailable</Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Placeholder width={width} text={`No map for floor ${floor}`} />
                        ))}
                    </View>
                );
            })}
        </View>
    );
}

FloorMapImage.propTypes = {
    campus: PropTypes.string,
    buildingCode: PropTypes.string,
    selectedFloor: PropTypes.string,
    width: PropTypes.number.isRequired,
    onRoomPress: PropTypes.func,
    isPOIEnabled: PropTypes.bool,
    targetRoom: PropTypes.string,
    routeByFloor: PropTypes.object,
    isAccessibilityEnabled: PropTypes.bool,
};

FloorMapImage.defaultProps = {
    onRoomPress: null,
    routeByFloor: null,
    isPOIEnabled: false,
    targetRoom: null,
    isAccessibilityEnabled: false,
};

function RouteFloorSwitcher({ routeFloors, selectedFloor, setSelectedFloor }) {
    if (!routeFloors || routeFloors.length < 2) return null;

    const sorted = [...routeFloors].sort((a, b) => {
        const na = Number.parseFloat(a);
        const nb = Number.parseFloat(b);
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });

    return (
        <View style={styles.routeFloorSwitcher} pointerEvents="box-none">
            <Text style={styles.routeFloorSwitcherLabel}>Floor</Text>
            {sorted.map((floor) => {
                const isActive = selectedFloor === floor ||
                    (!Number.isNaN(Number.parseFloat(floor)) && Number.parseFloat(selectedFloor) === Number.parseFloat(floor));
                return (
                    <Pressable
                        key={floor}
                        testID={`route-floor-btn-${floor}`}
                        style={[styles.routeFloorBtn, isActive && styles.routeFloorBtnActive]}
                        onPress={() => setSelectedFloor(floor)}
                        accessibilityRole="button"
                        accessibilityLabel={`View floor ${floor}`}
                        accessibilityState={{ selected: isActive }}
                    >
                        <Text style={[styles.routeFloorBtnText, isActive && styles.routeFloorBtnTextActive]}>
                            {floor}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

RouteFloorSwitcher.propTypes = {
    routeFloors: PropTypes.arrayOf(PropTypes.string),
    selectedFloor: PropTypes.string,
    setSelectedFloor: PropTypes.func.isRequired,
};

RouteFloorSwitcher.defaultProps = {
    routeFloors: [],
    selectedFloor: null,
};

function RoomActionModal({ visible, roomId, onSetFrom, onSetTo, onClose }) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.roomModalOverlay} onPress={onClose}>
                <View style={styles.roomModalCard}>
                    <Text style={styles.roomModalTitle}>{roomId}</Text>
                    <TouchableOpacity style={styles.roomModalBtn} onPress={onSetFrom}>
                        <Ionicons name="navigate-outline" size={18} color="#912338" />
                        <Text style={styles.roomModalBtnText}>Set as departure</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.roomModalBtn} onPress={onSetTo}>
                        <Ionicons name="location-outline" size={18} color="#912338" />
                        <Text style={styles.roomModalBtnText}>Set as destination</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.roomModalBtn, styles.roomModalBtnCancel]} onPress={onClose}>
                        <Text style={styles.roomModalBtnCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </Modal>
    );
}

RoomActionModal.propTypes = {
    visible: PropTypes.bool.isRequired,
    roomId: PropTypes.string,
    onSetFrom: PropTypes.func.isRequired,
    onSetTo: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

RoomActionModal.defaultProps = { roomId: '' };

export default function IndoorMaps({ building, onPressBack, campus, buildings = [], isAccessibilityEnabled = false,
    onToggleAccessibility = () => {}, onPersistCombinedRoute = () => {}, persistedCombinedSegments = [],
    persistedDirectionsFrom = null, persistedDirectionsTo = null, targetFloor = null, targetRoom = null }) {
    const { width, height } = useWindowDimensions();
    const SHEET_COLLAPSED = height * 0.11;

    const {
        sheetHeight, panResponder, handleTabPress, activeTab,
        selectedFloor, setSelectedFloor,
        classroomInput, setClassroomInput,
        BUILDINGS_LIST, getFloors, getRooms,
        directionsFrom, setDirectionsFrom,
        directionsTo, setDirectionsTo,
        handleSwapDirections,
    } = useIndoorMaps(height, campus, building?.code, buildings);

    const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : height * 0.06;

    const ICON_SIZE = Math.round(width * 0.085);
    const FLOOR_BTN = Math.round(width * 0.11);
    const FONT_LG = Math.round(width * 0.065);
    const FONT_SM = Math.round(width * 0.03);
    const FONT_MD = Math.round(width * 0.038);

    const [roomModal, setRoomModal] = useState({ visible: false, roomId: null });
    //poi state is here so that the sidebar btn and the map can read it
    const [isPOIEnabled, setIsPOIEnabled] = useState(false);
    const [generatingDirections, setGeneratingDirections] = useState(false);
    const [indoorRouteByFloor, setIndoorRouteByFloor] = useState(null);
    const [routeError, setRouteError] = useState(null);
    const [routeSegments, setRouteSegments] = useState(null);

    const keyboardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            Animated.timing(keyboardAnim, {
                toValue: e.endCoordinates.height,
                duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 150,
                useNativeDriver: false, 
            }).start();
        };

        const onHide = (e) => {
            Animated.timing(keyboardAnim, {
                toValue: 0,
                duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 150,
                useNativeDriver: false,
            }).start();
        };

        const showSub = Keyboard.addListener(showEvent, onShow);
        const hideSub = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [keyboardAnim]);

    const allRoomsForBuilding = useMemo(() => {
        if (!building?.code || !campus) return [];
        const buildingData = indoorMaps?.[campus]?.[building.code];
        if (!buildingData) return [];

        const seen = new Set();
        return Object.entries(buildingData)
            .flatMap(([floor, entry]) => {
                const floorPlan = extractFloorPlan(entry?.data, floor);
                return (floorPlan?.rooms ?? [])
                    .filter((r) => r.bounds && r.id)
                    .map((r) => ({ room: r.id, floor }));
            })
            .filter(({ room, floor }) => {
                const key = `${floor}-${room}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [building?.code, campus]);

    useEffect(() => {
        if (!Array.isArray(persistedCombinedSegments) || !persistedCombinedSegments.length) return;
        setRouteError(null);
        setRouteSegments(persistedCombinedSegments);
        setIndoorRouteByFloor(
            buildIndoorRoutePolylinesByFloor(persistedCombinedSegments, building?.code, campus)
        );
        if (persistedDirectionsFrom?.building && persistedDirectionsTo?.building) {
            setDirectionsFrom(persistedDirectionsFrom);
            setDirectionsTo(persistedDirectionsTo);
        }
    }, [persistedCombinedSegments, building?.code, campus]);

    const handleSelectRoom = (room, floor) => {
        setSelectedFloor(floor);
        setClassroomInput(room);
        Keyboard.dismiss();
    };

    const handleGenerateDirections = async () => {
        setIndoorRouteByFloor(null);
        setRouteError(null);
        setRouteSegments(null);
        setGeneratingDirections(true);
        // Yield to the event loop so React can render the loading state before
        // the synchronous graph-build blocks the JS thread.
        await new Promise(resolve => setTimeout(resolve, 0));
        try {
            const result = await buildInterBuildingDirections({
                campus,
                from: directionsFrom,
                to: directionsTo,
                buildings,
                avoidStairs: isAccessibilityEnabled,
            });
            if (result.ok) {
                setRouteSegments(result.segments || null);
                setIndoorRouteByFloor(
                    buildIndoorRoutePolylinesByFloor(result.segments, building?.code, campus)
                );
                if (directionsFrom?.floor) {
                    setSelectedFloor(String(directionsFrom.floor));
                }
                onPersistCombinedRoute(result.segments || [], {
                    from: directionsFrom,
                    to: directionsTo,
                });
            } else {
                setIndoorRouteByFloor(null);
                setRouteError(result.message || "Could not build directions.");
            }
        } catch (e) {
            console.warn("IndoorMaps: could not build directions", e?.message);
            setIndoorRouteByFloor(null);
            setRouteError(e?.message || "Could not build directions.");
        } finally {
            setGeneratingDirections(false);
        }
    };

    const clearRoute = () => {
        setRouteSegments(null);
        setRouteError(null);
        setIndoorRouteByFloor(null);
    };

    const handleSetDirectionsFrom = (v) => { setDirectionsFrom(v); clearRoute(); };
    const handleSetDirectionsTo = (v) => { setDirectionsTo(v); clearRoute(); };
    const handleSwapAndClear = () => { handleSwapDirections(); clearRoute(); };

    const handleRoomPress = (roomId) => setRoomModal({ visible: true, roomId });

    // Navigate to target floor and optionally focus on room when passed as props
    useEffect(() => {
        if (targetFloor) {
            setSelectedFloor(targetFloor);
            // Open room modal after floor is set
            if (targetRoom) {
                const timer = setTimeout(() => {
                    handleRoomPress(targetRoom);
                }, 100);
                return () => clearTimeout(timer);
            }
        } else if (targetRoom) {
            // If only room is specified without floor, open it immediately
            handleRoomPress(targetRoom);
        }
    }, [targetFloor, targetRoom]);

    const handleSetFrom = () => {
        handleSetDirectionsFrom({ building: building?.code, floor: selectedFloor, room: roomModal.roomId });
        setRoomModal({ visible: false, roomId: null });
        handleTabPress('directions');
    };

    const handleSetTo = () => {
        handleSetDirectionsTo({ building: building?.code, floor: selectedFloor, room: roomModal.roomId });
        setRoomModal({ visible: false, roomId: null });
        handleTabPress('directions');
    };

    return (
        <View style={[styles.container, { paddingTop: topPadding }]}>
            <IndoorSideLeftBar
                onPressBack={onPressBack}
                onOpenDirections={() => handleTabPress('directions')}
                isAccessibilityEnabled={isAccessibilityEnabled}
                onToggleAccessibility={onToggleAccessibility}
                isPOIEnabled={isPOIEnabled}
                onTogglePOI={() => setIsPOIEnabled(prev => !prev)}
            />

            <View style={[styles.mapArea, { paddingBottom: SHEET_COLLAPSED }]}>
                <FloorMapImage
                    campus={campus}
                    buildingCode={building?.code}
                    selectedFloor={selectedFloor}
                    width={width}
                    onRoomPress={handleRoomPress}
                    isPOIEnabled={isPOIEnabled}
                    targetRoom={targetRoom}
                    routeByFloor={indoorRouteByFloor}
                    isAccessibilityEnabled={isAccessibilityEnabled}
                />
                <RouteFloorSwitcher
                    routeFloors={indoorRouteByFloor ? Object.keys(indoorRouteByFloor) : []}
                    selectedFloor={selectedFloor}
                    setSelectedFloor={setSelectedFloor}
                />
                {isAccessibilityEnabled && indoorRouteByFloor ? (
                    <View style={styles.accessibilityBanner} pointerEvents="none">
                        <Ionicons name="accessibility" size={16} color="#6B4E00" />
                        <Text style={styles.accessibilityBannerText}>
                            Accessible route active — avoiding stairs when possible
                        </Text>
                    </View>
                ) : null}
                {routeError ? (
                    <View style={styles.routeErrorBanner} pointerEvents="none">
                        <Text style={styles.routeErrorText}>{routeError}</Text>
                    </View>
                ) : null}
            </View>

            <IndoorMapsBottomSheet
                sheetHeight={sheetHeight}
                panResponder={panResponder}
                activeTab={activeTab}
                handleTabPress={handleTabPress}
                campus={campus}
                building={building}
                ICON_SIZE={ICON_SIZE}
                FONT_LG={FONT_LG}
                FONT_SM={FONT_SM}
                FONT_MD={FONT_MD}
                FLOOR_BTN={FLOOR_BTN}
                classroomInput={classroomInput}
                setClassroomInput={setClassroomInput}
                selectedFloor={selectedFloor}
                setSelectedFloor={setSelectedFloor}
                BUILDINGS_LIST={BUILDINGS_LIST}
                getFloors={getFloors}
                getRooms={getRooms}
                directionsFrom={directionsFrom}
                setDirectionsFrom={handleSetDirectionsFrom}
                directionsTo={directionsTo}
                setDirectionsTo={handleSetDirectionsTo}
                handleSwapDirections={handleSwapAndClear}
                onGenerateDirections={handleGenerateDirections}
                generatingDirections={generatingDirections}
                routeError={routeError}
                routeSegments={routeSegments}
                allRooms={allRoomsForBuilding}
                onSelectRoom={handleSelectRoom}
                keyboardOffset={keyboardAnim}
                isAccessibilityEnabled={isAccessibilityEnabled}
            />

            <RoomActionModal
                visible={roomModal.visible}
                roomId={roomModal.roomId}
                onSetFrom={handleSetFrom}
                onSetTo={handleSetTo}
                onClose={() => setRoomModal({ visible: false, roomId: null })}
            />
        </View>
    );
}

IndoorMaps.propTypes = {
    building: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        code: PropTypes.string,
        address: PropTypes.string,
    }),
    onPressBack: PropTypes.func.isRequired,
    campus: PropTypes.string,
    buildings: PropTypes.arrayOf(PropTypes.shape({
        code: PropTypes.string,
        name: PropTypes.string,
    })),
    isAccessibilityEnabled: PropTypes.bool,
    onToggleAccessibility: PropTypes.func,
    targetFloor: PropTypes.string,
    targetRoom: PropTypes.string,
    onPersistCombinedRoute: PropTypes.func,
    persistedCombinedSegments: PropTypes.array,
    persistedDirectionsFrom: PropTypes.shape({
        building: PropTypes.string,
        floor: PropTypes.string,
        room: PropTypes.string,
    }),
    persistedDirectionsTo: PropTypes.shape({
        building: PropTypes.string,
        floor: PropTypes.string,
        room: PropTypes.string,
    }),
};

IndoorMaps.defaultProps = {
    buildings: [],
    onPersistCombinedRoute: () => {},
    persistedCombinedSegments: [],
    persistedDirectionsFrom: null,
    persistedDirectionsTo: null,
};