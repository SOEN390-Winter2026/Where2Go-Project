import { useState, useEffect } from "react";
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

export default function PoiSlider(){

    const [pois, setPois] = useState([]);
    const types = [
  "restaurant",
  "park",
  "museum",
  "tourist_attraction",
  "cafe",
  "store"
];

const fetchNearbyPOIs = async (lat, lng, radiusInMeters) => {
  const url =
  `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
  `?location=${lat},${lng}` +
  `&radius=${radiusInMeters}` +
  `&type=${types}` +
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
    const results = await fetchNearbyPOIs(
      45.49401341829886,
      -73.57851255083219,
      3000
    );

    setPois(results || []);
  };

  loadPOIs();
}, []);

useEffect(() =>{

    pois.forEach((poi) => {
  console.log(poi.name);
});

},[pois])


    const [sliderValueRadius, setSliderValueRadius] = useState(0);

    return(

        <>
        
        <View style={styles.poiSliderView}>
            <Text> Radius Range: {sliderValueRadius}</Text>
            <Slider
        style={{ width: 300, height: 40 }}
        minimumValue={1}
        maximumValue={1000}
        minimumTrackTintColor="#ccc"
        maximumTrackTintColor="#000000"
        onValueChange={(value) => setSliderValueRadius(value)}
        value={sliderValueRadius}
        thumbTintColor="#912338"
        step={1}
      />
      <Pressable>
        <Text style={styles.enterText}>
            Enter
        </Text>
      </Pressable>

        </View>
        
        </>
    )

}

const styles = StyleSheet.create({

    poiSliderView:{
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

    enterText:{
        backgroundColor: "#912338",
        color: "white",
        borderWidth: 1,
        padding: 10,
        margin: 2,
        borderRadius: 20,
    },
});