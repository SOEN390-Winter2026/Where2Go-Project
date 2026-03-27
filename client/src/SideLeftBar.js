import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import PropTypes from 'prop-types';
import { leftBarIconSource, leftBarIconState } from "./utils/leftBarItemActive";
import { sideLeftBarSharedStyles } from "./styles/sideLeftBarStyles";

export default function SideLeftBar({
  currentCampus,
  onToggleCampus,
  onToggleLiveLocation,
  onPressPOI,
  isPressedPOI,
  isAccessibilityEnabled = false,
  onToggleAccessibility = () => {},
}) {
  /* ---------- Assets ---------- */
  const firstDisabilityIcon = require("../assets/hugeicons--disability-02.png");
  const secondDisabilityIcon = require("../assets/hugeicons--disability-02-2.png");

  const firstPOIIcon = require("../assets/gis--poi-alt.png");
  const secondPOIIcon = require("../assets/gis--poi-alt-2.png");

  const firstGPSIcon = require("../assets/lets-icons--gps-fixed.png");
  const secondGPSIcon = require("../assets/ic--round-gps-fixed.png");

  /* ---------- State ---------- */
  const isSGW = currentCampus === "SGW";
  const slideAnim = useRef(new Animated.Value(isSGW ? 0 : -26)).current;

  const [activePOI, setActivePOI] = useState(isPressedPOI ? "poi" : null);
  const [activeGPS, setActiveGPS] = useState(null);

  /* ---------- Switch Animation ---------- */
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSGW ? 0 : -26,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isSGW, slideAnim]);

  const toggleCampus = () => {
    onToggleCampus?.();
  };

  const leftBarActiveInputs = { isAccessibilityEnabled, activePOI, activeGPS };
  const iconPairs = {
    disability: [firstDisabilityIcon, secondDisabilityIcon],
    poi: [firstPOIIcon, secondPOIIcon],
    gps: [firstGPSIcon, secondGPSIcon],
  };

  return (
    <View style={sideLeftBarSharedStyles.floatLeftBar}>
      {/* -------- Custom Switch -------- */}
      <Pressable 
        testID="campusToggle"
        accessible={true}
        accessibilityLabel="campus-switch"
        style={sideLeftBarSharedStyles.barItem} 
        onPress={toggleCampus}
      >
        <View style={styles.switch}>
          <View
            style={[
              styles.slider,
              { backgroundColor: isSGW ? "#912338" : "#ccc" },
            ]}
          />
    {isSGW ? (
      <Text style={[styles.sgwName, { color: "#ffffff" }]}>SGW</Text>
    ) : (
      <Text style={[styles.loyolaName, { color: "#912338" }]}>Loyola</Text>
    )}
          <Animated.View
            style={[
              styles.sliderKnob,
              { transform: [{ translateY: slideAnim }] },
            ]}
          />
        </View>

        
      </Pressable>

     {/* -------- Disability -------- */}
<Pressable
  testID="disPress"
  style={[sideLeftBarSharedStyles.barItem, leftBarIconState("disability", leftBarActiveInputs)]}
  onPress={onToggleAccessibility}
>
  <Image source={leftBarIconSource("disability", leftBarActiveInputs, iconPairs)} style={sideLeftBarSharedStyles.icon} />
</Pressable>

{/* -------- POI -------- */}
<Pressable
  testID="poiPress"
  style={[sideLeftBarSharedStyles.barItem, leftBarIconState("poi", leftBarActiveInputs)]}
  onPress={() =>
    {setActivePOI((prev) => (prev === "poi" ? null : "poi"));
      onPressPOI();
    }
  }
>
  <Image source={leftBarIconSource("poi", leftBarActiveInputs, iconPairs)} style={sideLeftBarSharedStyles.icon} />
</Pressable>

{/* -------- GPS -------- */}
<Pressable
  testID="gps"
  accessible={true}
  accessibilityLabel="gps"
  style={[sideLeftBarSharedStyles.barItem, leftBarIconState("gps", leftBarActiveInputs)]}
  onPress={() => {
    setActiveGPS((prev) => (prev === "gps" ? null : "gps"));
    onToggleLiveLocation();
  }}
>
  <Image source={leftBarIconSource("gps", leftBarActiveInputs, iconPairs)} style={sideLeftBarSharedStyles.icon} />
</Pressable>

    </View>
  );
}

SideLeftBar.propTypes = {
  currentCampus: PropTypes.string.isRequired,
  onToggleCampus: PropTypes.func.isRequired,
  onToggleLiveLocation: PropTypes.func.isRequired,
  onPressPOI: PropTypes.func.isRequired,
  isPressedPOI: PropTypes.bool,
  isAccessibilityEnabled: PropTypes.bool,
  onToggleAccessibility: PropTypes.func,
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  /* ----- Switch ----- */
  switch: {
    width: 34,
    height: 60,
    borderRadius: 34,
    backgroundColor: "#ccc",
    justifyContent: "flex-end",
  },

  slider: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 34,
  },

  sliderKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "white",
    margin: 4,
    zIndex: 3,
  },

  sgwName: {
    position: "absolute",
    color: "#912338",
    fontSize: 10,
    left: 6,
    top: 10,
    zIndex: 0,
  },

  loyolaName: {
    position: "absolute",
    color: "#ccc",
    fontSize: 10,
    left: 2,
    top: 35,
    zIndex: 0,
  },
});
