import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import {APIProvider, Map, Marker} from '@vis.gl/react-google-maps';
import { GOOGLE_MAPS_API_KEY } from '@env';

export default function App() {
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({ lat: 45.4974, lng: -73.5771 });
  const mapRef = useRef(null);
  // whenever currentCampus changes, this will get the new coordinates from the backend
    useEffect(() => {
      fetch(`http://localhost:3000/campus/${currentCampus}`)
        .then((res) => res.json())
        .then((data) => {
          setCampusCoords(data);
  // This will center the map on the new coords
          mapRef.current?.setCenter(data);
        })
        .catch((err) => console.error('Error fetching campus coordinates:', err));
    }, [currentCampus]);
  return (
  <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onLoad={() => console.log('Maps API has loaded.')}>
    <View style={styles.container}>
      <Map
        ref={mapRef}
        defaultZoom={13}
        defaultCenter={campusCoords} // Location that gets first loaded
        style={{ width: '100%', height: '100%' }}
        onCameraChanged={(ev) =>
          console.log(
            'camera changed:',
            ev.detail.center,
            'zoom:',
            ev.detail.zoom
          )
        }
      >
        <Marker position={campusCoords} />
        </Map>
         <View style={styles.buttons}>
                  <Button title="SGW" onPress={() => setCurrentCampus('SGW')} />
                  <Button title="Loyola" onPress={() => setCurrentCampus('Loyola')} />
                </View>
      <StatusBar style="auto" />
    </View>
       </APIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
