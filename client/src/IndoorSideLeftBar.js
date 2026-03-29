import React, { useState } from "react";
import { View, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import {
    LEFT_BAR_BURGUNDY,
    LEFT_BAR_GREY,
    leftBarIconSource,
    leftBarIconState,
} from "./utils/leftBarItemActive";
import { sideLeftBarSharedStyles } from "./styles/sideLeftBarStyles";

export default function IndoorSideLeftBar({
    onPressBack,
    onOpenDirections,
    isAccessibilityEnabled = false,
    onToggleAccessibility = () => {},
    isPOIEnabled = false,
    onTogglePOI = () => {},
}) {

    const firstDisabilityIcon = require("../assets/hugeicons--disability-02.png");
    const secondDisabilityIcon = require("../assets/hugeicons--disability-02-2.png");
    const firstPOIIcon = require("../assets/gis--poi-alt.png");
    const secondPOIIcon = require("../assets/gis--poi-alt-2.png");
    const [activeSearch, setActiveSearch] = useState(false);

    const activePOI = isPOIEnabled ? "poi" : null;
    const leftBarActiveInputs = { isAccessibilityEnabled, activePOI };
    const iconPairs = {
        disability: [firstDisabilityIcon, secondDisabilityIcon],
        poi: [firstPOIIcon, secondPOIIcon],
    };

    const handleSearchPress = () => {
        setActiveSearch((prev) => !prev);
        onOpenDirections?.();
    };

    return (
        <View style={sideLeftBarSharedStyles.floatLeftBar}>
            {/* Back btn */}
            <Pressable testID="back-btn"
                style={[sideLeftBarSharedStyles.barItem, { backgroundColor: LEFT_BAR_BURGUNDY }]}
                onPress={onPressBack}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* Directions or search (?) to be changed if needed */}
            <Pressable testID="search-btn" //btw this should lead to another page once implemented for indoors directions
                style={[sideLeftBarSharedStyles.barItem, { backgroundColor: activeSearch ? LEFT_BAR_BURGUNDY : LEFT_BAR_GREY }]}
                onPress={handleSearchPress}
            >
                <Ionicons
                    name="search"
                    size={24}
                    color={activeSearch ? "#fff" : LEFT_BAR_BURGUNDY}
                />
            </Pressable>

            {/* Disability btn */}
            <Pressable testID="disability-btn"
                style={[sideLeftBarSharedStyles.barItem, leftBarIconState("disability", leftBarActiveInputs)]}
                onPress={onToggleAccessibility}
            >
                <Image source={leftBarIconSource("disability", leftBarActiveInputs, iconPairs)} style={sideLeftBarSharedStyles.icon} />
            </Pressable>

            {/* POIs */}
            <Pressable testID="poi-btn"
                style={[sideLeftBarSharedStyles.barItem, leftBarIconState("poi", leftBarActiveInputs)]}
                onPress={onTogglePOI}
            >
                <Image source={leftBarIconSource("poi", leftBarActiveInputs, iconPairs)} style={sideLeftBarSharedStyles.icon} />
            </Pressable>
        </View>
    );
}

IndoorSideLeftBar.propTypes = {
    onPressBack: PropTypes.func.isRequired,
    onOpenDirections: PropTypes.func,
    isAccessibilityEnabled: PropTypes.bool,
    onToggleAccessibility: PropTypes.func,
    isPOIEnabled: PropTypes.bool,
    onTogglePOI: PropTypes.func,
};