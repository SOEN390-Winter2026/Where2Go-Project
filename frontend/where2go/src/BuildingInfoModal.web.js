import React from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";

export default function BuildingInfoModal({
  building,
  visible,
  onClose,
  onSetDeparture,
  onSetDestination,
  selectedRole,
}) {
  if (!visible || !building) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {building.name} {building.code ? `(${building.code})` : ""}
        </Text>

        {building.address ? <Text style={styles.text}>{building.address}</Text> : null}

        {building.link ? (
          <Pressable onPress={() => Linking.openURL(building.link)}>
            <Text style={styles.link}>Open Concordia building page</Text>
          </Pressable>
        ) : null}

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={() => onSetDeparture?.(building)}>
            <Text style={styles.btnText}>
              {selectedRole === "departure" ? "Departure ✓" : "Set departure"}
            </Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={() => onSetDestination?.(building)}>
            <Text style={styles.btnText}>
              {selectedRole === "destination" ? "Destination ✓" : "Set destination"}
            </Text>
          </Pressable>
        </View>

        <Pressable style={[styles.btn, styles.close]} onPress={onClose}>
          <Text style={styles.btnText}>Close</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    width: 360,
    maxWidth: "92%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8, color: "#111" },
  text: { fontSize: 14, color: "#444", marginBottom: 10 },
  link: { color: "#7C2B38", fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: {
    flex: 1,
    backgroundColor: "#7C2B38",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  close: { backgroundColor: "#444" },
  btnText: { color: "white", fontWeight: "700" },
});