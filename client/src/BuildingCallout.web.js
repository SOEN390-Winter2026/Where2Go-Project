import React from "react";
import { View, Text, StyleSheet } from "react-native";

// Web-safe stub: avoids importing react-native-maps.
// We still render something so the UI doesn't feel broken.
export default function BuildingCallout({ buildings = [] }) {
  return (
    <View style={styles.container} pointerEvents="none">
      <Text style={styles.title}>Building info (Web)</Text>
      <Text style={styles.body}>
        Map callouts are available on mobile. {buildings.length} building(s) loaded.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
  },
  title: { fontSize: 14, fontWeight: "700", marginBottom: 4 },
  body: { fontSize: 12, color: "#555" },
});