import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import IndoorSideLeftBar from "./IndoorSideLeftBar";

const FLOORS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
const BASE_PHONE_WIDTH = 390;
const FRAME_WIDTH = 420;
const SCALE = FRAME_WIDTH / BASE_PHONE_WIDTH;


export default function IndoorMaps({ building, onPressBack, campus, activeTab:activeTabProp, onTabChange }) {
  const width = FRAME_WIDTH;
  const height = FRAME_WIDTH * 2.1;


  const [activeTab, setActiveTab] = useState(activeTabProp ?? "info");
  const [classroomInput, setClassroomInput] = useState("");
  const [selectedFloor, setSelectedFloor] = useState("1");

  const [fromBuilding, setFromBuilding] = useState(building?.code ?? "H");
  const [fromFloor, setFromFloor] = useState("4");
  const [fromRoom, setFromRoom] = useState("401");

  const [toBuilding, setToBuilding] = useState("MB");
  const [toFloor, setToFloor] = useState("S1");
  const [toRoom, setToRoom] = useState("S1.01");

  const isDirections = activeTab === "directions";
  const isFloors = activeTab === "floors";
  const isInfo = activeTab === "info";

  const iconSize = 30 * SCALE;
  const changeTab= (tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <View style={styles.container}>
      <IndoorSideLeftBar
        onPressBack={onPressBack}
        onPressSearch={() => changeTab("directions")}
      />

      <View style={styles.mapArea}>
        <Ionicons name="map-outline" size={72} color="#cfcfcf" />
      </View>

      <View style={styles.sheet}>
        <View style={styles.dragArea}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.barRow}>
          <View style={styles.barSide}>
            <Pressable style={styles.tabBtn} onPress={() => changeTab("info")}>
              <Ionicons
                name="information-circle"
                size={iconSize}
                color={isInfo ? "#fff" : "rgba(255,255,255,0.55)"}
              />
            </Pressable>
          </View>

          <View style={styles.barCenter}>
            <Text style={styles.sheetCampus}>{campus ?? ""}</Text>
            <Text style={styles.sheetSubtitle}>Current Building:</Text>
            <Text style={styles.sheetTitle}>{building?.code ?? "—"}</Text>
          </View>

          <View style={styles.barSideRight}>
            <Pressable style={styles.tabBtn} onPress={() => changeTab("floors")}>
              <Ionicons
                name="layers"
                size={iconSize}
                color={isFloors ? "#fff" : "rgba(255,255,255,0.55)"}
              />
            </Pressable>
          </View>
        </View>

        {isInfo && (
            <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={{ paddingBottom: 20 * SCALE }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sheetContent}>

                <Text style={styles.infoLabel}>Building</Text>
                <Text style={styles.infoValue}>{building?.name ?? "—"}</Text>

                <Text style={styles.infoLabel}>Code</Text>
                <Text style={styles.infoValue}>{building?.code ?? "—"}</Text>

                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{building?.address ?? "—"}</Text>
                </View>

                <Pressable
                style={styles.bottomPrimaryBtn}
                onPress={() => changeTab("directions")}
                >
                <Text style={styles.bottomPrimaryBtnText}>Get Room Directions</Text>
                </Pressable>
          </ScrollView>
        )}

        {isFloors && (
            <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={{ paddingBottom: 20 * SCALE }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sheetContent}>

                <View style={styles.classroomRow}>
                <Text style={styles.classroomLabel}>Classroom # :</Text>
                <TextInput
                    style={styles.classroomInput}
                    value={classroomInput}
                    onChangeText={setClassroomInput}
                />
                </View>

                <View style={styles.floorBtnsWrap}>
                {FLOORS.map((floor) => (
                    <Pressable
                    key={floor}
                    style={[
                        styles.floorBtn,
                        selectedFloor === floor && styles.floorBtnActive,
                    ]}
                    onPress={() => setSelectedFloor(floor)}
                    >
                    <Text style={styles.floorBtnText}>{floor}</Text>
                    </Pressable>
                ))}
                </View>
                </View>
          </ScrollView>
        )}

        {isDirections && (
            <ScrollView
                style={styles.sheetScroll}
                contentContainerStyle={{ paddingBottom: 30 * SCALE }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sheetContent}>

                <Text style={styles.directionsTitle}>Directions</Text>

                <Text style={styles.sectionHeader}>From</Text>
                <View style={styles.dropdownRow}>
                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>BUILDING</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{fromBuilding}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>

                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>FLOOR</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{fromFloor}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>

                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>ROOM</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{fromRoom}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>
                </View>

                <View style={styles.swapWrap}>
                <View style={styles.swapLine} />
                <Pressable style={styles.swapBtn}>
                    <Ionicons name="swap-vertical" size={24} color="#fff" />
                </Pressable>
                <View style={styles.swapLine} />
                </View>

                <Text style={styles.sectionHeader}>To</Text>
                <View style={styles.dropdownRow}>
                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>BUILDING</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{toBuilding}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>

                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>FLOOR</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{toFloor}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>

                <View style={styles.dropdownGroup}>
                    <Text style={styles.dropdownLabel}>ROOM</Text>
                    <Pressable style={styles.fakeDropdown}>
                    <Text style={styles.fakeDropdownText}>{toRoom}</Text>
                    <Ionicons name="chevron-down" size={20} color="#912338" />
                    </Pressable>
                </View>
                </View>

                <Pressable style={styles.generateBtn}>
                <Text style={styles.generateBtnText}>Generate Directions</Text>
                </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  mapArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#912338",
    borderTopLeftRadius: 28 * SCALE,
    borderTopRightRadius: 28 * SCALE,
    height: 360 * SCALE,
    paddingBottom: 22 * SCALE,
  },
  dragArea: {
    alignItems: "center",
    paddingTop: 10,
  },
  dragHandle: {
    width: 56 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginBottom: 10,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    marginBottom: 16,
  },
  barSide: {
    width: 60,
    alignItems: "flex-start",
  },
  barSideRight: {
    width: 60,
    alignItems: "flex-end",
  },
  barCenter: {
    flex: 1,
    alignItems: "center",
  },
  sheetCampus: {
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
    fontSize: 16,
  },
  sheetScroll:{
    flex: 1,
  },
  sheetSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  sheetTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 54 * SCALE,
    lineHeight: 58 * SCALE,
  },
  tabBtn: {
    padding: 6,
  },
  sheetContent: {
    backgroundColor: "#fff",
    marginHorizontal: 16 * SCALE,
    borderRadius: 18 * SCALE,
    padding: 22 * SCALE,
  },
  infoLabel: {
    color: "#999",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 6,
    fontSize: 15,
  },
  infoValue: {
    color: "#333",
    fontWeight: "500",
    fontSize: 18,
  },
  bottomPrimaryBtn: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: "#fff",
    borderRadius: 18 * SCALE,
    borderWidth: 2,
    borderColor: "#d7d7d7",
    paddingVertical: 18,
    alignItems: "center",
  },
  bottomPrimaryBtnText: {
    color: "#912338",
    fontWeight: "700",
    fontSize: 18,
  },
  classroomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  classroomLabel: {
    fontWeight: "600",
    color: "#333",
    fontSize: 18,
  },
  classroomInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 10 * SCALE,
    backgroundColor: "#f5f5f5",
    fontSize: 18 * SCALE,
  },
  floorBtnsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  floorBtn: {
    width: 72 * SCALE,
    height: 72 * SCALE,
    borderRadius: 36 * SCALE,
    backgroundColor: "#912338",
    alignItems: "center",
    justifyContent: "center",
  },
  floorBtnActive: {
    backgroundColor: "#6b0f1a",
    borderWidth: 3,
    borderColor: "#fff",
  },
  floorBtnText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 18,
  },
  directionsTitle: {
    textAlign: "center",
    color: "#912338",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 22,
  },
  sectionHeader: {
    color: "#333",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 6,
  },
  dropdownRow: {
    flexDirection: "row",
    gap: 14,
  },
  dropdownGroup: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 12,
    color: "#8c8c8c",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 6,
  },
  fakeDropdown: {
    borderWidth: 2,
    borderColor: "#912338",
    borderRadius: 14 * SCALE,
    minHeight: 52 * SCALE,
    paddingHorizontal: 14 * SCALE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
  },
  fakeDropdownText: {
    color: "#912338",
    fontWeight: "600",
    fontSize: 18,
  },
  swapWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  swapLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  swapBtn: {
    width: 58 * SCALE,
    height: 58 * SCALE,
    borderRadius: 29 * SCALE,
    backgroundColor: "#912338",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16 * SCALE,
  },
  generateBtn: {
    backgroundColor: "#912338",
    borderRadius: 18 * SCALE,
    paddingVertical: 18 * SCALE,
    alignItems: "center",
    marginTop: 26 * SCALE,
  },
  generateBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
});