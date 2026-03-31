import {
  View, Text, TextInput, Pressable,
  ImageBackground, ScrollView, ActivityIndicator, Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import * as Location from "expo-location";
import ErrorModal from "./ErrorModal";
import AutocompleteDropdown from "./AutocompleteDropdown";
import { getBuildingDisplayName, filterLocations, resolveLocationByName } from "./utils/locationSearch";
import polyline from "@mapbox/polyline";

import NavigationContext from "./navigation/NavigationContext";

import { styles } from "./styles/OutdoorDirection_styles";

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
export default function OutdoorDirection({
  origin: originProp,
  destination: destProp,
  initialFrom,
  onSelectRoute,
  initialTo,
  buildings,
  onPressBack,
  __testMapRef,
  userLocation,
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

  // for testing
  useEffect(() => {
    if (__testMapRef && mapRef) {
      mapRef.current = __testMapRef;
    }
  }, [__testMapRef]);

  // update origin (start location) whenever something changes. User typed/typing, dropdown choice, clearing search box 
  useEffect(() => {
    if (originProp) {
      setOrigin(originProp);
      setOriginQuery(originProp.label ?? "");
    }
  }, [originProp]);

  // update dest (end location) whenever something changes. User typed/typing, dropdown choice, clearing search box
  useEffect(() => {
    if (destProp) {
      setDestination(destProp);
      setDestQuery(destProp.label ?? "");
    }
  }, [destProp]);

  // set start location after user selected on map
  useEffect(() => {
    if (!initialFrom) return;
    const resolved = resolveLocationByName(initialFrom, buildings);
    setOriginQuery(resolved.label ?? initialFrom);
    setOrigin(resolved);
  }, [initialFrom, buildings]);

  // set end location after user selected on map
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

  // fetches routes whenever fetchroute changes. Since the user can decide to change either start or end or both inputs anytime, this keeps it up
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

  // rezoom map to fit in the screen when routes/directions lines are shown
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

  const getCurrentLocation = () => {
    if (!userLocation) {
      setErrorMessage("Location not available. Please enable location services and try again.");
      setShowErrorModal(true);
      return;
    }

    const { latitude, longitude } = userLocation;
    console.log("User location obtained:", latitude, longitude);
    const nearestBuilding = findNearestBuilding(latitude, longitude);
    console.log("Nearest building found:", nearestBuilding);
    
    if (nearestBuilding) {
      const buildingLat = nearestBuilding.coordinates?.[0]?.latitude || nearestBuilding.lat;
      const buildingLng = nearestBuilding.coordinates?.[0]?.longitude || nearestBuilding.lng;
      const cleanLabel = getBuildingDisplayName(nearestBuilding.name || nearestBuilding.label);
      setOriginQuery(cleanLabel);
      setOrigin({ label: cleanLabel, lat: buildingLat, lng: buildingLng });
    } else {
      setErrorMessage("No nearby buildings found. Please enter your starting location manually.");
      setShowErrorModal(true);
    }
  };

  const findNearestBuilding = useCallback((latitude, longitude) => {
    if (!buildings || buildings.length === 0) return null;
    
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let nearestBuilding = null;
    let minDistance = Infinity;

    buildings.forEach((building) => {
      const buildingLat = building.coordinates?.[0]?.latitude || building.lat;
      const buildingLng = building.coordinates?.[0]?.longitude || building.lng;
      
      if (buildingLat && buildingLng) {
        const distance = calculateDistance(latitude, longitude, buildingLat, buildingLng);
        if (distance < minDistance) {
          minDistance = distance;
          nearestBuilding = building;
        }
      }
    });

    return nearestBuilding;
  }, [buildings]);

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
{/*top left back button*/}
      <View style={styles.header}>
        <Pressable testID="pressBack" style={styles.backBtn} onPress={onPressBack}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Plan Your Trip</Text>
        <Text style={styles.headerSubtitle}>Find the best route between locations</Text>

{/*text box input start*/}
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
            <AutocompleteDropdown
              results={originResults}
              visible={true}
              onSelect={pickOrigin}
              formatLabel={getBuildingDisplayName}
            />
          )}
        </View>

{/*text box input end*/}
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
            <AutocompleteDropdown
              results={destResults}
              visible={true}
              onSelect={pickDestination}
              formatLabel={getBuildingDisplayName}
            />
          )}
        </View>
      </View>

      <View style={styles.bottomPart}>
{/*live location setting button*/}
        {activeField === "origin" && (
          <Pressable onPress={getCurrentLocation} style={styles.liveLoc}>
            <Ionicons name="location" size={26} color="#912338" />
            <Text>Set Nearest Building as the Departure Location</Text>
          </Pressable>
        )}

{/*routes count*/}
        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>
            {routes.length} routes{"\n"}available
          </Text>
        </View>

{/*show routes options or fails*/}
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
  userLocation: PropTypes.shape({ latitude: PropTypes.number, longitude: PropTypes.number }),
};

export const __test__ = {
  getBuildingDisplayName,
  filterLocations,
  resolveLocationByName,
  getModeDisplay,
  decodePolylineToCoords,
  stepsToSegments,
};