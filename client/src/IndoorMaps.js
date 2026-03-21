import React from "react";
import {
    View,
    Text,
    Platform,
    StatusBar,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from 'prop-types';
import IndoorSideLeftBar from './IndoorSideLeftBar';
import IndoorMapsBottomSheet from './IndoorMapsBottomSheet';
import styles from './styles/IndoorMapsStyles';
import useIndoorMaps from './utils/useIndoorMaps';

export default function IndoorMaps({ building, onPressBack, campus }) {
    const { width, height } = useWindowDimensions();

    //importing logic from utils/useIndoorMaps.js
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
    } = useIndoorMaps(height);

    //format android vs ios
    const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : height * 0.06;

    const ICON_SIZE = Math.round(width * 0.085);
    const FLOOR_BTN = Math.round(width * 0.11);
    const FONT_LG = Math.round(width * 0.065);
    const FONT_SM = Math.round(width * 0.03);
    const FONT_MD = Math.round(width * 0.038);

    return (
        <View style={[styles.container, { paddingTop: topPadding }]}>
            {/* Left sidebar menu */}
            <IndoorSideLeftBar onPressBack={onPressBack}
                onOpenDirections={() => handleTabPress('directions')} />

            {/* Map placeholder */}
            <View style={styles.mapArea}>
                <Ionicons name="map-outline" size={width * 0.12} color="#ccc" />
                <Text style={[styles.mapPlaceholderSub, { fontSize: FONT_MD }]}>
                    {selectedFloor ? `Floor ${selectedFloor}` : 'Select a floor'}
                </Text>
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