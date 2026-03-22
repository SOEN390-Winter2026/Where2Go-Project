import React from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BuildingInfoModal({
  building,
  visible,
  onClose,
  onSetDeparture,
  onSetDestination,
  onGoInside,
  selectedRole,
}) {
  const bottomPadding = Platform.OS === "android" ? 24 : 16;

  if (!visible || !building) return null;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable style={styles.modalContainer} onPress={() => {}}>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>

        <View style={styles.headerImagePlaceholder} />

        <ScrollView contentContainerStyle={styles.bodyContent}>
          <Text style={styles.buildingName}>{building.name}</Text>
          <Text style={styles.buildingCode}>{building.code}</Text>

          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.address}>{building.address}</Text>

          {building.link ? (
            <Pressable onPress={() => Linking.openURL(building.link)}>
              <Text style={styles.link}>View on Concordia.ca</Text>
            </Pressable>
          ) : null}

          <Text style={styles.sectionTitle}>Services</Text>
          <Text style={styles.servicesPlaceholder}>
            Services info coming soon.
          </Text>

          <View style={[styles.modalBtns, { paddingBottom: bottomPadding }]}>
            {selectedRole ? (
              <Pressable
                style={styles.cancelBtnDesign}
                onPress={() => {
                  if (selectedRole === "departure") onSetDeparture(null);
                  else onSetDestination(null);
                }}
              >
                <Text style={styles.cancelBtnText}>
                  Selected as{" "}
                  {selectedRole === "departure" ? "Departure" : "Destination"}.
                  Press again to cancel.
                </Text>
              </Pressable>
            ) : (
              <View style={styles.topBtnsRow}>
                <Pressable
                  style={styles.btnDesign}
                  onPress={() => onSetDeparture?.(building)}
                >
                  <Text style={styles.btnsText}>Set as Departure</Text>
                </Pressable>

                <Pressable
                  style={styles.btnDesign}
                  onPress={() => onSetDestination?.(building)}
                >
                  <Text style={styles.btnsText}>Set as Destination</Text>
                </Pressable>
              </View>
            )}

            <Pressable
              style={styles.goInsideBtn}
              onPress={() => onGoInside?.(building)}
            >
              <Text style={styles.goInsideBtnText}>
                Go inside <Ionicons size={20} name="log-in-outline" />
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "65%",
    width: "100%",
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 14,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  headerImagePlaceholder: {
    width: "100%",
    height: 180,
    backgroundColor: "#d9d9d9",
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  buildingName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#912338",
    marginBottom: 2,
  },
  buildingCode: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
  },
  link: {
    fontSize: 14,
    color: "#1a73e8",
    marginTop: 4,
    marginBottom: 8,
  },
  servicesPlaceholder: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  modalBtns: {
    flexDirection: "column",
    paddingVertical: 24,
    gap: 12,
  },
  topBtnsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  btnDesign: {
    backgroundColor: "#912338",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    flex: 1,
  },
  btnsText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  goInsideBtn: {
    backgroundColor: "white",
    borderColor: "#912338",
    borderWidth: 3,
    borderRadius: 12,
    paddingVertical: 12,
    width: "100%",
  },
  goInsideBtnText: {
    color: "#912338",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelBtnDesign: {
    borderColor: "#912338",
    borderWidth: 3,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    flex: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});