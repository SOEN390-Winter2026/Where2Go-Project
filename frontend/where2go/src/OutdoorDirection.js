import { View, Text, StyleSheet, Pressable, ImageBackground, TextInput, ScrollView, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from 'react';
import { colors } from './theme/colors';
import * as Location from 'expo-location';
import ErrorModal from './ErrorModal';
import PropTypes from 'prop-types';

function getCentroid(coordinates) {
  const lat = coordinates.reduce((sum, c) => sum + c.latitude, 0) / coordinates.length;
  const lng = coordinates.reduce((sum, c) => sum + c.longitude, 0) / coordinates.length;
  return { latitude: lat, longitude: lng };
}

export default function OutdoorDirection({ onPressBack, buildings, initialFrom, initialTo }) {

  const routes = [
    { id: "1" }, { id: "2" }, { id: "3" },
  ]

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
    if (initialFrom !== "") setFromDestination(initialFrom);
  },[initialFrom]);

  useEffect(() => {
    if (initialTo !== "") setToDestination(initialTo);
  }, [initialTo]);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [fromCoordinates, setFromCoordinates] = useState(null);
  const [toCoordinates, setToCoordinates] = useState(null);

  useEffect(() => {
    console.log("fromDestionation: ", fromDestination);
  }, [fromDestination]);

  const handleFromChange = (text) => {
    setFromDestination(text);
    if (text.length < 1) { setFromSuggestions([]); return; }
    const filtered = buildings.filter(b =>
      b.name.toLowerCase().includes(text.toLowerCase())
    );
    setFromSuggestions(filtered.slice(0, 5));
  };
  
  const handleToChange = (text) => {
    setToDestination(text);
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
        <View style={styles.input}>
          <Text style={styles.inputLabel}>From</Text>
          <TextInput testID="inputStartLoc" placeholder="Choose Start Location"
            value={fromDestination}
            onChangeText={handleFromChange}
            style={styles.inputText}
            onFocus={() => setIsPressedFromDest(true)}
            onBlur={() => setIsPressedFromDest(false)} />
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
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.routesContent}>
          {routes.map((r) => (
            <View key={r.id} style={styles.routeContainer} />
          ))}
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
  },
  flex: 1,
  routesContent: {
  },
  liveLoc: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 10,
    marginTop: 2,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",        // vertical alignment
    gap: 8,
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

