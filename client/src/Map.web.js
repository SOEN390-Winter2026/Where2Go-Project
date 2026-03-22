import React, {
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { View, StyleSheet } from "react-native";

const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.google?.maps) return resolve(window.google.maps);

    if (!apiKey) return reject(new Error("Missing GOOGLE_MAPS_API_KEY"));

    const scriptId = "google-maps-js";
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      existing.addEventListener("error", () =>
        reject(new Error("Google Maps failed to load"))
      );
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.onload = () => resolve(window.google.maps);
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
}

function toLatLngPath(coords = []) {
  return coords
    .filter(
      (c) => typeof c?.latitude === "number" && typeof c?.longitude === "number"
    )
    .map((c) => ({ lat: c.latitude, lng: c.longitude }));
}
function centroid(path = []) {
  if (!path.length) return null;
  const { lat, lng } = path.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 }
  );
  return { lat: lat / path.length, lng: lng / path.length };
}

const CampusMapWeb = forwardRef((props, ref) => {
  const {
    campusCoords,
    buildings = [],
    onBuildingPress,
    liveLocationEnabled,
    userLocation,
    selectedPois,
    onPoiPress,
  } = props;

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);

  const polygonsRef = useRef([]);
  const labelMarkersRef = useRef([]);
  const markersRef = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapsApi, setMapsApi] = useState(null);

  useImperativeHandle(ref, () => ({
    animateToRegion: (region) => {
      if (!mapRef.current) return;
      const center = { lat: region.latitude, lng: region.longitude };
      mapRef.current.panTo(center);
      mapRef.current.setZoom(16);
    },
  }));

  const center = useMemo(() => {
    if (campusCoords?.latitude && campusCoords?.longitude) {
      return { lat: campusCoords.latitude, lng: campusCoords.longitude };
    }
    return { lat: 45.4974, lng: -73.5771 }; // default SGW
  }, [campusCoords]);

  // 1) Load Maps + init map
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const maps = await loadGoogleMaps(MAPS_KEY);
        if (cancelled) return;

        setMapsApi(maps);

        if (!mapDivRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapDivRef.current, {
            center,
            zoom: 16,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "greedy",
          });

          // Mark as ready once idle (map finished first render)
          maps.event.addListenerOnce(mapRef.current, "idle", () => {
            if (!cancelled) setMapReady(true);
          });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(16);
          setMapReady(true);
        }
      } catch (e) {
        console.error("Google Maps init error:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [center]);

  // 2) Draw building polygons (wait for mapReady!)
  useEffect(() => {
    if (!mapReady) return;
    if (!mapsApi) return;
    if (!mapRef.current) return;

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    labelMarkersRef.current.forEach((m) => m.setMap(null));
    labelMarkersRef.current = [];
    buildings.forEach((building) => {
      const path = toLatLngPath(building.coordinates);
      if (path.length < 3) return;

      const poly = new mapsApi.Polygon({
        paths: path,
        strokeColor: "#7C2B38",
        strokeOpacity: 0.95,
        strokeWeight: 2,
        fillColor: "#7C2B38",
        fillOpacity: 0.18,
        clickable: true,
        zIndex: 2,
      });

      poly.setMap(mapRef.current);

      poly.addListener("click", () => {
        if (typeof onBuildingPress === "function") onBuildingPress(building);
      });

      polygonsRef.current.push(poly);

      const c = centroid(path);
      if (c) {
        const labelMarker = new mapsApi.Marker({
          position: c,
          map: mapRef.current,
          clickable: false,
          label: {
            text: building.code || building.name || "",
            color: "#7C2B38",
            fontWeight: "700",
            fontSize: "12px",
          },
          icon: {
            path: mapsApi.SymbolPath.CIRCLE,
            scale: 0, // hide the pin, keep only the label
          },
          zIndex: 3,
        });

        labelMarkersRef.current.push(labelMarker);
}
    });

    // Cleanup polygons when buildings change/unmount
    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = [];
      labelMarkersRef.current.forEach((m) => m.setMap(null));
      labelMarkersRef.current = [];
    };
  }, [buildings, onBuildingPress, mapReady, mapsApi]);

  // 3) Markers (user + POIs)
  useEffect(() => {
    if (!mapReady) return;
    if (!mapsApi) return;
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // User marker
    if (liveLocationEnabled && userLocation?.latitude && userLocation?.longitude) {
      const userMarker = new mapsApi.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map: mapRef.current,
        title: "You",
      });
      markersRef.current.push(userMarker);
    }

    // POI markers
    if (Array.isArray(selectedPois)) {
      selectedPois.forEach((poi) => {
        const rawLat = poi?.geometry?.location?.lat ?? poi?.lat;
        const rawLng = poi?.geometry?.location?.lng ?? poi?.lng;

        const lat = typeof rawLat === "function" ? rawLat() : rawLat;
        const lng = typeof rawLng === "function" ? rawLng() : rawLng;

        if (typeof lat !== "number" || typeof lng !== "number") {
          console.log("Skipping POI (bad coords):", poi);
          return;
        }

        const marker = new mapsApi.Marker({
          position: { lat, lng },
          map: mapRef.current,
          title: poi?.name || "POI",
        });

        if (typeof onPoiPress === "function") {
          marker.addListener("click", () => onPoiPress(poi));
        }

        markersRef.current.push(marker);
      });
      if (selectedPois?.length > 0) {
        const bounds = new mapsApi.LatLngBounds();
        selectedPois.forEach((poi) => {
          const rawLat = poi?.geometry?.location?.lat ?? poi?.lat;
          const rawLng = poi?.geometry?.location?.lng ?? poi?.lng;
          const lat = typeof rawLat === "function" ? rawLat() : rawLat;
          const lng = typeof rawLng === "function" ? rawLng() : rawLng;
          if (typeof lat === "number" && typeof lng === "number") {
            bounds.extend({ lat, lng });
          }
        });

        if (!bounds.isEmpty?.() || selectedPois.length === 1) {
          mapRef.current.fitBounds(bounds, 60);
        }
      }
    }

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [liveLocationEnabled, userLocation, selectedPois, onPoiPress, mapReady, mapsApi]);

  return (
    <View style={styles.container}>
      <div ref={mapDivRef} style={styles.mapDiv} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e5e5e5" },
  mapDiv: {
    width: "100%",
    height: "100%",
  },
});

export default CampusMapWeb;