import React from "react";
import {
    View,
    Text,
    Pressable,
    Animated,
    TextInput,
    Modal,
    ScrollView,
    StyleSheet,
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

function DropdownSelect({ label, options, value, onSelect, disabled, testID, placeholder }) {
    const [visible, setVisible] = React.useState(false);
    const isEmpty = options.length === 0;
    return (
        <View style={styles.dropdownWrapper}>
            <Text style={styles.dropdownLabel}>{label}</Text>
            <Pressable
                testID={testID}
                style={[styles.dropdownBtn, (disabled || isEmpty) && styles.dropdownBtnDisabled]}
                onPress={() => !disabled && !isEmpty && setVisible(true)}
                disabled={disabled || isEmpty}
            >
                <Text style={[styles.dropdownBtnText, (!value || isEmpty) && styles.dropdownBtnPlaceholder]}>
                    {value || (isEmpty && !disabled ? placeholder : '—')}
                </Text>
                <Ionicons name="chevron-down" size={12} color={(disabled || isEmpty) ? '#ccc' : '#912338'} />
            </Pressable>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <View style={styles.dropdownOverlay}>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setVisible(false)}
                        accessibilityRole="button"
                        accessibilityLabel="Close list"
                    />
                    <View style={styles.dropdownModal}>
                        <Text style={styles.dropdownModalTitle}>{label}</Text>
                        <ScrollView
                            style={styles.dropdownOptionsScroll}
                            nestedScrollEnabled
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator
                        >
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
                </View>
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
    placeholder: PropTypes.string,
};

DropdownSelect.defaultProps = {
    value: null,
    disabled: false,
    testID: undefined,
    placeholder: '—',
};

const locationShape = PropTypes.shape({
    building: PropTypes.string,
    floor: PropTypes.string,
    room: PropTypes.string,
});

const buildingShape = PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    code: PropTypes.string,
    address: PropTypes.string,
});

// Extracted to eliminate the repeated label+value pattern in the info tab
function InfoRow({ label, value, FONT_SM, FONT_MD }) {
    return (
        <>
            <Text style={[styles.infoLabel, { fontSize: FONT_SM }]}>{label}</Text>
            <Text style={[styles.infoValue, { fontSize: FONT_MD }]}>{value ?? '—'}</Text>
        </>
    );
}

InfoRow.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    FONT_SM: PropTypes.number.isRequired,
    FONT_MD: PropTypes.number.isRequired,
};

InfoRow.defaultProps = {
    value: null,
};

function makeLocationHandlers(setter) {
    return {
        onSelectBuilding: (v) => setter({ building: v, floor: null, room: null }),
        onSelectFloor: (v) => setter(p => ({ ...p, floor: v, room: null })),
        onSelectRoom: (v) => setter(p => ({ ...p, room: v })),
    };
}

function LocationSelector({ label, location, onSelectBuilding, onSelectFloor, onSelectRoom, BUILDINGS_LIST, getFloors, getRooms, testIDPrefix, FONT_SM }) {
    const floors = getFloors(location.building);
    const rooms  = getRooms(location.building, location.floor);
    return (
        <>
            <Text style={[styles.directionsGroupLabel, { fontSize: FONT_SM + 2 }]}>{label}</Text>
            <View style={styles.directionsRow}>
                <DropdownSelect
                    testID={`${testIDPrefix}-building`}
                    label="Building"
                    options={BUILDINGS_LIST}
                    value={location.building}
                    onSelect={onSelectBuilding}
                />
                <DropdownSelect
                    testID={`${testIDPrefix}-floor`}
                    label="Floor"
                    options={floors}
                    value={location.floor}
                    onSelect={onSelectFloor}
                    disabled={!location.building}
                    placeholder="No floor maps available"
                />
                <DropdownSelect
                    testID={`${testIDPrefix}-room`}
                    label="Room"
                    options={rooms}
                    value={location.room}
                    onSelect={onSelectRoom}
                    disabled={!location.floor}
                />
            </View>
        </>
    );
}

