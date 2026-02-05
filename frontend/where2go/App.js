import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, PermissionsAndroid, Platform } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';

export default function App() {
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });
  const [userLocation, setUserLocation] = useState(null);

  const mapRef = useRef(null);

  // 🔁 Fetch campus coords from backend
  useEffect(() => {
    fetch(`http://10.0.2.2:3000/campus/${currentCampus}`) // NOT localhost
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
  }, [currentCampus]);

  // 📍 Live user location
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
    }

    const watchId = Geolocation.watchPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        console.log('USER LOCATION:', coords);
        setUserLocation(coords);
      },
      (err) => console.log('Location error:', err),
      { enableHighAccuracy: true, distanceFilter: 5 }
    );

    return () => Geolocation.clearWatch(watchId);
  }, []);

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
