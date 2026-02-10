import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TopRightMenu({onPressDirection}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      {/* The Red Hamburger Button */}
      <Pressable 
        style={styles.menuButton} 
        onPress={() => setIsOpen(!isOpen)}
      >
        <Ionicons name="menu" size={32} color="white" />
      </Pressable>

      {/* The Dropdown Menu */}
      {isOpen && (
        <View style={styles.dropdown}>
          <Pressable style={styles.menuItem} onPress={() => setIsOpen(false)}>
            <Text style={styles.menuText}>Map</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={onPressDirection}>
            <Text style={styles.menuText}>Direction</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => setIsOpen(false)}>
            <Text style={styles.menuText}>Calendar</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={() => setIsOpen(false)}>
            <Text style={styles.menuText}>Feedback</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "5%", // Matches left side bar top alignment
    right: "3%", // Opposite side of side bar 
    alignItems: "flex-end",
    zIndex: 1000,
  },
  menuButton: {
    backgroundColor: "#912338", 
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
  },
  dropdown: {
    backgroundColor: "#912338",
    marginTop: 10,
    borderRadius: 8,
    minWidth: 150,
    padding: 5,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  menuText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
  },
});