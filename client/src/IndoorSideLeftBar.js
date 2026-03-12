import React, { useState } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";

export default function IndoorSideLeftBar({ onPressBack }) {

    const firstDisabilityIcon = require("../assets/hugeicons--disability-02.png");
    const secondDisabilityIcon = require("../assets/hugeicons--disability-02-2.png");
    const firstPOIIcon = require("../assets/gis--poi-alt.png");
    const secondPOIIcon = require("../assets/gis--poi-alt-2.png");
    const [activeDis, setActiveDis] = useState(null);
    const [activePOI, setActivePOI] = useState(null);
    const [activeSearch, setActiveSearch] = useState(false);

    const iconState = (name) => {
        if (name === "disability")
            return { backgroundColor: activeDis === name ? "#912338" : "#ccc" };
        if (name === "poi")
            return { backgroundColor: activePOI === name ? "#912338" : "#ccc" };
    };

    const iconSource = (name) => {
        if (name === "disability")
            return activeDis === name ? secondDisabilityIcon : firstDisabilityIcon;
        if (name === "poi")
            return activePOI === name ? secondPOIIcon : firstPOIIcon;
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
                style={[styles.barItem, { backgroundColor:  "#ccc" }]}
                onPress={() => setActiveSearch((prev) => !prev)}
            >
                <Ionicons name="search" size={24} color="#912338"   source={iconSource("search")}/>
            </Pressable>

            {/* Disability btn */}
            <Pressable testID="disability-btn"
                style={[styles.barItem, iconState("disability")]}
                onPress={() =>
                    setActiveDis((prev) => (prev === "disability" ? null : "disability"))
                }
            >
                <Image source={iconSource("disability")} style={styles.icon} />
            </Pressable>

            {/* POIs */}
            <Pressable testID="poi-btn"
                style={[styles.barItem, iconState("poi")]}
                onPress={() =>
                    setActivePOI((prev) => (prev === "poi" ? null : "poi"))
                }
            >
                <Image source={iconSource("poi")} style={styles.icon} />
            </Pressable>
        </View>
    );
}

IndoorSideLeftBar.propTypes = {
    onPressBack: PropTypes.func.isRequired,
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