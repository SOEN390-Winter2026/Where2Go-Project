import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Platform,Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon } from 'react-native-maps';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import LoginScreen from "./src/Login";
import OutdoorDirection from "./src/OutdoorDirection";
import { colors } from "./src/theme/colors";
import { API_BASE_URL } from "./src/config";


export default function App() {
///////////
useEffect(() => {
  console.log("API_BASE_URL =", API_BASE_URL);
}, []);

//////////////

  const [userType, setUserType] = useState(null);
  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const [currentCampus, setCurrentCampus] = useState("SGW");
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });

  const [buildings, setBuildings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const [userDraggedMap, setUserDraggedMap] = useState(false);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);

  const watchRef = useRef(null);
  const mapRef = useRef(null);

  // Snap back to user
  const snapBackToUser = () => {
    if (!mapRef.current || !userLocation) return;

    mapRef.current.animateToRegion(
      {
        ...userLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400
    );
    setUserDraggedMap(false);
  };

  useEffect(() => {
    if (liveLocationEnabled && userLocation) {
      snapBackToUser();
    }
  }, [liveLocationEnabled, userLocation]);

  // Fetch campus coords + buildings when campus changes
  useEffect(() => {
    fetch(`${API_BASE_URL}/campus/${currentCampus}`)
      .then((res) => res.json())
      .then((data) => {
        const nextCoords = { latitude: data.lat, longitude: data.lng };
        setCampusCoords(nextCoords);

        mapRef.current?.animateToRegion(
          {
            ...nextCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      })
      .catch((err) => console.error("Error fetching campus coordinates:", err));

    // fetch(`${API_BASE_URL}/campus/${currentCampus}/buildings`)
    //   .then((res) => res.json())
    //   .then(setBuildings)
    //   .catch((err) => console.error("Error fetching buildings:", err));

    fetch(`${API_BASE_URL}/campus/${currentCampus}/buildings`)
  .then(async (res) => {
    const text = await res.text();
    console.log("BUILDINGS URL:", `${API_BASE_URL}/campus/${currentCampus}/buildings`);
    console.log("STATUS:", res.status);
    console.log("BODY first 120:", text.slice(0, 120));
    return JSON.parse(text);
  })
  .then(setBuildings)
  .catch((err) => console.error("Error fetching buildings:", err));

  }, [currentCampus, showLogin]);

  // Live location tracking
  useEffect(() => {
    let subscription;

    const startTracking = async () => {
      // If live tracking is off, stop watching
      if (!liveLocationEnabled) {
        if (watchRef.current) {
          watchRef.current.remove();
          watchRef.current = null;
        }
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
          const coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setUserLocation(coords);
        }
      );

      watchRef.current = subscription;
    };

    startTracking();

    return () => {
      subscription?.remove?.();
    };
  }, [liveLocationEnabled]);

  // Login first
  if (showLogin) {
    return <LoginScreen onSkip={() => setShowLogin(false)} />;
  }

  if (showOutdoorDirection) {
    return (
      <OutdoorDirection
        onPressBack={() => setShowOutdoorDirection(false)}
      />
    );
  }

  // Questionnaire gate
  if (!userType) {
    return <UserType onSelectType={(type) => setUserType(type)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} pointerEvents="none" />

      <MapView
        ref={mapRef}
        initialRegion={{
          ...campusCoords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        style={styles.map}
        onRegionChange={() => {
          if (liveLocationEnabled) setUserDraggedMap(true);
        }}
        onRegionChangeComplete={() => {
          if (liveLocationEnabled && userLocation && userDraggedMap) {
            snapBackToUser();
          }
        }}
      >
        <Marker coordinate={campusCoords} title={currentCampus} />

        {userLocation && liveLocationEnabled && (
          <Marker coordinate={userLocation} title="You" pinColor="blue" />
        )}

        {buildings.map((building) => (
          <Polygon
            key={building.id}
            coordinates={building.coordinates}
            fillColor={colors.buildingHighlightFill}
            strokeColor={colors.buildingHighlightStroke}
            strokeWidth={2}
          />
        ))}
      </MapView>

      <SideLeftBar
        currentCampus={currentCampus}
        onToggleCampus={() =>
          setCurrentCampus((prev) => (prev === "SGW" ? "Loyola" : "SGW"))
        }
        onToggleLiveLocation={() =>
          setLiveLocationEnabled((prev) => {
            if (prev) setUserLocation(null);
            return !prev;
          })
        }
      />

      <TopRightMenu onPressDirection={() => setShowOutdoorDirection(true)} />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#e5e5e5",
    zIndex: 0,
  },
  map: { width: "100%", height: "100%", zIndex: 1 },
  buttons: {
    position: "absolute",
    bottom: 40,
    width: "90%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#6b0f1a",
    zIndex: 10,
    elevation: 10,
    alignSelf: "center",
  },
});
