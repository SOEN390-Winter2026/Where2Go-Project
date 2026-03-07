import {
  View, Text, TextInput, Pressable,
  ImageBackground, ScrollView, ActivityIndicator, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import * as Location from "expo-location";
import ErrorModal from "./ErrorModal";
import { SEARCHABLE_LOCATIONS } from "./data/locations";
import polyline from "@mapbox/polyline";

import NavigationContext from "./navigation/NavigationContext";

import { styles } from "./styles/OutdoorDirection_styles";

export { KNOWN_LOCATIONS } from "./data/locations";

const MAX_RESULTS = 8;

const RetryButton = ({ onPress, loading }) => (
  <Pressable
    style={[styles.retryButton, loading && { opacity: 0.6 }]}
    onPress={onPress}
    disabled={loading}
  >
    <Text style={styles.retryButtonText}>Try Again</Text>
  </Pressable>
);

RetryButton.propTypes = {
  onPress: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

RetryButton.defaultProps = {
  loading: false,
};
function getBuildingDisplayName(label) {
  if (!label) return label;
  const parenIndex = label.indexOf("(");
  return parenIndex > 0 ? label.slice(0, parenIndex).trimEnd() : label;
}

function filterLocations(query, buildings) {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();

  const searchableResults = SEARCHABLE_LOCATIONS.filter((loc) => loc.searchText.includes(q));

  let buildingResults = [];
  if (buildings && buildings.length > 0) {
    buildingResults = buildings
      .filter((building) => (building.name?.toLowerCase() || "").includes(q))
      .map((building) => ({
        label: building.name,
        lat: building.coordinates?.[0]?.latitude || null,
        lng: building.coordinates?.[0]?.longitude || null,
        searchText: building.name?.toLowerCase() || "",
      }));
  }

  const combined = [...buildingResults, ...searchableResults];
  const seen = new Set();
  return combined
    .filter((loc) => {
      const displayName = getBuildingDisplayName(loc.label);
      if (seen.has(displayName)) return false;
      seen.add(displayName);
      return true;
    })
    .slice(0, MAX_RESULTS);
}

function resolveLocationByName(name, buildings) {
  if (!name) return null;
  const q = name.toLowerCase().trim();

  if (buildings?.length) {
    const b = buildings.find((b) => b.name?.toLowerCase() === q);
    if (b) {
      return {
        label: b.name,
        lat: b.coordinates?.[0]?.latitude ?? null,
        lng: b.coordinates?.[0]?.longitude ?? null,
      };
    }
  }

  const loc = SEARCHABLE_LOCATIONS.find(
    (l) =>
      getBuildingDisplayName(l.label)?.toLowerCase() === q ||
      l.label?.toLowerCase() === q
  );
  if (loc) {
    return { label: getBuildingDisplayName(loc.label), lat: loc.lat, lng: loc.lng };
  }

  return { label: name, lat: null, lng: null };
}

function getModeDisplay(mode) {
  if (mode === "concordia_shuttle") return { label: "Concordia Shuttle", icon: "bus" };
  if (mode === "walking") return { label: "Walking", icon: "walk" };
  if (mode === "transit") return { label: "Transit", icon: "bus" };
  return { label: mode, icon: "navigate" };
}

function decodePolylineToCoords(encoded) {
  if (!encoded) return [];
  const pts = polyline.decode(encoded);
  return pts.map(([latitude, longitude]) => ({ latitude, longitude }));
}

function stepsToSegments(route) {
  const steps = route?.steps ?? [];
  return steps
    .map((s) => {
      const coords = decodePolylineToCoords(s.polyline);
      if (!coords.length) return null;
      return {
        coords,
        isWalk: s.type === "walk",
        vehicle: s.vehicle || null,
        line: s.line || "",
        from: s.from || "",
        to: s.to || "",
      };
    })
    .filter(Boolean);
}
export default function OutdoorDirection({
  origin: originProp,
  destination: destProp,
  initialFrom,
  onSelectRoute,
  initialTo,
  buildings,
  onPressBack,
  __testMapRef,
}) {
  const [origin, setOrigin] = useState(originProp ?? null);
  const [destination, setDestination] = useState(destProp ?? null);
  const [originQuery, setOriginQuery] = useState(originProp?.label ?? "");
  const [destQuery, setDestQuery] = useState(destProp?.label ?? "");
  const [activeField, setActiveField] = useState(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(-1);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const mapRef = useRef(null);
  // Strategy pattern: default strategy fetches all modes
  const navContext = useRef(new NavigationContext("all"));

  useEffect(() => {
    if (__testMapRef && mapRef) {
      mapRef.current = __testMapRef;
    }
  }, [__testMapRef]);

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

  useEffect(() => {
    if (!initialFrom) return;
    const resolved = resolveLocationByName(initialFrom, buildings);
    setOriginQuery(resolved.label ?? initialFrom);
    setOrigin(resolved);
  }, [initialFrom, buildings]);

  useEffect(() => {
    if (!initialTo) return;
    const resolved = resolveLocationByName(initialTo, buildings);
    setDestQuery(resolved.label ?? initialTo);
    setDestination(resolved);
  }, [initialTo, buildings]);

  const handleSelectRoute = ({ route, origin: o, destination: d }) => {
    const segs = stepsToSegments(route);
    const coordsToFit = segs.length
      ? segs.flatMap((s) => s.coords)
      : decodePolylineToCoords(route?.polyline);

    if (coordsToFit.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
        animated: true,
      });
    }
    if (onSelectRoute) onSelectRoute({ route, origin: o, destination: d });
  };

  const fetchRoutes = useCallback(async () => {
    if (!origin?.lat || !destination?.lat) {
      setRoutes([]);
      setSelectedRouteIndex(-1);
      setError(null);
      setErrorCode(null);
      return;
    }
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const newRoutes = await navContext.current.getRoutes(origin, destination);
      setRoutes(newRoutes);
      setSelectedRouteIndex(newRoutes.length > 0 ? 0 : -1);
      if (newRoutes.length === 0) setErrorCode("NO_ROUTES");
    } catch (e) {
      setRoutes([]);
      setError(e?.message || "Failed to fetch directions");
      setErrorCode("UPSTREAM_FAILED");
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const originResults = activeField === "origin" ? filterLocations(originQuery, buildings) : [];
  const destResults = activeField === "dest" ? filterLocations(destQuery, buildings) : [];

  const selectedRoute = selectedRouteIndex >= 0 ? routes[selectedRouteIndex] : null;

  const selectedRouteCoords = useMemo(() => {
    if (!selectedRoute?.polyline) return [];
    const pts = polyline.decode(selectedRoute.polyline);
    return pts.map(([latitude, longitude]) => ({ latitude, longitude }));
  }, [selectedRoute]);

  const fitRouteOnMap = useCallback((coords) => {
    if (!mapRef.current || !coords?.length) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
      animated: true,
    });
  }, []);

  useEffect(() => {
    if (selectedRouteCoords.length > 0) {
      fitRouteOnMap(selectedRouteCoords);
    }
  }, [selectedRouteCoords, fitRouteOnMap]);

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

  const clearOrigin = () => {
    setOriginQuery("");
    setOrigin(null);
    setRoutes([]);
    setSelectedRouteIndex(-1);
  };

  const clearDest = () => {
    setDestQuery("");
    setDestination(null);
    setRoutes([]);
    setSelectedRouteIndex(-1);
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

  const scheduleClose = (field) => {
    setTimeout(() => setActiveField((prev) => (prev === field ? null : prev)), 150);
  };

  const getCurrentLocation = async () => {
    try {
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMessage("Location services are turned off. Please enable location services in your device settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMessage("Location permission denied. Please enable location permission in your app settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
        (loc) => {
          if (!loc?.coords) {
            setErrorMessage("Unable to get your location coordinates. Please try again or enter your starting location manually.");
            setShowErrorModal(true);
            return;
          }
          const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
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

  const handleRetry = useCallback(() => {
    if (loading) return;
    if (!origin?.lat || !destination?.lat) return;
    fetchRoutes();
  }, [loading, origin, destination, fetchRoutes]);

  const hasValidEndpoints = origin?.lat != null && destination?.lat != null;
  const showEmptyState = hasValidEndpoints && !loading && routes.length === 0 &&
      (errorCode === "NO_ROUTES" || !!error || errorCode === "UPSTREAM_FAILED");
  const showSelectLocationsState = !loading &&
    !hasValidEndpoints && (originQuery.trim().length > 0 || destQuery.trim().length > 0);

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

        <View style={[styles.input, { zIndex: activeField === "origin" ? 20 : 1 }]}>
          <Text style={styles.inputLabel}>From</Text>
          <View style={styles.inputRow}>
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
            {originQuery.length > 0 && (
              <Pressable onPress={clearOrigin} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </Pressable>
            )}
          </View>
          {activeField === "origin" && originResults.length > 0 && (
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {originResults.map((loc) => (
                <Pressable
                  key={`origin-${loc.label}`}
                  style={styles.dropdownItem}
                  onPress={() => pickOrigin(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {getBuildingDisplayName(loc.label)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={[styles.input, { zIndex: activeField === "dest" ? 20 : 1 }]}>
          <Text style={styles.inputLabel}>To</Text>
          <View style={styles.inputRow}>
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
            {destQuery.length > 0 && (
              <Pressable onPress={clearDest} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </Pressable>
            )}
          </View>
          {activeField === "dest" && destResults.length > 0 && (
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {destResults.map((loc) => (
                <Pressable
                  key={`dest-${loc.label}`}
                  style={styles.dropdownItem}
                  onPress={() => pickDestination(loc)}
                >
                  <Ionicons name="location-outline" size={16} color="#7C2B38" style={{ marginRight: 8 }} />
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {getBuildingDisplayName(loc.label)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={styles.bottomPart}>
        {activeField === "origin" && (
          <Pressable onPress={getCurrentLocation} style={styles.liveLoc}>
            <Ionicons name="location" size={26} color="#912338" />
            <Text>Set to Your Location</Text>
          </Pressable>
        )}

        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>
            {routes.length} routes{"\n"}available
          </Text>
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
          {showEmptyState && (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="map-outline" size={40} color="#7C2B38" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyStateTitle}>No routes found</Text>
              <Text style={styles.emptyStateText}>
                {error
                  ? "Try selecting different locations or check your connection."
                  : "Try selecting different locations or another mode."}
              </Text>
              <RetryButton onPress={handleRetry} loading={loading} />
            </View>
          )}
          {showSelectLocationsState && (
            <View style={styles.emptyStateContainer} testID="selectLocationsState">
              <Ionicons name="search-outline" size={40} color="#7C2B38" style={{ marginBottom: 10 }} />
              <Text style={styles.emptyStateTitle}>Select valid locations</Text>
              <Text style={styles.emptyStateText}>Please pick a suggestion from the dropdown.</Text>
            </View>
          )}

          {/* route list */}
          {!loading &&
            routes.map((r, i) => {
              const { label, icon } = getModeDisplay(r.mode);
              const isSelected = i === selectedRouteIndex;
              const routeKey = `${r.mode}-${r.duration?.text ?? i}`;

              return (
                <Pressable
                  key={routeKey}
                  onPress={() => {
                    const normalizedPolyline =
                      typeof r?.polyline === "string"
                        ? r.polyline
                        : r?.polyline?.encodedPolyline ??
                          r?.polyline?.points ??
                          r?.overview_polyline?.points ??
                          r?.overviewPolyline?.points ??
                          null;

                    const normalized = { ...r, polyline: normalizedPolyline };
                    handleSelectRoute({ route: normalized, origin, destination });
                    setSelectedRouteIndex(i);
                    onPressBack?.();
                  }}
                  style={[styles.routeContainer, isSelected && styles.routeContainerSelected]}
                >
                  <View style={styles.routeBody}>
                    <Ionicons
                      name={icon}
                      size={28}
                      color={isSelected ? "#fff" : "#7C2B38"}
                      style={styles.routeIcon}
                    />
                    <View style={styles.routeDetails}>
                      <Text style={[styles.routeMode, isSelected && styles.routeTextSelected]}>
                        {label}
                      </Text>
                      <Text style={[styles.routeTime, isSelected && styles.routeTextSelected]}>
                        {r.duration?.text || "—"}
                      </Text>
                      {r.distance?.text && (
                        <Text style={[styles.routeDistance, isSelected && styles.routeSubTextSelected]}>
                          {r.distance.text}
                        </Text>
                      )}
                      {r.scheduleNote && (
                        <Text style={[styles.routeSchedule, isSelected && styles.routeSubTextSelected]}>
                          {r.scheduleNote}
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
        </ScrollView>
      </View>

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
  onSelectRoute: PropTypes.func,
  origin: PropTypes.shape({ label: PropTypes.string, lat: PropTypes.number, lng: PropTypes.number }),
  destination: PropTypes.shape({ label: PropTypes.string, lat: PropTypes.number, lng: PropTypes.number }),
  initialFrom: PropTypes.string,
  initialTo: PropTypes.string,
  buildings: PropTypes.array,
  __testMapRef: PropTypes.object,
};

export const __test__ = {
  getBuildingDisplayName,
  filterLocations,
  getModeDisplay,
  decodePolylineToCoords,
  stepsToSegments,
};