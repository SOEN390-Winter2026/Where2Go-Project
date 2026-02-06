import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Polygon } from 'react-native-maps';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';

export default function App() {
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });
  const [buildings, setBuildings] = useState([]);
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

    // Fetch buildings for the current campus
    fetch(`http://localhost:3000/campus/${currentCampus}/buildings`)
      .then((res) => res.json())
      .then((data) => {
        console.log(`Fetched ${data.length} buildings for ${currentCampus}:`, data);
        setBuildings(data);
      })
      .catch((err) => console.error('Error fetching buildings:', err));
  }, [currentCampus]);

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
        
        {/* Render building polygons to highlight them */}
        {buildings.length > 0 && console.log('Rendering polygons for', buildings.length, 'buildings')}
        {buildings.map((building) => {
          if (!building.coordinates || building.coordinates.length === 0) {
            console.warn(`Building ${building.id} has no coordinates`);
            return null;
          }
          const polygonCoords = building.coordinates.map((coord) => ({
            latitude: coord.lat,
            longitude: coord.lng,
          }));
          console.log(`Rendering polygon for ${building.id} with ${polygonCoords.length} points`);
          return (
            <Polygon
              key={building.id}
              coordinates={polygonCoords}
              fillColor="rgba(135, 206, 250, 0.3)"
              strokeColor="rgba(30, 144, 255, 0.8)"
              strokeWidth={2}
            />
          );
        })}
        
        {/* Render building markers at the center of each building */}
        {buildings.map((building) => {
          const center = building.coordinates.reduce(
            (acc, coord) => ({
              latitude: acc.latitude + coord.lat,
              longitude: acc.longitude + coord.lng,
            }),
            { latitude: 0, longitude: 0 }
          );
          center.latitude /= building.coordinates.length;
          center.longitude /= building.coordinates.length;
          
          return (
            <Marker
              key={`marker-${building.id}`}
              coordinate={center}
              title={building.name}
              description={`Building ${building.id}`}
            />
          );
        })}
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