import React, { useState, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Platform,
    StatusBar,
    Animated,
    PanResponder, //this one is for dragging the bottom thing up
    TextInput,
    useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from 'prop-types';
import IndoorSideLeftBar from './IndoorSideLeftBar';
import styles from './styles/IndoorMapsStyles';

const FLOORS = ['1', '2', '3', '4', '5'];

export default function IndoorMaps({ building, onPressBack, campus }) {
    const { width, height } = useWindowDimensions();

    const SHEET_COLLAPSED = height * 0.11;
    const SHEET_EXPANDED  = height * 0.45;

    const [selectedFloor, setSelectedFloor] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [classroomInput, setClassroomInput] = useState('');

    const sheetHeight = useRef(new Animated.Value(height * 0.11)).current;
    const lastHeight = useRef(height * 0.11);

    const topPadding = Platform.OS === 'android'
        ? (StatusBar.currentHeight ?? 24) + 8
        : height * 0.06;

    const ICON_SIZE  = Math.round(width * 0.085);
    const FLOOR_BTN  = Math.round(width * 0.11);
    const FONT_LG    = Math.round(width * 0.065);
    const FONT_SM    = Math.round(width * 0.03);
    const FONT_MD    = Math.round(width * 0.038);

    const expandSheet = () => {
        Animated.spring(sheetHeight, {
            toValue: SHEET_EXPANDED,
            useNativeDriver: false,
        }).start();
        lastHeight.current = SHEET_EXPANDED;
    };

    const collapseSheet = () => {
        Animated.spring(sheetHeight, {
            toValue: SHEET_COLLAPSED,
            useNativeDriver: false,
        }).start();
        lastHeight.current = SHEET_COLLAPSED;
        setActiveTab(null);
    };

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
            onPanResponderMove: (_, g) => {
                const next = lastHeight.current - g.dy;
                if (next >= SHEET_COLLAPSED && next <= SHEET_EXPANDED) {
                    sheetHeight.setValue(next);
                }
            },
            onPanResponderRelease: (_, g) => {
                const next = lastHeight.current - g.dy;
                if (next > (SHEET_COLLAPSED + SHEET_EXPANDED) / 2) {
                    expandSheet();
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
            expandSheet();
        }
    };

    const renderSheetContent = () => {
        if (activeTab === 'floors') {
            return (
                <View style={styles.sheetContent}>
                    <View style={styles.classroomRow}>
                        <Text style={[styles.classroomLabel, { fontSize: FONT_MD }]}>Classroom # :</Text>
                        <TextInput
                            testID="classroom-input"
                            style={[styles.classroomInput, { fontSize: FONT_MD }]}
                            value={classroomInput}
                            onChangeText={setClassroomInput}
                            keyboardType="default"
                        />
                    </View>
                    <View style={styles.floorBtnsWrap}>
                        {FLOORS.map((floor) => (
                            <Pressable
                                key={floor}
                                testID={`floor-btn-${floor}`}
                                style={[
                                    styles.floorBtn,
                                    { width: FLOOR_BTN, height: FLOOR_BTN, borderRadius: FLOOR_BTN / 2 },
                                    selectedFloor === floor && styles.floorBtnActive,
                                ]}
                                onPress={() => setSelectedFloor(prev => prev === floor ? null : floor)}
                            >
                                <Text style={[styles.floorBtnText, { fontSize: FONT_MD }]}>
                                    {floor}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            );
        }

        return (
            <View style={styles.sheetContent}>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Building</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.name ?? '—'}</Text>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Code</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.code ?? '—'}</Text>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Address</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.address ?? '—'}</Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: topPadding }]}>
            {/* Left sidebar menu */}
            <IndoorSideLeftBar onPressBack={onPressBack} />

            {/* Map placeholder */}
            <View style={styles.mapArea}>
                <Ionicons name="map-outline" size={width * 0.12} color="#ccc" />
                <Text style={[styles.mapPlaceholderSub, { fontSize: FONT_MD }]}>
                    {selectedFloor ? `Floor ${selectedFloor}` : 'Select a floor'}
                </Text>
            </View>

            {/* Bottom menu */}
            <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
                {/*lil part of the bottom menu that pops up and is draggable*/}
                <View {...panResponder.panHandlers} style={styles.dragArea}>
                    <View style={styles.dragHandle} />

                    {/*separating into three icons*/}
                    <View style={styles.barRow}>
                        <View style={styles.barSide}>
                            <Pressable testID="tab-info" style={styles.tabBtn} onPress={() => handleTabPress('info')}>
                                <Ionicons
                                    name="information-circle"
                                    size={ICON_SIZE}
                                    color={activeTab === 'info' ? '#fff' : 'rgba(255,255,255,0.55)'}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.barCenter}>
                            <Text style={[styles.sheetCampus, { fontSize: FONT_SM }]}>
                                {campus ?? ''}
                            </Text>
                            <Text style={[styles.sheetSubtitle, { fontSize: FONT_SM }]}>
                                Current Building:
                            </Text>
                            <Text style={[styles.sheetTitle, { fontSize: FONT_LG }]}>
                                {building?.code ?? '—'}
                            </Text>
                        </View>

                        <View style={[styles.barSide, styles.barSideRight]}>
                            <Pressable testID="tab-floors" style={styles.tabBtn} onPress={() => handleTabPress('floors')}>
                                <Ionicons
                                    name="layers"
                                    size={ICON_SIZE}
                                    color={activeTab === 'floors' ? '#fff' : 'rgba(255,255,255,0.55)'}
                                />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {renderSheetContent()}

            </Animated.View>
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