import {
  View, Text, TextInput, StyleSheet, Pressable,
  ImageBackground, ScrollView, ActivityIndicator, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import * as Location from "expo-location";
import { colors } from "./theme/colors";
import ErrorModal from "./ErrorModal";
import { API_BASE_URL } from "./config";
import { SEARCHABLE_LOCATIONS } from "./data/locations";

// Re-export so existing callers (e.g. tests) still work with
//   import { KNOWN_LOCATIONS } from './OutdoorDirection';
export { KNOWN_LOCATIONS } from "./data/locations";

/* ── Helper constants & functions ─────────────────────────────────────────── */

/** Max autocomplete results shown in the dropdown */
const MAX_RESULTS = 8;


function getBuildingDisplayName(label) {
  if (!label) return label;
  const parenIndex = label.indexOf("(");
  return parenIndex > 0 ? label.slice(0, parenIndex).trimEnd() : label;
}


/** Case-insensitive location filter for the autocomplete dropdown */
function filterLocations(query, buildings) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  
  // Search SEARCHABLE_LOCATIONS
  const searchableResults = SEARCHABLE_LOCATIONS.filter((loc) => loc.searchText.includes(q));
  
  // Also search buildings prop (if provided) by name
  let buildingResults = [];
  if (buildings && buildings.length > 0) {
    buildingResults = buildings.filter((building) => {
      const name = building.name?.toLowerCase() || "";
      return name.includes(q);
    }).map((building) => ({
      label: building.name,
      lat: building.coordinates?.[0]?.latitude || null,
      lng: building.coordinates?.[0]?.longitude || null,
      searchText: building.name?.toLowerCase() || "",
    }));
  }
  
  // Merge results, preferring building matches, then deduplicate by display name
  const combined = [...buildingResults, ...searchableResults];
  const seen = new Set();
  return combined.filter((loc) => {
    const displayName = getBuildingDisplayName(loc.label);
    if (seen.has(displayName)) return false;
    seen.add(displayName);
    return true;
  }).slice(0, MAX_RESULTS);
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
 *   origin        – optional { label, lat, lng } for the starting point
 *   destination   – optional { label, lat, lng } for the destination
 *   initialFrom   – optional building name string to pre-populate origin
 *   initialTo     – optional building name string to pre-populate destination
 *   buildings     – optional array of building objects for filtering suggestions
 *   onPressBack   – callback to close this screen
 */
export default function OutdoorDirection({ origin: originProp, destination: destProp, initialFrom, initialTo, buildings, onPressBack }) {
  // ---- Endpoint state ----
  const [origin, setOrigin] = useState(originProp ?? null);
  const [destination, setDestination] = useState(destProp ?? null);
  const [originQuery, setOriginQuery] = useState(originProp?.label ?? "");
  const [destQuery, setDestQuery] = useState(destProp?.label ?? "");
  const [activeField, setActiveField] = useState(null); // "origin" | "dest" | null

  // ---- Route state ----
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  // ---- Live location state ----
  const [liveLocCoordinates, setLiveLocCoordinates] = useState(null);

  // ---- Error modal state ----
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  // Handle initialFrom prop
  useEffect(() => {
    if (initialFrom) {
      setOriginQuery(initialFrom);
      setOrigin({ label: initialFrom, lat: null, lng: null });
    }
  }, [initialFrom]);

  // Handle initialTo prop
  useEffect(() => {
    if (initialTo) {
      setDestQuery(initialTo);
      setDestination({ label: initialTo, lat: null, lng: null });
    }
  }, [initialTo]);

  // ---- Route fetching (only when both endpoints are set) ----
  const fetchRoutes = useCallback(async () => {
    if (!origin?.lat || !destination?.lat) {
      setRoutes([]);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const clientTime = encodeURIComponent(new Date().toISOString());

      const res = await fetch(
        `${API_BASE_URL}/directions?originLat=${origin.lat}&originLng=${origin.lng}&destLat=${destination.lat}&destLng=${destination.lng}&clientTime=${clientTime}`
      );

      const data = await res.json();
      const errorObj = data?.error && typeof data.error === "object" ? data.error : null;
      const nextErrorCode = errorObj?.code ?? null;
      const errorMessage =
        errorObj?.message ?? (typeof data?.error === "string" ? data.error : null);

      if (!res.ok) {
        throw new Error(errorMessage || "Failed to fetch");
      }

      setRoutes(data.routes || []);

      if (nextErrorCode && nextErrorCode !== "NO_ROUTES") {
        setError(errorMessage || "Something went wrong");
      } else {
        setError(null);
      }

      setErrorCode(nextErrorCode);
    } catch (e) {
      setError(e.message);
      setErrorCode("UPSTREAM_FAILED");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);


  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // ---- Autocomplete filtering (only when the field is focused) ----
  const originResults = activeField === "origin" ? filterLocations(originQuery, buildings) : [];
  const destResults = activeField === "dest" ? filterLocations(destQuery, buildings) : [];

  // ---- Input handlers ----
  const onOriginTextChange = (text) => {
    setOriginQuery(text);
    setOrigin(null);
    setActiveField("origin");
  };

  const onDestTextChange = (text) => {
    setDestQuery(text);
    setDestination(null);
    setActiveField("dest");
  };

  const pickOrigin = (loc) => {
    const cleanLabel = getBuildingDisplayName(loc.label);
    setOrigin({ label: cleanLabel, lat: loc.lat, lng: loc.lng });
    setOriginQuery(cleanLabel);
    setActiveField(null);
    Keyboard.dismiss();
  };

  const pickDestination = (loc) => {
    const cleanLabel = getBuildingDisplayName(loc.label);
    setDestination({ label: cleanLabel, lat: loc.lat, lng: loc.lng });
    setDestQuery(cleanLabel);
    setActiveField(null);
    Keyboard.dismiss();
  };

  /** Delayed close so dropdown onPress fires before unmount */
  const scheduleClose = (field) => {
    setTimeout(() => setActiveField((prev) => (prev === field ? null : prev)), 150);
  };

  // ---- Live location ----
  const getCurrentLocation = async () => {
    try {
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMessage("Location services are turned off. Please enable location services in your device settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Location permission denied. Please enable location permission in your app settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
        (loc) => {
          if (!loc || !loc.coords) {
            setErrorMessage("Unable to get your location coordinates. Please try again or enter your starting location manually.");
            setShowErrorModal(true);
            return;
          }
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setLiveLocCoordinates(coords);
          const label = `${coords.latitude},${coords.longitude}`;
          setOriginQuery(label);
          setOrigin({ label, lat: coords.latitude, lng: coords.longitude });
        }
      );
    } catch (err) {
      let errorMsg = "Unable to get your current location. Please try again or enter your starting location manually.";
      if (err.code === "E_LOCATION_TIMEOUT") {
        errorMsg = "Location request timed out. Please check your GPS signal and try again, or enter your starting location manually.";
      } else if (err.code === "E_LOCATION_UNAVAILABLE") {
        errorMsg = "Location is currently unavailable. Please check your device settings and try again, or enter your starting location manually.";
      }
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };
  
  const showEmptyRoutesState =
    !loading &&
    routes.length === 0 &&
    (errorCode === "NO_ROUTES" || !!error);

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
        </Pressable>

        <Text style={styles.headerTitle}>Plan Your Trip</Text>
        <Text style={styles.headerSubtitle}>Find the best route between locations</Text>

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
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {originResults.map((loc, i) => (
                <Pressable
                  key={`origin-${loc.label}-${i}`}
                  style={styles.dropdownItem}
                  onPress={() => pickOrigin(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>{getBuildingDisplayName(loc.label)}</Text>
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
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {destResults.map((loc, i) => (
                <Pressable
                  key={`dest-${loc.label}-${i}`}
                  style={styles.dropdownItem}
                  onPress={() => pickDestination(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>{getBuildingDisplayName(loc.label)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.bottomPart}>
        {/* ---- Live Location Button (shown when From field is active) ---- */}
        {activeField === "origin" && (
          <Pressable onPress={getCurrentLocation} style={styles.liveLoc}>
            <Ionicons name="location" size={26} color="#912338" />
            <Text>Set to Your Location</Text>
          </Pressable>
        )}

        {/* ---- Routes header ---- */}
        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>{routes.length > 0 ? `${routes.length} routes\navailable` : `Routes\n`}</Text>
          <Pressable testID="pressFilter">
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>

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
          {error && !showEmptyRoutesState && (<Text style={styles.errorText}>{error}</Text>)}
          {showEmptyRoutesState && (
            <View testID="noRoutesState" style={styles.emptyState}>
              <Ionicons name="map-outline" size={28} color="#7C2B38" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No routes found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different start/destination or another mode.
              </Text>
            </View>
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
                    {r.distance?.text && <Text style={styles.routeDistance}>{r.distance.text}</Text>}
                    {r.scheduleNote && <Text style={styles.routeSchedule}>{r.scheduleNote}</Text>}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ---- Error Modal ---- */}
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
  origin: PropTypes.shape({ label: PropTypes.string, lat: PropTypes.number, lng: PropTypes.number }),
  destination: PropTypes.shape({ label: PropTypes.string, lat: PropTypes.number, lng: PropTypes.number }),
  initialFrom: PropTypes.string,
  initialTo: PropTypes.string,
  buildings: PropTypes.array,
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  header: {
    width: "100%",
    paddingTop: 35,
    paddingHorizontal: 20,
    position: "relative",
    zIndex: 10,
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
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
  },
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
  bottomPart: {
    flex: 1,
    marginTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "white",
    paddingTop: 10,
    overflow: "hidden",
  },
  liveLoc: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  },
  filterText: {
    color: "#7C2B38",
    fontWeight: "800",
  },
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
  routesContent: {},
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
  emptyState: {
  borderWidth: 1,
  borderColor: "#E6C9CF",
  backgroundColor: "#FFF7F8",
  padding: 16,
  borderRadius: 16,
  marginHorizontal: 16,
  marginTop: 10,
  alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
  },
});
