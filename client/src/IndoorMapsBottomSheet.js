import React from "react";
import {
    View,
    Text,
    Pressable,
    Animated,
    TextInput,
    Modal,
    ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from 'prop-types';
import styles from './styles/IndoorMapsStyles';

function DropdownOption({ opt, isSelected, onSelect, onClose }) {
    return (
        <Pressable
            style={[
                styles.dropdownOption,
                isSelected && styles.dropdownOptionActive,
            ]}
            onPress={() => { onSelect(opt); onClose(); }}
        >
            <Text style={[
                styles.dropdownOptionText,
                isSelected && styles.dropdownOptionActiveText,
            ]}>
                {opt}
            </Text>
        </Pressable>
    );
}

DropdownOption.propTypes = {
    opt: PropTypes.string.isRequired,
    isSelected: PropTypes.bool.isRequired,
    onSelect: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

function DropdownSelect({ label, options, value, onSelect, disabled, testID }) {
    const [visible, setVisible] = React.useState(false);
    return (
        <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>{label}</Text>
            <Pressable
                testID={testID}
                style={[styles.dropdownBtn, disabled && styles.dropdownBtnDisabled]}
                onPress={() => !disabled && setVisible(true)}
                disabled={disabled}
            >
                <Text style={[styles.dropdownBtnText, !value && styles.dropdownBtnPlaceholder]}>
                    {value || '—'}
                </Text>
                <Ionicons name="chevron-down" size={12} color={disabled ? '#ccc' : '#912338'} />
            </Pressable>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <Pressable style={styles.dropdownOverlay} onPress={() => setVisible(false)}>
                    <View style={styles.dropdownModal}>
                        <Text style={styles.dropdownModalTitle}>{label}</Text>
                        <ScrollView>
                            {options.map((opt) => (
                                <DropdownOption
                                    key={opt}
                                    opt={opt}
                                    isSelected={value === opt}
                                    onSelect={onSelect}
                                    onClose={() => setVisible(false)}
                                />
                            ))}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

DropdownSelect.propTypes = {
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    value: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    testID: PropTypes.string,
};

DropdownSelect.defaultProps = {
    value: null,
    disabled: false,
    testID: undefined,
};

const locationShape = PropTypes.shape({
    building: PropTypes.string,
    floor: PropTypes.string,
    room: PropTypes.string,
});

function SheetContent({
    activeTab,
    building,
    FONT_SM,
    FONT_MD,
    FLOOR_BTN,
    classroomInput,
    setClassroomInput,
    selectedFloor,
    setSelectedFloor,
    BUILDINGS_LIST,
    getFloors,
    getRooms,
    directionsFrom,
    setDirectionsFrom,
    directionsTo,
    setDirectionsTo,
    handleSwapDirections,
    handleTabPress,
}) { //below, each if statement is for different tabs, base off of their names to know what they do
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
                    {/* LOADING THE FLOORS IN FLOORS TAB */}
                    {getFloors(building?.code).map((floor) => (
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

    if (activeTab === 'directions') {
        return (
            <ScrollView
                style={styles.sheetScrollView}
                contentContainerStyle={styles.sheetScrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.sheetContent}>
                    <Text style={[styles.directionsSectionTitle, { fontSize: FONT_MD + 2 }]}>
                        Directions
                    </Text>

                    {/*From */}
                    <Text style={[styles.directionsGroupLabel, { fontSize: FONT_SM + 2 }]}>From</Text>
                    <View style={styles.directionsRow}>
                        <DropdownSelect
                            testID="from-building"
                            label="Building"
                            options={BUILDINGS_LIST}
                            value={directionsFrom.building}
                            onSelect={(v) => setDirectionsFrom({ building: v, floor: null, room: null })}
                        />
                        <DropdownSelect
                            testID="from-floor"
                            label="Floor"
                            options={getFloors(directionsFrom.building)}
                            value={directionsFrom.floor}
                            onSelect={(v) => setDirectionsFrom(p => ({ ...p, floor: v, room: null }))}
                            disabled={!directionsFrom.building}
                        />
                        <DropdownSelect
                            testID="from-room"
                            label="Room"
                            options={getRooms(directionsFrom.building, directionsFrom.floor)}
                            value={directionsFrom.room}
                            onSelect={(v) => setDirectionsFrom(p => ({ ...p, room: v }))}
                            disabled={!directionsFrom.floor}
                        />
                    </View>

                    {/* Swap btn */}
                    <View style={styles.swapRow}>
                        <View style={styles.swapLine} />
                        <Pressable
                            testID="swap-directions"
                            style={styles.swapBtn}
                            onPress={handleSwapDirections}
                        >
                            <Ionicons name="swap-vertical" size={18} color="#fff" />
                        </Pressable>
                        <View style={styles.swapLine} />
                    </View>

                    {/*To*/}
                    <Text style={[styles.directionsGroupLabel, { fontSize: FONT_SM + 2 }]}>To</Text>
                    <View style={styles.directionsRow}>
                        <DropdownSelect
                            testID="to-building"
                            label="Building"
                            options={BUILDINGS_LIST}
                            value={directionsTo.building}
                            onSelect={(v) => setDirectionsTo({ building: v, floor: null, room: null })}
                        />
                        <DropdownSelect
                            testID="to-floor"
                            label="Floor"
                            options={getFloors(directionsTo.building)}
                            value={directionsTo.floor}
                            onSelect={(v) => setDirectionsTo(p => ({ ...p, floor: v, room: null }))}
                            disabled={!directionsTo.building}
                        />
                        <DropdownSelect
                            testID="to-room"
                            label="Room"
                            options={getRooms(directionsTo.building, directionsTo.floor)}
                            value={directionsTo.room}
                            onSelect={(v) => setDirectionsTo(p => ({ ...p, room: v }))}
                            disabled={!directionsTo.floor}
                        />
                    </View>

                    {/* GENERATE DIRECTIONS BTN -- TO IMPLEMENT AFTER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/}
                    <Pressable
                        testID="generate-directions-btn"
                        style={styles.generateDirectionsBtn}
                        onPress={() => {}}
                    >
                        <Text style={[styles.generateDirectionsBtnText, { fontSize: FONT_MD }]}>
                            Generate Directions
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        );
    }

    return (
        <>
            <View style={styles.sheetContent}>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Building</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.name ?? '—'}</Text>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Code</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.code ?? '—'}</Text>
                <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>Address</Text>
                <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{building?.address ?? '—'}</Text>
            </View>
            <View>
                <Pressable
                    style={[styles.takeToDirectionsBtn]}
                    onPress={() => handleTabPress('directions')}
                >
                    <Text style={[styles.takeToDirectionsBtnText, { fontSize: FONT_SM }]}>
                        Get Room Directions
                    </Text>
                </Pressable>
            </View>
        </>
    );
}

SheetContent.propTypes = {
    activeTab: PropTypes.string,
    building: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        code: PropTypes.string,
        address: PropTypes.string,
    }),
    FONT_SM: PropTypes.number.isRequired,
    FONT_MD: PropTypes.number.isRequired,
    FLOOR_BTN: PropTypes.number.isRequired,
    classroomInput: PropTypes.string.isRequired,
    setClassroomInput: PropTypes.func.isRequired,
    selectedFloor: PropTypes.string,
    setSelectedFloor: PropTypes.func.isRequired,
    BUILDINGS_LIST: PropTypes.arrayOf(PropTypes.string).isRequired,
    getFloors: PropTypes.func.isRequired,
    getRooms: PropTypes.func.isRequired,
    directionsFrom: locationShape.isRequired,
    setDirectionsFrom: PropTypes.func.isRequired,
    directionsTo: locationShape.isRequired,
    setDirectionsTo: PropTypes.func.isRequired,
    handleSwapDirections: PropTypes.func.isRequired,
    handleTabPress: PropTypes.func.isRequired,
};

SheetContent.defaultProps = {
    activeTab: null,
    building: null,
    selectedFloor: null,
};

export default function IndoorMapsBottomSheet({
    sheetHeight,
    panResponder,
    activeTab,
    handleTabPress,
    campus,
    building,
    ICON_SIZE,
    FONT_LG,
    FONT_SM,
    FONT_MD,
    FLOOR_BTN,
    // floors tab
    classroomInput,
    setClassroomInput,
    selectedFloor,
    setSelectedFloor,
    // directions tab
    BUILDINGS_LIST,
    getFloors,
    getRooms,
    directionsFrom,
    setDirectionsFrom,
    directionsTo,
    setDirectionsTo,
    handleSwapDirections,
}) {
    return (
        // Bottom menu
        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
            {/* part of the bottom menu that pops up and is draggable*/}
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

            <SheetContent
                activeTab={activeTab}
                building={building}
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
                handleTabPress={handleTabPress}
            />
        </Animated.View>
    );
}

IndoorMapsBottomSheet.propTypes = {
    sheetHeight: PropTypes.object.isRequired,
    panResponder: PropTypes.object.isRequired,
    activeTab: PropTypes.string,
    handleTabPress: PropTypes.func.isRequired,
    campus: PropTypes.string,
    building: PropTypes.shape({
        id: PropTypes.string,
        name: PropTypes.string,
        code: PropTypes.string,
        address: PropTypes.string,
    }),
    ICON_SIZE: PropTypes.number.isRequired,
    FONT_LG: PropTypes.number.isRequired,
    FONT_SM: PropTypes.number.isRequired,
    FONT_MD: PropTypes.number.isRequired,
    FLOOR_BTN: PropTypes.number.isRequired,
    classroomInput: PropTypes.string.isRequired,
    setClassroomInput: PropTypes.func.isRequired,
    selectedFloor: PropTypes.string,
    setSelectedFloor: PropTypes.func.isRequired,
    BUILDINGS_LIST: PropTypes.arrayOf(PropTypes.string).isRequired,
    getFloors: PropTypes.func.isRequired,
    getRooms: PropTypes.func.isRequired,
    directionsFrom: locationShape.isRequired,
    setDirectionsFrom: PropTypes.func.isRequired,
    directionsTo: locationShape.isRequired,
    setDirectionsTo: PropTypes.func.isRequired,
    handleSwapDirections: PropTypes.func.isRequired,
};

IndoorMapsBottomSheet.defaultProps = {
    activeTab: null,
    campus: null,
    building: null,
    selectedFloor: null,
};