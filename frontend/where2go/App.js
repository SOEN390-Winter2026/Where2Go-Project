import { StatusBar } from "expo-status-bar";
import polyline from "@mapbox/polyline";
import { StyleSheet, View, Platform } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import MapView, { Marker, Polygon, Polyline } from "react-native-maps";

import CampusMap from "./src/Map";
import SideLeftBar from "./src/SideLeftBar";
import TopRightMenu from "./src/TopRightMenu";
import PoiSlider from "./src/PoiSlider";
import LoginScreen from "./src/Login";
import BuildingInfoModal from "./src/BuildingInfoModal";
import PoiInfoModal from "./src/PoiInfoModal";
import OutdoorDirection from "./src/OutdoorDirection";
import CalendarPage from "./src/CalendarPage";
import LoadingPage from "./src/LoadingPage";

import { API_BASE_URL } from "./src/config";

const CAMPUS_COORDS = {
  SGW: { latitude: 45.4974, longitude: -73.5771 },
  Loyola: { latitude: 45.4587, longitude: -73.6409 },
};

// Simple fallback colors so your polygons don’t crash
const colors = {
  buildingHighlightFill: "rgba(107,15,26,0.20)",
  buildingHighlightStroke: "rgba(107,15,26,0.85)",
  destinationHighlightFill: "rgba(30,136,229,0.25)",
};

