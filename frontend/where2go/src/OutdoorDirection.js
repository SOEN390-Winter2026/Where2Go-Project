import { View, Text, TextInput, StyleSheet, Pressable, ImageBackground, ScrollView, ActivityIndicator, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import { API_BASE_URL } from "./config";
import { SEARCHABLE_LOCATIONS } from "./data/locations";

// Re-export so existing callers (e.g. tests) still work with
//   import { KNOWN_LOCATIONS } from './OutdoorDirection';
export { KNOWN_LOCATIONS } from "./data/locations";

/* ── Helper constants & functions ─────────────────────────────────────────── */

/** Max autocomplete results shown in the dropdown */
const MAX_RESULTS = 8;

/** Case-insensitive location filter for the autocomplete dropdown */
function filterLocations(query) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  return SEARCHABLE_LOCATIONS.filter((loc) => loc.searchText.includes(q)).slice(0, MAX_RESULTS);
}

/** Map an API transport mode to a human-readable label and Ionicons icon name */
function getModeDisplay(mode) {
  if (mode === "concordia_shuttle") return { label: "Concordia Shuttle", icon: "bus" };
  if (mode === "walking") return { label: "Walking", icon: "walk" };
  if (mode === "transit") return { label: "Transit", icon: "bus" };
  return { label: mode, icon: "navigate" };
}

/**
 * OutdoorDirection — route planner screen with searchable From / To fields.
 *
 * Props:
 *   origin       – optional { label, lat, lng } for the starting point
 *   destination   – optional { label, lat, lng } for the destination
 *   onPressBack   – callback to close this screen
 *
 * The From / To fields are TextInputs with case-insensitive autocomplete.
 * Users can search by building name, building abbreviation (e.g. "MB", "EV"),
 * or campus name ("SGW", "Loyola").
 *
 * Routes are fetched only when BOTH origin and destination have valid lat/lng.
 */
