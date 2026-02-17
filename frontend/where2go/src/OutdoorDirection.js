import { View, Text, StyleSheet, Pressable, ImageBackground, TextInput, ScrollView, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect } from 'react';
import { colors } from './theme/colors';
import * as Location from 'expo-location';
import ErrorModal from './ErrorModal';
import PropTypes from 'prop-types';

export default function OutdoorDirection({ onPressBack, initialFrom, initialTo }) {

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
  }, [initialTo])

  useEffect(() => {
    console.log("fromDestionation: ", fromDestination);
  }, [fromDestination]);

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
            onChangeText={setFromDestination}
            style={styles.inputText}
            onFocus={() => setIsPressedFromDest(true)}
            onBlur={() => setIsPressedFromDest(false)} />

        </View>

        <View style={styles.input}>
          <Text style={styles.inputLabel}>To</Text>
          <TextInput testID="inputDestLoc" placeholder="Choose destination"
            value={toDestination}
            onChangeText={setToDestination}
            style={styles.inputText} />
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
});