export default function App() {
  console.log("API_BASE_URL:", API_BASE_URL);

  // Screens
  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  // Campus
  const [currentCampus, setCurrentCampus] = useState("SGW");
  const [campusCoords, setCampusCoords] = useState(CAMPUS_COORDS.SGW);

  // Buildings + Modals
  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Location
  const [userLocation, setUserLocation] = useState(null);
  const [userDraggedMap, setUserDraggedMap] = useState(false);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  // POIs
  const [isPressedPOI, setIsPressedPOI] = useState(false);
  const [poiOriginBuilding, setPoiOriginBuilding] = useState(null);
  const [selectedPois, setSelectedPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [poiModalVisible, setPoiModalVisible] = useState(false);

  // Loading logic
  const [dataLoaded, setDataLoaded] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Directions selections
  const [departureBuilding, setDepartureBuilding] = useState(null);
  const [destinationBuilding, setDestinationBuilding] = useState(null);
  const [destinationPoi, setDestinationPoi] = useState(null);

  // Route rendering
  const [activeRouteCoords, setActiveRouteCoords] = useState([]);
  const [activeRouteMeta, setActiveRouteMeta] = useState(null);
  const [activeSegments, setActiveSegments] = useState([]);

  const getBuildingRole = (building) => {
    if (building?.id === departureBuilding?.id) return "departure";
    if (building?.id === destinationBuilding?.id) return "destination";
    return null;
  };

  // ----- Route helpers -----
  function decodePolylineToCoords(encoded) {
    if (!encoded) return [];
    const pts = polyline.decode(encoded);
    return pts.map(([latitude, longitude]) => ({ latitude, longitude }));
  }

  function fitRoute(coords) {
    if (!mapRef.current || !coords?.length) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 120, right: 80, bottom: 200, left: 80 },
      animated: true,
    });
  }

  const routeStart =
    activeSegments?.[0]?.coords?.[0] ?? activeRouteCoords?.[0] ?? null;

  const routeEnd = (() => {
    if (activeSegments?.length) {
      const lastSeg = activeSegments[activeSegments.length - 1];
      return lastSeg?.coords?.[lastSeg.coords.length - 1] ?? null;
    }
    return activeRouteCoords?.[activeRouteCoords.length - 1] ?? null;
  })();

  const handleSelectRoute = ({ route, origin, destination }) => {
    console.log("handleSelectRoute called");
    console.log("polyline length:", route?.polyline?.length);
    const coords = decodePolylineToCoords(route?.polyline);
    console.log("decoded coords length:", coords.length);   
    console.log((route.steps || []).map(s => ({
    type: s.type,
    vehicle: s.vehicle,
    line: s.line,
  }))
);    

    setActiveRouteCoords(coords);
    setActiveRouteMeta({ route, origin, destination });

    const steps = Array.isArray(route?.steps) ? route.steps : [];
    const segments = steps
      .map((s) => {
        const c = decodePolylineToCoords(s?.polyline);
        if (!c.length) return null;
        return {
          coords: c,
          isWalk: s?.type === "walk",
          vehicle: s?.vehicle,
        };
      })
      .filter(Boolean);

    setActiveSegments(segments);

    setShowOutdoorDirection(false);

    requestAnimationFrame(() => fitRoute(coords));
  };

  // ----- Snap back -----
  const snapBackToUser = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.animateToRegion(
      {
        ...userLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
    setUserDraggedMap(false);
  };

  // ----- Building press -----
  const handleBuildingPress = (building) => {
    if (isPressedPOI) {
      setPoiOriginBuilding(building);
      setSelectedPois([]);
    }else{
    setSelectedBuilding(building);
    setModalVisible(true);
    }
  };

  // ----- Fetch buildings when campus changes (and user is logged in) -----
  useEffect(() => {
    const nextCoords = CAMPUS_COORDS[currentCampus];
    setCampusCoords(nextCoords);

    // Don’t fetch until login is dismissed
    if (showLogin) return;

    setDataLoaded(false);

    mapRef.current?.animateToRegion(
      {
        ...nextCoords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );

    const url = `${API_BASE_URL}/campus/${currentCampus}/buildings`;
    console.log("Fetching buildings:", url);

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setBuildings(Array.isArray(data) ? data : []);
        setDataLoaded(true);
      })
      .catch((err) => {
        console.error("Error fetching buildings:", err);
        setBuildings([]);
        setDataLoaded(true);
      });
  }, [currentCampus, showLogin]);

  // ----- Live location tracking -----
  useEffect(() => {
    if (!liveLocationEnabled) {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      return;
    }

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
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
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      );

      watchRef.current = sub;
    };

    startTracking();
  }, [liveLocationEnabled]);

  // ----- Initialize once after first data load -----
  useEffect(() => {
    if (!hasInitialized && dataLoaded) {
      setHasInitialized(true);
    }
  }, [dataLoaded, hasInitialized]);

  const handlePoisChange = (poisFromSlider) => {
    setSelectedPois(poisFromSlider);
  };

  // ------------------ SCREENS ------------------

  // 1) Login first
  if (showLogin) {
    return (
      <LoginScreen
        onSkip={() => {
          setShowLogin(false);
          setHasInitialized(false);
          setDataLoaded(false);
        }}
      />
    );
  }

  // 2) Loading
  if (!hasInitialized) {
    return <LoadingPage />;
  }

  // 3) Outdoor direction screen
  if (showOutdoorDirection) {
    return (
      <OutdoorDirection
        onPressBack={() => setShowOutdoorDirection(false)}
        buildings={buildings}
        initialFrom={departureBuilding ? departureBuilding.name : ""}
        initialTo={destinationBuilding ? destinationBuilding.name : ""}
        destination={destinationPoi}
        onSelectRoute={handleSelectRoute}
      />
    );
  }

  // 4) Calendar screen
  if (showCalendar) {
    return <CalendarPage onPressBack={() => setShowCalendar(false)} />;
  }

  // 5) Main Map screen
  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} pointerEvents="none" />

      <CampusMap
        ref={mapRef}
        campusCoords={campusCoords}
        buildings={buildings}
        onBuildingPress={handleBuildingPress}
        liveLocationEnabled={liveLocationEnabled}
        userLocation={userLocation}
        userDraggedMap={userDraggedMap}
        setUserDraggedMap={setUserDraggedMap}
        selectedPois={selectedPois}
        onPoiPress={(poi) => {
          setSelectedPoi(poi);
          setPoiModalVisible(true);
        }}
          activeSegments={activeSegments}
          activeRouteCoords={activeRouteCoords}
         routeStart={routeStart}
         routeEnd={routeEnd}
      />

      <SideLeftBar
        currentCampus={currentCampus}
        isPressedPOI={isPressedPOI}
        onToggleCampus={() =>
          setCurrentCampus((prev) => (prev === "SGW" ? "Loyola" : "SGW"))
        }
        onToggleLiveLocation={() =>
          setLiveLocationEnabled((prev) => {
            if (prev) setUserLocation(null);
            return !prev;
          })
        }
        onPressPOI={() => {
          setIsPressedPOI((prev) => {
            if (prev) {
              setPoiOriginBuilding(null);
              setSelectedPois([]);
            }
            return !prev;
          });
        }}
      />

      <TopRightMenu
        onPressDirection={() => setShowOutdoorDirection(true)}
        onPressCalendar={() => setShowCalendar(true)}
      />

      <BuildingInfoModal
        building={selectedBuilding}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSetDeparture={(b) => setDepartureBuilding(b)}
        onSetDestination={(b) => {
          setDestinationBuilding(b);
          setDestinationPoi(null);
        }}
        selectedRole={getBuildingRole(selectedBuilding)}
      />

      <PoiInfoModal
        poi={selectedPoi}
        visible={poiModalVisible}
        onClose={() => setPoiModalVisible(false)}
        onSetAsDestination={() => {
          setDestinationPoi({
            label: selectedPoi?.name,
            lat: selectedPoi?.geometry?.location?.lat,
            lng: selectedPoi?.geometry?.location?.lng,
          });
          setDestinationBuilding(null);
          setPoiModalVisible(false);
          setShowOutdoorDirection(true);
        }}
      />

      {isPressedPOI && (
        <PoiSlider
          onPoisChange={handlePoisChange}
          userLocation={userLocation}
          selectedBuilding={poiOriginBuilding}
        />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { ...StyleSheet.absoluteFillObject },
});