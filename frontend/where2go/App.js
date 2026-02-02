import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';


export default function App() {
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
  }, [currentCampus]);
  return (
    <View style={styles.container}>
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
      <View style={styles.buttons}>
        <Button title="SGW" color="#ffffff" onPress={() => setCurrentCampus('SGW')} />
        <Button title="Loyola" color="#ffffff" onPress={() => setCurrentCampus('Loyola')} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
