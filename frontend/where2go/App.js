import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, PermissionsAndroid, Platform,Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

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

  useEffect(() => {
    fetch(`http://10.0.2.2:3000/campus/${currentCampus}`) 
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
      <SideLeftBar />
      <TopRightMenu />
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