LocationSelector.propTypes = {
    label: PropTypes.string.isRequired,
    location: locationShape.isRequired,
    onSelectBuilding: PropTypes.func.isRequired,
    onSelectFloor: PropTypes.func.isRequired,
    onSelectRoom: PropTypes.func.isRequired,
    BUILDINGS_LIST: PropTypes.arrayOf(PropTypes.string).isRequired,
    getFloors: PropTypes.func.isRequired,
    getRooms: PropTypes.func.isRequired,
    testIDPrefix: PropTypes.string.isRequired,
    FONT_SM: PropTypes.number.isRequired,
};

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
    onGenerateDirections,
    generatingDirections,
    routeError,
    routeSegments,
}) {
    if (activeTab === 'floors') {
        return (
            <ScrollView
                style={styles.sheetFloorsScroll}
                contentContainerStyle={styles.sheetFloorsScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
            >
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
                                <Text style={[
                                    styles.floorBtnText,
                                    { fontSize: FONT_MD },
                                    selectedFloor === floor && styles.floorBtnTextActive,
                                ]}>
                                    {floor}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </ScrollView>
        );
    }

    if (activeTab === 'directions') {
        const hasSummary = Array.isArray(routeSegments) && routeSegments.length > 0;
        return (
            <ScrollView
                style={styles.sheetScrollView}
                contentContainerStyle={styles.sheetScrollContent}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator
            >
                <View style={styles.sheetContent}>
                    <Text style={[styles.directionsSectionTitle, { fontSize: FONT_MD + 2 }]}>
                        Directions
                    </Text>

                    <LocationSelector
                        label="From"
                        location={directionsFrom}
                        {...makeLocationHandlers(setDirectionsFrom)}
                        BUILDINGS_LIST={BUILDINGS_LIST}
                        getFloors={getFloors}
                        getRooms={getRooms}
                        testIDPrefix="from"
                        FONT_SM={FONT_SM}
                    />

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

                    <LocationSelector
                        label="To"
                        location={directionsTo}
                        {...makeLocationHandlers(setDirectionsTo)}
                        BUILDINGS_LIST={BUILDINGS_LIST}
                        getFloors={getFloors}
                        getRooms={getRooms}
                        testIDPrefix="to"
                        FONT_SM={FONT_SM}
                    />

                    <Pressable
                        testID="generate-directions-btn"
                        style={[styles.generateDirectionsBtn, generatingDirections && { opacity: 0.7 }]}
                        onPress={onGenerateDirections}
                        disabled={generatingDirections}
                    >
                        <Text style={[styles.generateDirectionsBtnText, { fontSize: FONT_MD }]}>
                            Generate Directions
                        </Text>
                    </Pressable>

                    {routeError ? (
                        <Text style={styles.routeInlineError}>{routeError}</Text>
                    ) : null}

                    {hasSummary ? (
                        <View style={styles.routeSummaryCard}>
                            <Text style={styles.routeSummaryTitle}>Directions Summary</Text>
                            {routeSegments.map((seg, idx) => (
                                <View key={`summary-${seg.kind}-${idx}`} style={styles.routeSummarySegment}>
                                    <Text style={styles.routeSummaryHeading}>
                                        {seg.kind === 'indoor' ? 'Indoor' : 'Outdoor'} {idx + 1}
                                    </Text>
                                    {seg.kind === 'outdoor' && (seg.distanceText || seg.durationText) ? (
                                        <Text style={styles.routeSummaryMeta}>
                                            {[seg.distanceText, seg.durationText].filter(Boolean).join(' · ')}
                                        </Text>
                                    ) : null}
                                    {(seg.steps || []).map((line, j) => (
                                        <Text key={`summary-step-${idx}-${j}`} style={styles.routeSummaryLine}>
                                            • {line}
                                        </Text>
                                    ))}
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            </ScrollView>
        );
    }

    return (
        <>
            <View style={styles.sheetContent}>
                <InfoRow label="Building" value={building?.name} FONT_SM={FONT_SM} FONT_MD={FONT_MD} />
                <InfoRow label="Code"     value={building?.code} FONT_SM={FONT_SM} FONT_MD={FONT_MD} />
                <InfoRow label="Address"  value={building?.address} FONT_SM={FONT_SM} FONT_MD={FONT_MD} />
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

const sharedSheetPropTypes = {
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
    onGenerateDirections: PropTypes.func.isRequired,
    generatingDirections: PropTypes.bool,
    routeError: PropTypes.string,
    routeSegments: PropTypes.arrayOf(PropTypes.shape({
        kind: PropTypes.oneOf(['indoor', 'outdoor']),
        steps: PropTypes.arrayOf(PropTypes.string),
        distanceText: PropTypes.string,
        durationText: PropTypes.string,
    })),
};

SheetContent.propTypes = {
    ...sharedSheetPropTypes,
    activeTab: PropTypes.string,
    building: buildingShape,
    handleTabPress: PropTypes.func.isRequired,
};

SheetContent.defaultProps = {
    activeTab: null,
    building: null,
    generatingDirections: false,
    routeError: null,
    routeSegments: null,
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
    onGenerateDirections,
    generatingDirections,
    routeError,
    routeSegments,
}) {
    return (
        <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
            <View {...panResponder.panHandlers} style={styles.dragArea}>
                <View style={styles.dragHandle} />

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

            <View style={styles.sheetBody}>
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
                    onGenerateDirections={onGenerateDirections}
                    generatingDirections={generatingDirections}
                    routeError={routeError}
                    routeSegments={routeSegments}
                />
            </View>
        </Animated.View>
    );
}

IndoorMapsBottomSheet.propTypes = {
    ...sharedSheetPropTypes,
    sheetHeight: PropTypes.object.isRequired,
    panResponder: PropTypes.object.isRequired,
    activeTab: PropTypes.string,
    handleTabPress: PropTypes.func.isRequired,
    campus: PropTypes.string,
    building: buildingShape,
    ICON_SIZE: PropTypes.number.isRequired,
    FONT_LG: PropTypes.number.isRequired,
    routeError: PropTypes.string,
    routeSegments: PropTypes.array,
};

IndoorMapsBottomSheet.defaultProps = {
    activeTab: null,
    campus: null,
    building: null,
    generatingDirections: false,
    routeError: null,
    routeSegments: null,
};