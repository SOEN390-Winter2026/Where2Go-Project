import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";

const MIN_RADIUS = 100;
const MAX_RADIUS = 1000;

const POI_TYPES = ["restaurant", "cafe", "bar", "pharmacy", "gym"];

function resolveOriginLabel(selectedBuilding, userLocation) {
  if (selectedBuilding) return `From: ${selectedBuilding.name ?? "Selected building"}`;
  if (userLocation) return "From: Your location";
  return "No location. Enable GPS or tap a building";
}

export default function PoiSlider({ onPoisChange, userLocation, selectedBuilding }) {
  const [displayRadius, setDisplayRadius] = useState(MIN_RADIUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const resolveOrigin = () => {
    if (selectedBuilding?.coordinates?.length > 0) {
      const lat =
        selectedBuilding.coordinates.reduce((s, c) => s + c.latitude, 0) /
        selectedBuilding.coordinates.length;
      const lng =
        selectedBuilding.coordinates.reduce((s, c) => s + c.longitude, 0) /
        selectedBuilding.coordinates.length;
      return { lat, lng };
    }

    if (userLocation?.latitude && userLocation?.longitude) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }

    return null;
  };

  const handleLoad = async () => {
    const origin = resolveOrigin();
    if (!origin || !window.google?.maps) return;

    setLoading(true);
    setError(null);

    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );

      const requests = POI_TYPES.map(
        (type) =>
          new Promise((resolve) => {
            service.nearbySearch(
              {
                location: origin,
                radius: displayRadius,
                type,
              },
              (results, status) => {
                if (
                  status === window.google.maps.places.PlacesServiceStatus.OK
                ) {
                  resolve(results.slice(0, 5));
                } else {
                  resolve([]);
                }
              }
            );
          })
      );

      const responses = await Promise.all(requests);
      const merged = responses.flat().slice(0, 25);

      onPoisChange(merged);
    } catch (e) {
      console.error(e);
      setError("Could not load points of interest.");
      onPoisChange([]);
    } finally {
      setLoading(false);
    }
  };

  const hasOrigin = !!resolveOrigin();
  const originLabel = resolveOriginLabel(selectedBuilding, userLocation);

  return (
    <View style={styles.poiSliderView}>
      <Text style={styles.radiusLabel}>
        Radius Range: {Math.round(displayRadius)} m
      </Text>

      <Slider
        style={{ width: 300, height: 40 }}
        minimumValue={MIN_RADIUS}
        maximumValue={MAX_RADIUS}
        step={100}
        value={displayRadius}
        onValueChange={setDisplayRadius}
        minimumTrackTintColor="#ccc"
        maximumTrackTintColor="#000000"
        thumbTintColor="#912338"
      />

      <View style={styles.bottomRow}>
        <View
          style={[
            styles.originPill,
            selectedBuilding ? styles.originPillBuilding : styles.originPillLocation,
          ]}
        >
          <Text style={styles.originText}>
            {error || originLabel}
          </Text>
        </View>

        <Pressable
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
    backgroundColor: "white",
  },
  originPillLocation: {
    backgroundColor: "white",
  },
  originPillBuilding: {
    backgroundColor: "white",
  },
  originText: {
    color: "#912338",
    textAlign: "center",
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
  },
});