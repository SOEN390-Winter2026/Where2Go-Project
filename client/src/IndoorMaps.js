import React, { useRef, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PropTypes from 'prop-types';
import IndoorSideLeftBar from './IndoorSideLeftBar';
import IndoorMapsBottomSheet from './IndoorMapsBottomSheet';
import styles from './styles/IndoorMapsStyles';
import useIndoorMaps from './utils/useIndoorMaps';
import { indoorMaps } from '../indoorData';

function ZoomableImage({ source }) {
    const scale = useRef(new Animated.Value(1)).current;
    const lastScale = useRef(1);
    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const lastTranslateX = useRef(0);
    const lastTranslateY = useRef(0);
    const isPinching = useRef(false);

    const [isZoomed, setIsZoomed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const pinchGesture = Gesture.Pinch()
        .onStart(() => { isPinching.current = true; })
        .onUpdate((e) => {
            const next = Math.min(Math.max(lastScale.current * e.scale, 1), 4);
            scale.setValue(next);
        })
        .onEnd((e) => {
            const next = Math.min(Math.max(lastScale.current * e.scale, 1), 4);
            lastScale.current = next;
            scale.setValue(next);
            if (next <= 1) {
                lastTranslateX.current = 0;
                lastTranslateY.current = 0;
                translateX.setValue(0);
                translateY.setValue(0);
                setIsZoomed(false);
            } else {
                setIsZoomed(true);
            }
            isPinching.current = false;
        })
        .runOnJS(true);

    const panGesture = Gesture.Pan()
        .enabled(isZoomed)
        .onUpdate((e) => {
            if (isPinching.current) return;
            translateX.setValue(lastTranslateX.current + e.translationX);
            translateY.setValue(lastTranslateY.current + e.translationY);
        })
        .onEnd((e) => {
            if (isPinching.current) return;
            lastTranslateX.current += e.translationX;
            lastTranslateY.current += e.translationY;
            translateX.setValue(lastTranslateX.current);
            translateY.setValue(lastTranslateY.current);
        })
        .runOnJS(true);

    const composed = Gesture.Simultaneous(pinchGesture, panGesture);

    return (
        <View style={styles.zoomableContainer}>
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
                    <Image
                        source={source}
                        style={styles.mapImage}
                        resizeMode="contain"
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

ZoomableImage.propTypes = {
    source: PropTypes.oneOfType([PropTypes.number, PropTypes.object]).isRequired,
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

function FloorMapImage({ campus, buildingCode, selectedFloor, width }) {
    const buildingData = indoorMaps?.[campus]?.[buildingCode];

    if (!selectedFloor) {
        return <Placeholder width={width} text="Select a floor" />;
    }

    if (!buildingData) {
        return <Placeholder width={width} text="No map available." />;
    }

    return (
        <View style={styles.floorLayersContainer}>
            {Object.entries(buildingData).map(([floor, entry]) => {
                const isActive = selectedFloor === floor
                              || Number(selectedFloor) === Number(floor);
                return (
                    <View
                        key={floor}
                        style={[
                            StyleSheet.absoluteFill,
                            { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 },
                        ]}
                        pointerEvents={isActive ? 'auto' : 'none'}
                    >
                        {entry.image ? (
                            <>
                                <ZoomableImage source={entry.image} />
                                {!entry.data && (
                                    <View style={styles.navUnavailableBadge}>
                                        <Text style={styles.navUnavailableText}>
                                            Navigation unavailable
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Placeholder width={width} text={`No map for floor ${floor}`} />
                        )}
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
};

export default function IndoorMaps({ building, onPressBack, campus }) {
    const { width, height } = useWindowDimensions();

    const SHEET_COLLAPSED = height * 0.11;

    const {
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
    } = useIndoorMaps(height, campus, building?.code);

    //format android vs ios
    const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : height * 0.06;

    const ICON_SIZE = Math.round(width * 0.085);
    const FLOOR_BTN = Math.round(width * 0.11);
    const FONT_LG   = Math.round(width * 0.065);
    const FONT_SM   = Math.round(width * 0.03);
    const FONT_MD   = Math.round(width * 0.038);

    return (
        <View style={[styles.container, { paddingTop: topPadding }]}>

            {/* Left sidebar menu */}
            <IndoorSideLeftBar
                onPressBack={onPressBack}
                onOpenDirections={() => handleTabPress('directions')}
            />

            {/* indoor map */}
            <View style={[styles.mapArea, { paddingBottom: SHEET_COLLAPSED }]}>
                <FloorMapImage
                    campus={campus}
                    buildingCode={building?.code}
                    selectedFloor={selectedFloor}
                    width={width}
                />
            </View>

            {/* Bottom menu */}
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
                setDirectionsFrom={setDirectionsFrom}
                directionsTo={directionsTo}
                setDirectionsTo={setDirectionsTo}
                handleSwapDirections={handleSwapDirections}
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
};