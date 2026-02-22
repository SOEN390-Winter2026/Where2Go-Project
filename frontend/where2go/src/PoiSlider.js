import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import Slider from "@react-native-community/slider";
import { GOOGLE_MAPS_API_KEY } from "@env";

const MIN_RADIUS = 10;
const MAX_RADIUS = 1000;

const POI_TYPES = [
  "restaurant", 
  "cafe", 
  "store", 
  "bar", 
  "pharmacy", 
  "gym"
];

export default function PoiSlider({ onPoisChange, userLocation, selectedBuilding }) {
  const [sliderRadius, setSliderRadius] = useState(MIN_RADIUS);
  const [displayRadius, setDisplayRadius] = useState(MIN_RADIUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceTimer = useRef(null);

  const resolveOrigin = () => {
    if (selectedBuilding) {
      const coords = selectedBuilding.coordinates;
      if (coords?.length > 0) {
        const lat = coords.reduce((sum, c) => sum + c.latitude,  0) / coords.length;
        const lng = coords.reduce((sum, c) => sum + c.longitude, 0) / coords.length;
        return { latitude: lat, longitude: lng };
      }
      if (selectedBuilding.latitude && selectedBuilding.longitude) {
        return { latitude: selectedBuilding.latitude, longitude: selectedBuilding.longitude };
      }
    }
    if (userLocation?.latitude && userLocation?.longitude) return userLocation;
    return null;
  };

  const fetchNearbyPOIs = async (lat, lng, radiusInMeters) => {
    const typeParam = POI_TYPES.join("|");
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&type=${typeParam}` +
      `&radius=${radiusInMeters}` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Places API: ${data.status}`);
      }
      return data.results || [];
    } catch (errpr) {
      console.error("POI fetch failed:", error);
      setError("Could not load points of interest.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const origin = resolveOrigin();
    if (!origin) {
      onPoisChange([]);
      return;
    }
    const load = async () => {
      const results = await fetchNearbyPOIs(origin.latitude, origin.longitude, sliderRadius);
      onPoisChange(results);
    };
    load();
  }, [sliderRadius, userLocation, selectedBuilding]);

  const handleSliderChange = (value) => {
    setDisplayRadius(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setSliderRadius(value), 400);
  };

  const radiusM = Math.round(displayRadius);

  const originLabel = selectedBuilding
    ? `From: ${selectedBuilding.name ?? "Selected building"}`
    : userLocation
      ? "From: Your location"
      : "No location — enable GPS or tap a building";

  return (
    <View style={styles.poiSliderView}>

      <Text style={styles.radiusLabel}>
        Radius Range: {radiusM} m
      </Text>

      <Slider
        style={{ width: 300, height: 40 }}
        minimumValue={MIN_RADIUS}
        maximumValue={MAX_RADIUS}
        step={100}
        value={displayRadius}
        onValueChange={handleSliderChange}
        minimumTrackTintColor="#ccc"
        maximumTrackTintColor="#000000"
        thumbTintColor="#912338"
      />

      <View style={[
        styles.originPill,
        selectedBuilding ? styles.originPillBuilding : styles.originPillLocation
      ]}>
        <Text style={[
          styles.originText,
          selectedBuilding && styles.originTextBuilding
        ]}>
          {loading ? "Loading…" : error ? error : originLabel}
        </Text>
      </View>

      {!selectedBuilding && !userLocation && (
        <Text style={styles.hint}>Enable GPS or tap a building on the map</Text>
      )}
      {!selectedBuilding && userLocation && (
        <Text style={styles.hint}>Tap a building to search from its location</Text>
      )}
    </View>
  );
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
    alignSelf: "center",
  },
  radiusLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  originPill: {
    borderWidth: 1,
    borderColor: "#912338",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    borderRadius: 20,
  },
  originPillLocation: {
    backgroundColor: "white",
  },
  originPillBuilding: {
    backgroundColor: "#912338",
  },
  originText: {
    color: "#912338",
    fontWeight: "600",
    fontSize: 13,
  },
  originTextBuilding: {
    color: "white",
  },
  hint: {
    fontSize: 11,
    color: "#aaa",
    marginTop: 6,
    fontStyle: "italic",
  },
});