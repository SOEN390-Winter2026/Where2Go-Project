import { View, Text, StyleSheet, Pressable, ImageBackground, TextInput, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useCallback } from 'react';
import { colors } from './theme/colors';
import * as Location from 'expo-location';
import ErrorModal from './ErrorModal';
import PropTypes from 'prop-types';
import { GOOGLE_MAPS_API_KEY_ENV } from './config';

function getCentroid(coordinates) {
  const lat = coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length;
  const lng = coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length;
  return { latitude: lat, longitude: lng };
}

const GOOGLE_DIRECTIONS_BASE = 'https://maps.googleapis.com/maps/api/directions/json';

export default function OutdoorDirection({ onPressBack, buildings, initialFrom, initialTo }) {

  // Route results: { id, coordinates: [{latitude, longitude}, ...], distanceMeters, durationSeconds }
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState(null);

  //Input Destinations Variables
  const [fromDestination, setFromDestination] = useState("");
  const [toDestination, setToDestination] = useState("");

  //Live Location Variables
  const [liveLocCoordinates, setLiveLocCoordinates] = useState(null);
  const [isPressedFromDest, setIsPressedFromDest] = useState(false);
  
  //Error Modal Variables
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // For when you tap on a building and select it as destination/departure
  useEffect(() => {
    if (initialFrom === '') return;
    setFromDestination(initialFrom);
    const building = buildings.find((b) => b.name === initialFrom);
    if (building) setFromCoordinates(getCentroid(building.coordinates));
  }, [initialFrom, buildings]);

  useEffect(() => {
    if (initialTo === '') return;
    setToDestination(initialTo);
    const building = buildings.find((b) => b.name === initialTo);
    if (building) setToCoordinates(getCentroid(building.coordinates));
  }, [initialTo, buildings]);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromCoordinates, setFromCoordinates] = useState(null);
  const [toCoordinates, setToCoordinates] = useState(null);

  useEffect(() => {
    console.log("fromDestionation: ", fromDestination);
  }, [fromDestination]);

  const handleFromChange = (text) => {
    setFromDestination(text);
    setFromCoordinates(null);
    if (text.length < 1) { setFromSuggestions([]); return; }
    const filtered = buildings.filter(b =>
      b.name.toLowerCase().includes(text.toLowerCase())
    );
    setFromSuggestions(filtered.slice(0, 5));
  };
  
  const handleToChange = (text) => {
    setToDestination(text);
    setToCoordinates(null);
    if (text.length < 1) { setToSuggestions([]); return; }
    const filtered = buildings.filter(b =>
      b.name.toLowerCase().includes(text.toLowerCase())
    );
    setToSuggestions(filtered.slice(0, 5));
  };
  
  const handleFromSelect = (building) => {
    setFromDestination(building.name);
    setFromCoordinates(getCentroid(building.coordinates));
    setFromSuggestions([]);
  };
  
  const handleToSelect = (building) => {
    setToDestination(building.name);
    setToCoordinates(getCentroid(building.coordinates));
    setToSuggestions([]);
  };
  const calculateRoutes = useCallback(async (from, to) => {
    if (from?.latitude == null || to?.latitude == null) return;
    if (!GOOGLE_MAPS_API_KEY_ENV ) {
      setRoutesError('Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY to your .env file.');
      setRoutes([]);
      return;
    }
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const origin = `${from.latitude},${from.longitude}`;
      const destination = `${to.latitude},${to.longitude}`;
      const url = `${GOOGLE_DIRECTIONS_BASE}?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=walking&key=${GOOGLE_MAPS_API_KEY_ENV}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status !== 'OK' || !data.routes?.length) {
        setRoutes([]);
        setRoutesError(data.error_message || 'No route found between these locations.');
        return;
      }
      const routeList = data.routes.map((r, i) => {
        const leg = r.legs?.[0];
        const distanceMeters = leg?.distance?.value ?? 0;
        const durationSeconds = leg?.duration?.value ?? 0;
        const steps = (leg?.steps || []).map((s) => ({
          durationSeconds: s.duration?.value ?? 0,
          distanceMeters: s.distance?.value ?? 0,
        }));
        return {
          id: String(i + 1),
          distanceMeters,
          durationSeconds,
          steps,
        };
      });
      setRoutes(routeList);
    } catch (err) {
      console.warn('Route calculation failed:', err);
      setRoutes([]);
      setRoutesError('Unable to calculate routes. Check your connection and try again.');
    } finally {
      setRoutesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fromCoordinates && toCoordinates) {
      calculateRoutes(fromCoordinates, toCoordinates);
    } else {
      setRoutes([]);
      setRoutesError(null);
    }
  }, [fromCoordinates, toCoordinates, calculateRoutes]);

  const getCurrentLocation = async () => {
    try {
      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        setErrorMessage("Location services are turned off. Please enable location services in your device settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        setErrorMessage("Location permission denied. Please enable location permission in your app settings to use your current location.");
        setShowErrorModal(true);
        return;
      }

      // Original watchPositionAsync implementation
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
          if (!loc || !loc.coords) {
            setErrorMessage("Unable to get your location coordinates. Please try again or enter your starting location manually.");
            setShowErrorModal(true);
            return;
          }

          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          console.log("USER LOCATION:", coords);
          setFromDestination(`${coords.latitude},${coords.longitude}`);
          setLiveLocCoordinates(coords);
          setFromCoordinates(coords);
        }
      );

    } catch (error) {
      console.log("Location error:", error);
      let errorMsg = "Unable to get your current location. Please try again or enter your starting location manually.";
      
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMsg = "Location request timed out. Please check your GPS signal and try again, or enter your starting location manually.";
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMsg = "Location is currently unavailable. Please check your device settings and try again, or enter your starting location manually.";
      }
      
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };



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
        <Text style={styles.headerSubtitle}>
          Find the best route between campuses
        </Text>
        <View style={styles.fromWrapper}>
          <View style={styles.input}>
            <Text style={styles.inputLabel}>From</Text>
            <TextInput testID="inputStartLoc" placeholder="Choose Start Location"
              value={fromDestination}
              onChangeText={handleFromChange}
              style={styles.inputText}
              onFocus={() => setIsPressedFromDest(true)}
              onBlur={() => setIsPressedFromDest(false)} />
          </View>
          <Pressable onPress={() => getCurrentLocation()} style={styles.gpsIconBtn} hitSlop={12}>
            <Image source={require('../assets/lets-icons--gps-fixed.png')} style={styles.gpsIcon} resizeMode="contain" />
          </Pressable>
        </View>
        {fromSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {fromSuggestions.map((b) => (
              <Pressable key={b.id} style={styles.suggestionItem} onPress={() => handleFromSelect(b)}>
                <Text style={styles.suggestionText}>{b.name}</Text>
                <Text style={styles.suggestionCampus}>{b.campus}</Text>
              </Pressable>
            ))}
            </View>
        )}

        <View style={styles.input}>
          <Text style={styles.inputLabel}>To</Text>
          <TextInput testID="inputDestLoc" placeholder="Choose destination"
            value={toDestination}
            onChangeText={handleToChange}
            style={styles.inputText} />
        </View>
        {toSuggestions.length > 0 && (
          <View style={styles.suggestions}>
            {toSuggestions.map((b) => ( 
              <Pressable key={b.id} style={styles.suggestionItem} onPress={() => handleToSelect(b)}>
                <Text style={styles.suggestionText}>{b.name}</Text>
                <Text style={styles.suggestionCampus}>{b.campus}</Text>
              </Pressable>
            ))}
          </View>
        )}
        </View>

      <View style={styles.bottomPart}>
        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>
            {routesLoading
              ? 'Finding routes…'
              : fromCoordinates && toCoordinates
                ? `${routes.length} route${routes.length !== 1 ? 's' : ''} available`
                : 'Select both locations'}
          </Text>

          <Pressable testID="pressFilter">
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>
        {routesError ? (
          <Text style={styles.routesError}>{routesError}</Text>
        ) : null}
        <View style={styles.scrollBar} />
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.routesContent}>
          {(routes.length ? routes : fromCoordinates && toCoordinates ? [{ id: '1' }, { id: '2' }, { id: '3' }] : []).map((r) => {
            const hasData = r.durationSeconds != null && r.distanceMeters != null;
            const totalMins = hasData ? Math.round(r.durationSeconds / 60) : null;
            const arriveAt = hasData ? new Date(Date.now() + r.durationSeconds * 1000) : null;
            const arriveStr = arriveAt ? arriveAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const steps = r.steps || [];
            return (
              <View key={r.id} style={styles.routeContainer}>
                <View style={styles.routeLeftBar} />
                <View style={styles.routeContent}>
                  {hasData ? (
                    <>
                      <View style={styles.routeHeader}>
                        <Ionicons name="walk" size={22} color={colors.primary} />
                        <Text style={styles.routeDuration}>{totalMins} min</Text>
                      </View>
                      <Text style={styles.routeArrive}>Arrive {arriveStr}</Text>
                      <View style={styles.routeTimeline}>
                        <View style={styles.routeSegment}>
                          <Ionicons name="location" size={16} color={colors.primary} style={styles.routeIcon} />
                          <Text style={styles.routeSegmentTitle} numberOfLines={1}>{fromDestination}</Text>
                        </View>
                        {steps.map((step, idx) => (
                          <View key={idx}>
                            <View style={styles.routeStepLine} />
                            <View style={styles.routeSegment}>
                              <Ionicons name="walk-outline" size={16} color={colors.primary} style={styles.routeIcon} />
                              <Text style={styles.routeStepText}>
                                Walk {Math.round(step.durationSeconds / 60)} min ({step.distanceMeters} m)
                              </Text>
                            </View>
                          </View>
                        ))}
                        <View style={styles.routeStepLine} />
                        <View style={styles.routeSegment}>
                          <Ionicons name="location" size={16} color={colors.primary} style={styles.routeIcon} />
                          <Text style={styles.routeSegmentTitle} numberOfLines={1}>{toDestination}</Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.routeSummary}>
                      {routesLoading ? '…' : 'Route ' + r.id}
                    </Text>
                  )}
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
  buildings: PropTypes.array.isRequired,
  initialFrom: PropTypes.string,
  initialTo: PropTypes.string,
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
  fromWrapper: {
    position: 'relative',
    marginTop: 14,
  },
  gpsIconBtn: {
    position: 'absolute',
    top: '30%',
    right: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  gpsIcon: {
    width: 32,
    height: 32,
    tintColor: colors.primary,
  },
  bottomPart: {
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
  },
  routesError: {
    fontSize: 13,
    color: "#912338",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  filterText: {
    color: "#7C2B38",
    fontWeight: "800"
  },
  routesSection: {
    flex: 1,
    backgroundColor: "#F5F6F8",
    marginTop: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FCFCFC',
  },
  routeLeftBar: {
    width: 5,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  routeContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 16,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  routeDuration: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  routeArrive: {
    fontSize: 13,
    color: colors.primary,
    marginBottom: 12,
  },
  routeTimeline: {
    marginTop: 4,
  },
  routeSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeIcon: {
    marginRight: 8,
  },
  routeSegmentTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  routeStepText: {
    fontSize: 13,
    color: colors.primary,
  },
  routeStepLine: {
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.4,
    marginVertical: 6,
    marginLeft: 12,
  },
  routeSummary: {
    fontSize: 14,
    color: '#111',
    paddingVertical: 8,
  },
  routeBody: {
    flex: 1,
  },
  routesContent: {
  },
  suggestions: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: -10,
    zIndex: 99,
  },
  suggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: { fontSize: 14, color: '#111' },
  suggestionCampus: { fontSize: 12, color: '#888' },
});

