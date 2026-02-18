import { useState, useEffect } from "react";
import * as Location from "expo-location";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import Slider from '@react-native-community/slider';
import { GOOGLE_MAPS_API_KEY } from '@env';

export default function PoiSlider({ onPoisChange }) {

  const [userLocation, setUserLocation] = useState([])
  const [pois, setPois] = useState([]);
  const types = [
    "restaurant",
    "cafe",
    "store"
  ];

  const fetchCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Permission denied");
      return;
    }

    const sub = await Location.watchPositionAsync(
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
        console.log("USER LOCATION:", coords);
        setUserLocation(coords);
      }
    );
  };

  const fetchNearbyPOIs = async (lat, lng, radiusInMeters) => {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&type=${types}` +
      `&radius=${radiusInMeters}` +
      `&key=${GOOGLE_MAPS_API_KEY}`;
    try {
      const response = await fetch(url);

      // Manual check for HTTP errors (e.g., 400, 500)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json(); // Manual JSON parsing
      return data.results;
    } catch (error) {
      console.error("Fetch failed:", error);
    }
  };

  useEffect(() => {
    const loadPOIs = async () => {
      const results = await fetchNearbyPOIs(userLocation.latitude, userLocation.longitude, sliderValueRadius);

      setPois(results || []);
    };

    loadPOIs();
  }, [userLocation]);

  useEffect(() => {
    onPoisChange(pois);
  }, [pois])


  const [sliderValueRadius, setSliderValueRadius] = useState(0);

  return (

    <>

      <View style={styles.poiSliderView}>
        <Text> Radius Range: {sliderValueRadius}</Text>
        <Slider
          style={{ width: 300, height: 40 }}
          minimumValue={1}
          maximumValue={10000}
          minimumTrackTintColor="#ccc"
          maximumTrackTintColor="#000000"
          onValueChange={(value) => setSliderValueRadius(value)}
          value={sliderValueRadius}
          thumbTintColor="#912338"
          step={1}
        />
        <Pressable
          onPress={() => { fetchCurrentLocation(); console.log("beingpressed"); }}>
          <Text style={styles.enterText}>
            Enter
          </Text>
        </Pressable>

      </View>

    </>
  )

}

const styles = StyleSheet.create({

  poiSliderView: {
    position: "absolute",
    zIndex: 20,
    bottom: "2%",
    backgroundColor: "white",
    borderColor: "#912338",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    margin: 20,
    alignItems: "center",
    alignSelf: "center", // Aligns slider in the middle of the screen

  },

  enterText: {
    backgroundColor: "#912338",
    color: "white",
    borderWidth: 1,
    padding: 10,
    margin: 2,
    borderRadius: 20,
  },
});