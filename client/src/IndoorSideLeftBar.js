import React, { useState } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { leftBarIconSource, leftBarIconState } from "./utils/leftBarItemActive";

export default function IndoorSideLeftBar({
    onPressBack,
    onOpenDirections,
    isAccessibilityEnabled = false,
    onToggleAccessibility = () => {},
}) {

    const firstDisabilityIcon = require("../assets/hugeicons--disability-02.png");
    const secondDisabilityIcon = require("../assets/hugeicons--disability-02-2.png");
    const firstPOIIcon = require("../assets/gis--poi-alt.png");
    const secondPOIIcon = require("../assets/gis--poi-alt-2.png");
    const [activePOI, setActivePOI] = useState(null);
    const [activeSearch, setActiveSearch] = useState(false);

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
        <View style={styles.floatLeftBar}>
            {/* Back btn */}
            <Pressable testID="back-btn"
                style={[styles.barItem, { backgroundColor: "#912338" }]}
                onPress={onPressBack}
            >
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>

            {/* Directions or search (?) to be changed if needed */}
            <Pressable testID="search-btn" //btw this should lead to another page once implemented for indoors directions
                style={[styles.barItem, { backgroundColor: activeSearch ? "#912338" : "#ccc" }]}
                onPress={handleSearchPress}
            >
                <Ionicons
                    name="search"
                    size={24}
                    color={activeSearch ? "#fff" : "#912338"}
                />
            </Pressable>

            {/* Disability btn */}
            <Pressable testID="disability-btn"
                style={[styles.barItem, leftBarIconState("disability", leftBarActiveInputs)]}
                onPress={onToggleAccessibility}
            >
                <Image source={leftBarIconSource("disability", leftBarActiveInputs, iconPairs)} style={styles.icon} />
            </Pressable>

            {/* POIs */}
            <Pressable testID="poi-btn"
                style={[styles.barItem, leftBarIconState("poi", leftBarActiveInputs)]}
                onPress={() =>
                    setActivePOI((prev) => (prev === "poi" ? null : "poi"))
                }
            >
                <Image source={leftBarIconSource("poi", leftBarActiveInputs, iconPairs)} style={styles.icon} />
            </Pressable>
        </View>
    );
}

IndoorSideLeftBar.propTypes = {
    onPressBack: PropTypes.func.isRequired,
    onOpenDirections: PropTypes.func,
    isAccessibilityEnabled: PropTypes.bool,
    onToggleAccessibility: PropTypes.func,
};

const styles = StyleSheet.create({
    floatLeftBar: {
        position: "absolute",
        padding: 5,
        borderWidth: 2,
        borderColor: "#912338",
        borderRadius: 20,
        left: "3%",
        top: "5%",
        alignItems: "center",
        backgroundColor: "white",
        zIndex: 20,
        elevation: 20,
    },
    barItem: {
        borderWidth: 2,
        borderColor: "#912338",
        borderRadius: 50,
        padding: 5,
        margin: 5,
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        width: 20,
        height: 20,
    },
});