export default function OutdoorDirection({ origin: originProp, destination: destProp, onPressBack }) {
  // ---- State ----
  const [origin, setOrigin] = useState(originProp ?? null);
  const [destination, setDestination] = useState(destProp ?? null);
  const [originQuery, setOriginQuery] = useState(originProp?.label ?? "");
  const [destQuery, setDestQuery] = useState(destProp?.label ?? "");
  const [activeField, setActiveField] = useState(null); // "origin" | "dest" | null
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync from parent props when they change (e.g. user taps a building in App)
  useEffect(() => {
    if (originProp) {
      setOrigin(originProp);
      setOriginQuery(originProp.label ?? "");
    }
  }, [originProp]);

  useEffect(() => {
    if (destProp) {
      setDestination(destProp);
      setDestQuery(destProp.label ?? "");
    }
  }, [destProp]);

  // ---- Route fetching (only when both endpoints are set) ----
  const fetchRoutes = useCallback(async () => {
    if (!origin?.lat || !destination?.lat) {
      setRoutes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const clientTime = encodeURIComponent(new Date().toISOString());
      const res = await fetch(
        `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}&clientTime=${clientTime}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setRoutes(data.routes || []);
    } catch (e) {
      setError(e.message);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // ---- Autocomplete filtering (only when the field is focused) ----
  const originResults = activeField === "origin" ? filterLocations(originQuery) : [];
  const destResults = activeField === "dest" ? filterLocations(destQuery) : [];

  // ---- Input handlers ----
  const onOriginTextChange = (text) => {
    setOriginQuery(text);
    setOrigin(null); // clear until user picks from dropdown
    setActiveField("origin"); // keep field active while typing (even if empty)
  };

  const onDestTextChange = (text) => {
    setDestQuery(text);
    setDestination(null);
    setActiveField("dest"); // keep field active while typing (even if empty)
  };

  const pickOrigin = (loc) => {
    setOrigin({ label: loc.label, lat: loc.lat, lng: loc.lng });
    setOriginQuery(loc.label);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const pickDestination = (loc) => {
    setDestination({ label: loc.label, lat: loc.lat, lng: loc.lng });
    setDestQuery(loc.label);
    setActiveField(null);
    Keyboard.dismiss();
  };

  /** Delayed close so dropdown onPress fires before unmount */
  const scheduleClose = (field) => {
    setTimeout(() => setActiveField((prev) => (prev === field ? null : prev)), 150);
  };

  // ---- Render ----
  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <Pressable testID="pressBack" style={styles.backBtn} onPress={onPressBack}>
          <Ionicons name="arrow-back" size={26} color="white" />
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Plan Your Trip</Text>
        <Text style={styles.headerSubtitle}>
          Find the best route between locations
        </Text>

        {/* ---- From ---- */}
        <View style={[styles.input, { zIndex: activeField === "origin" ? 20 : 1 }]}>
          <Text style={styles.inputLabel}>From</Text>
          <TextInput
            testID="inputStartLoc"
            style={styles.inputField}
            value={originQuery}
            onChangeText={onOriginTextChange}
            onFocus={() => setActiveField("origin")}
            onBlur={() => scheduleClose("origin")}
            placeholder="Search campus or building..."
            placeholderTextColor="#999"
            autoCorrect={false}
            returnKeyType="search"
          />
          {activeField === "origin" && originResults.length > 0 && (
            <ScrollView
              style={styles.dropdown}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {originResults.map((loc, i) => (
                <Pressable
                  key={`origin-${loc.label}-${i}`}
                  style={styles.dropdownItem}
                  onPress={() => pickOrigin(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>{loc.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ---- To ---- */}
        <View style={[styles.input, { zIndex: activeField === "dest" ? 20 : 1 }]}>
          <Text style={styles.inputLabel}>To</Text>
          <TextInput
            testID="inputDestLoc"
            style={styles.inputField}
            value={destQuery}
            onChangeText={onDestTextChange}
            onFocus={() => setActiveField("dest")}
            onBlur={() => scheduleClose("dest")}
            placeholder="Search campus or building..."
            placeholderTextColor="#999"
            autoCorrect={false}
            returnKeyType="search"
          />
          {activeField === "dest" && destResults.length > 0 && (
            <ScrollView
              style={styles.dropdown}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {destResults.map((loc, i) => (
                <Pressable
                  key={`dest-${loc.label}-${i}`}
                  style={styles.dropdownItem}
                  onPress={() => pickDestination(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>{loc.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>



      <View style={styles.bottomPart}>
        {/*Live Location Button*/}

        {isPressedFromDest &&
          <View>
            <Pressable
              onPress={() => { getCurrentLocation() }}
              style={styles.liveLoc}>
              <Ionicons name="location" size={26} color="#912338" />
              <Text>Set to Your Location</Text>
            </Pressable>
          </View>}

        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>
            {routes.length} routes{"\n"}available
          </Text>

          <Pressable testID="pressFilter">
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>
        <View style={styles.scrollBar} />
        <ScrollView
        <View style={styles.scrollBar} />
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.routesContent}
          keyboardShouldPersistTaps="handled"
        >
          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#7C2B38" style={{ marginRight: 10 }} />
              <Text style={styles.loadingText}>Loading routes...</Text>
            </View>
          )}
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {!loading && routes.map((r, i) => {
            const { label, icon } = getModeDisplay(r.mode);
            return (
              <View key={`${r.mode}-${i}`} style={styles.routeContainer}>
                <View style={styles.routeBody}>
                  <Ionicons name={icon} size={28} color="#7C2B38" style={styles.routeIcon} />
                  <View style={styles.routeDetails}>
                    <Text style={styles.routeMode}>{label}</Text>
                    <Text style={styles.routeTime}>{r.duration?.text || "—"}</Text>
                    {r.distance?.text && (
                      <Text style={styles.routeDistance}>{r.distance.text}</Text>
                    )}
                    {r.scheduleNote && (
                      <Text style={styles.routeSchedule}>{r.scheduleNote}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Error Modal */}
      <ErrorModal
        visible={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="Location Unavailable"
        message={errorMessage}
        iconName="alert-circle"
        iconColor="#912338"
        buttonText="OK"
      />
    </ImageBackground>
  );
}

OutdoorDirection.propTypes = {
  onPressBack: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    flex: 1,
  },
  header: {
    width: "100%",
    paddingTop: 35,
    paddingHorizontal: 20,
    position: "relative",
    zIndex: 10, // keep header (with dropdowns) above bottomPart
  },
  backBtn: {
    position: "absolute",
    top: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 30,
    marginTop: 30,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
  },

  /* ---- Input card ---- */
  input: {
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 14,
    padding: 10,
    marginTop: 14,
    backgroundColor: "white",
  },
  inputLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  inputField: {
    fontSize: 16,
    color: "#111",
    paddingVertical: 4,
  },

  /* ---- Autocomplete dropdown ---- */
  dropdown: {
    maxHeight: 200,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 6,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },

  /* ---- Routes area ---- */
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
  },
  errorText: {
    fontSize: 14,
    color: "#c00",
    padding: 16,
  },
  bottomPart: {
    flex: 1,
    flex: 1,
    marginTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "white",
    paddingTop: 10,
    overflow: "hidden",
  },
  routesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  routesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  routesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  filterText: {
  filterText: {
    color: "#7C2B38",
    fontWeight: "800",
  },
  routeContainer: {
  routeContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#7C2B38",
    flexDirection: "row",
    marginBottom: 16,
    marginHorizontal: 16,
    height: 170,
    marginHorizontal: 16,
    height: 170,
  },
  routeBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  routeIcon: {
    marginRight: 14,
  },
  routeDetails: {
    flex: 1,
  },
  routeMode: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 4,
  },
  routeTime: {
    fontSize: 16,
    color: "#333",
    marginBottom: 2,
  },
  routeDistance: {
    fontSize: 13,
    color: "#666",
  },
  routeSchedule: {
    fontSize: 12,
    color: "#7C2B38",
    marginTop: 4,
    fontStyle: "italic",
  },
  routesContent: {},
  scrollBar: {},
});
