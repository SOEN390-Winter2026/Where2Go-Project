import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import LoginScreen from "./src/Login";

export default function App() {
  
  const [showLogin, setShowLogin] = useState(true);
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });
  const mapRef = useRef(null);

  // whenever currentCampus changes, this will get the new coordinates from the backend
  useEffect(() => {
    fetch(`http://localhost:3000/campus/${currentCampus}`)
      .then((res) => res.json())
      .then((data) => {
        const nextCoords = { latitude: data.lat, longitude: data.lng };
        setCampusCoords(nextCoords);
        // Center the native map on the new coords
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
  }, [currentCampus, showLogin]);

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
      >
        <Marker coordinate={campusCoords} />
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
});