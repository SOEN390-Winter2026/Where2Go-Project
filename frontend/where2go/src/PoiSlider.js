import { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from "react-native";
import Slider from "@react-native-community/slider";
import { GOOGLE_MAPS_API_KEY } from "@env";
import PropTypes from 'prop-types';

const MIN_RADIUS = 100;
const MAX_RADIUS = 1000;

const POI_TYPES = [
  "restaurant", 
  "cafe",  
  "bar", 
  "pharmacy", 
  "gym"
];

function resolveOriginLabel(selectedBuilding, userLocation) {
  if (selectedBuilding) return `From: ${selectedBuilding.name ?? "Selected building"}`;
  if (userLocation) return "From: Your location";
  return "No location. Enable GPS or tap a building";
}

export default function PoiSlider({ onPoisChange, userLocation, selectedBuilding }) {

  const [displayRadius, setDisplayRadius] = useState(MIN_RADIUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

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
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const requests = POI_TYPES.map((type) => {
        const url =
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
          `?location=${lat},${lng}` +
          `&type=${type}` +
          `&radius=${radiusInMeters}` +
          `&key=${GOOGLE_MAPS_API_KEY}`;
        return fetch(url, { signal: controller.signal }).then((res) => res.json());
      });

      const responses = await Promise.all(requests);
      const seenIds = new Set();
      const merged = [];

      for (const data of responses) {
        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          throw new Error(`Places API: ${data.status}`);
        }
        for (const place of (data.results ?? []).slice(0, 5)) {
          if (!seenIds.has(place.place_id)) {
            seenIds.add(place.place_id);
            merged.push(place);
          }
        }
      }
      return merged.slice(0, 25);
    } catch (err) {
      if (err.name === "AbortError") return null;
      console.error("POI fetch failed:", err);
      setError("Could not load points of interest.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    const origin = resolveOrigin();
    if (!origin) {
      onPoisChange([]);
      return;
    }
    const results = await fetchNearbyPOIs(origin.latitude, origin.longitude, displayRadius);
    if (results !== null) {
      onPoisChange(results);
    }
  };

  const radiusM = Math.round(displayRadius);
  const originLabel = resolveOriginLabel(selectedBuilding, userLocation);
  const hasOrigin = !!resolveOrigin();

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
        onValueChange={(value) => setDisplayRadius(value)}
        minimumTrackTintColor="#ccc"
        maximumTrackTintColor="#000000"
        thumbTintColor="#912338"
      />

      <View style={styles.bottomRow}>
        <View style={[
          styles.originPill,
          selectedBuilding ? styles.originPillBuilding : styles.originPillLocation
        ]}>
          <Text style={styles.originText}>
            {error || originLabel}
          </Text>
        </View>

        <Pressable
          testID="loadButton"
          style={[styles.loadButton, !hasOrigin && styles.loadButtonDisabled]}
          onPress={handleLoad}
          disabled={!hasOrigin || loading}
        >
          <Text style={styles.loadButtonText}>
            {loading ? "..." : "Load"}
          </Text>
        </Pressable>
      </View>

    </View>
  );
}

PoiSlider.propTypes = {
  onPoisChange: PropTypes.func.isRequired,
  userLocation: PropTypes.shape({
    latitude: PropTypes.number.isRequired,
    longitude: PropTypes.number.isRequired,
  }),
  selectedBuilding: PropTypes.shape({
    name: PropTypes.string,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    coordinates: PropTypes.arrayOf(
      PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
      })
    ),
  }),
};

const CONTAINER_WIDTH = 340;

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
    width: CONTAINER_WIDTH, 
    alignItems: "center",
    alignSelf: "center",
  },
  radiusLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    width: "100%",
  },
  originPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#912338",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  originPillLocation: {
    backgroundColor: "white",
  },
  originPillBuilding: {
    backgroundColor: "white",
  },
  originText: {
    color: '#912338',
    textAlign: 'center',
    fontWeight: "600",
    fontSize: 13,
    flexWrap: "wrap",
  },
  loadButton: {
    backgroundColor: "#912338",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
  },
  loadButtonDisabled: {
    backgroundColor: "#ccc",
  },
  loadButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  }
});