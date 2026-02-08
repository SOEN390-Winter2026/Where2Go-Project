import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PermissionsAndroid, Platform,Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon } from 'react-native-maps';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import LoginScreen from "./src/Login";
import { colors } from './src/theme/colors';
import { API_BASE_URL } from './src/config';

export default function App() {
  
  const [showLogin, setShowLogin] = useState(true);
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });
  const [buildings, setBuildings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  // whenever currentCampus changes, get coordinates and building polygons from the backend
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
      .catch((err) => console.error('Error fetching campus coordinates:', err));

    fetch(`${API_BASE_URL}/campus/${currentCampus}/buildings`)
      .then((res) => res.json())
      .then(setBuildings)
      .catch((err) => console.error('Error fetching buildings:', err));
  }, [currentCampus,showLogin]);


 useEffect(() => {
  (async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission denied');
      return;
    }

    await Location.watchPositionAsync(
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
        console.log('USER LOCATION:', coords);
        setUserLocation(coords);
      }
    );
  })();
}, []);


  //Login page first
  if (showLogin){
    return <LoginScreen onSkip={() => setShowLogin(false)}/>;
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
        showsUserLocation={true}
        followsUserLocation={true}
      >
        {/* Campus marker */}
        <Marker coordinate={campusCoords} title={currentCampus} />

        {/* User marker */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
          />
        )}
        {/* this section renders the campus highlighted shapes */}
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
          setCurrentCampus((prev) => (prev === 'SGW' ? 'Loyola' : 'SGW'))
        }
        />
      <TopRightMenu />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e5e5e5',
    zIndex: 0,
  },
  map: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  buttons: {
    position: 'absolute',
    bottom: 40,
    width: '90%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6b0f1a',
    zIndex: 10,
    elevation: 10,
    alignSelf: 'center',
  },
});