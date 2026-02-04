import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";

export default function SideLeftBar({ currentCampus, onToggleCampus }) {
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

  const [active, setActive] = useState(null);

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

  /* ---------- Icons ---------- */
  const iconState = (name) => ({
    backgroundColor: active === name ? "#912338" : "white",
  });

  const iconSource = (name) => {
    if (name === "disability")
      return active === name ? secondDisabilityIcon : firstDisabilityIcon;
    if (name === "poi")
      return active === name ? secondPOIIcon : firstPOIIcon;
    if (name === "gps")
      return active === name ? secondGPSIcon : firstGPSIcon;
  };

  return (
    <View style={styles.floatLeftBar}>
      {/* -------- Custom Switch -------- */}
      <Pressable style={styles.barItem} onPress={toggleCampus}>
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
        style={[styles.barItem, iconState("disability")]}
        onPress={() => setActive("disability")}
      >
        <Image source={iconSource("disability")} style={styles.icon} />
      </Pressable>

      {/* -------- POI -------- */}
      <Pressable
        style={[styles.barItem, iconState("poi")]}
        onPress={() => setActive("poi")}
      >
        <Image source={iconSource("poi")} style={styles.icon} />
      </Pressable>

      {/* -------- GPS -------- */}
      <Pressable
        style={[styles.barItem, iconState("gps")]}
        onPress={() => setActive("gps")}
      >
        <Image source={iconSource("gps")} style={styles.icon} />
      </Pressable>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  floatLeftBar: {
    position: "absolute",
    padding: 5,
    borderWidth: 2,
    borderColor: "#912338",
    borderRadius: 50,
    left: "1%",
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

  icon: {
    width: 20,
    height: 20,
  },
});
