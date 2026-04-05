import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import PropTypes from "prop-types";
import { leftBarIconSource, leftBarIconState } from "./utils/leftBarItemActive";
import { sideLeftBarSharedStyles } from "./styles/sideLeftBarStyles";
import SideLeftBarBase from "./SideLeftBarBase";

export default function SideLeftBar({
  currentCampus,
  onToggleCampus,
  onToggleLiveLocation,
  isPressedPOI = false,
  isAccessibilityEnabled = false,
  onToggleAccessibility = () => {},
  onPressPOI = () => {},
}) {
  const firstGPSIcon = require("../assets/lets-icons--gps-fixed.png");
  const secondGPSIcon = require("../assets/ic--round-gps-fixed.png");

  const isSGW = currentCampus === "SGW";
  const slideAnim = useRef(new Animated.Value(isSGW ? 0 : -26)).current;
  const [activeGPS, setActiveGPS] = useState(null);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isSGW ? 0 : -26,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isSGW, slideAnim]);

  const gpsActiveInputs = { activeGPS };
  const iconPairs = { gps: [firstGPSIcon, secondGPSIcon] };

  //campus switch + GPS
  const topSection = (
    <>
      <Pressable
        testID="campusToggle"
        accessible={true}
        accessibilityLabel="campus-switch"
        style={sideLeftBarSharedStyles.barItem}
        onPress={onToggleCampus}
      >
        <View style={styles.switch}>
          <View
            style={[styles.slider, { backgroundColor: isSGW ? "#912338" : "#ccc" }]}
          />
          {isSGW ? (
            <Text style={[styles.sgwName, { color: "#ffffff" }]}>SGW</Text>
          ) : (
            <Text style={[styles.loyolaName, { color: "#912338" }]}>Loyola</Text>
          )}
          <Animated.View
            style={[styles.sliderKnob, { transform: [{ translateY: slideAnim }] }]}
          />
        </View>
      </Pressable>

      <Pressable
        testID="gps"
        accessible={true}
        accessibilityLabel="gps"
        style={[
          sideLeftBarSharedStyles.barItem,
          leftBarIconState("gps", gpsActiveInputs),
        ]}
        onPress={() => {
          setActiveGPS((prev) => (prev === "gps" ? null : "gps"));
          onToggleLiveLocation?.();
        }}
      >
        <Image
          source={leftBarIconSource("gps", gpsActiveInputs, iconPairs)}
          style={sideLeftBarSharedStyles.icon}
        />
      </Pressable>
    </>
  );

  return (
    <SideLeftBarBase
      topSection={topSection}
      isAccessibilityEnabled={isAccessibilityEnabled}
      onToggleAccessibility={onToggleAccessibility}
      isPOIEnabled={isPressedPOI}
      onTogglePOI={onPressPOI}
    />
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

const styles = StyleSheet.create({
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
    fontSize: 10,
    left: 6,
    top: 10,
    zIndex: 0,
  },
  loyolaName: {
    position: "absolute",
    fontSize: 10,
    left: 2,
    top: 35,
    zIndex: 0,
  },
});