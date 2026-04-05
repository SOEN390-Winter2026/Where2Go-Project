import { useState } from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import {
    LEFT_BAR_BURGUNDY,
    LEFT_BAR_GREY,
} from "./utils/leftBarItemActive";
import { sideLeftBarSharedStyles } from "./styles/sideLeftBarStyles";
import SideLeftBarBase from "./SideLeftBarBase";

export default function IndoorSideLeftBar({
    onPressBack,
    onOpenDirections,
    isAccessibilityEnabled = false,
    onToggleAccessibility = () => {},
    isPOIEnabled = false,
    onTogglePOI = () => {},
    }) {
    const [activeSearch, setActiveSearch] = useState(false);

    // back btn + search 
    const topSection = (
        <>
        <Pressable
            testID="back-btn"
            style={[sideLeftBarSharedStyles.barItem, { backgroundColor: LEFT_BAR_BURGUNDY }]}
            onPress={onPressBack}
        >
            <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <Pressable
            testID="search-btn"
            style={[
            sideLeftBarSharedStyles.barItem,
            { backgroundColor: activeSearch ? LEFT_BAR_BURGUNDY : LEFT_BAR_GREY },
            ]}
            onPress={() => {
            setActiveSearch((prev) => !prev);
            onOpenDirections?.();
            }}
        >
            <Ionicons
            name="search"
            size={24}
            color={activeSearch ? "#fff" : LEFT_BAR_BURGUNDY}
            />
        </Pressable>
        </>
    );

    return (
        <SideLeftBarBase
        topSection={topSection}
        isAccessibilityEnabled={isAccessibilityEnabled}
        onToggleAccessibility={onToggleAccessibility}
        isPOIEnabled={isPOIEnabled}
        onTogglePOI={onTogglePOI}
        />
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