import { StatusBar } from "expo-status-bar";
import { buildRouteFromResponse } from './src/services/routeServices';
import { resolveEventDestination } from './src/services/eventServices';
import { StyleSheet, View, Pressable } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import CampusMap from "./src/Map";
import SideLeftBar from "./src/SideLeftBar";
import TopRightMenu from "./src/TopRightMenu";
import PoiSlider from "./src/PoiSlider";
import LoginScreen from "./src/Login";
import BuildingInfoModal from "./src/BuildingInfoModal";
import PoiInfoModal from "./src/PoiInfoModal";
import OutdoorDirection from "./src/OutdoorDirection";
import CalendarPage from "./src/CalendarPage";
import LoadingPage from './src/LoadingPage';
import IndoorMaps from './src/IndoorMaps';
import { API_BASE_URL } from './src/config';
import { getDestinationFromBuildingCode } from './src/utils/eventDestinationResolver';

const CAMPUS_COORDS = {
  SGW: { latitude: 45.4974, longitude: -73.5771 },
  Loyola: { latitude: 45.4587, longitude: -73.6409 },
};

const colors = {
  buildingHighlightFill: "rgba(107,15,26,0.20)",
  buildingHighlightStroke: "rgba(107,15,26,0.85)",
  destinationHighlightFill: "rgba(30,136,229,0.25)",
};

export default function App() {
  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  const [currentCampus, setCurrentCampus] = useState("SGW");
  const [campusCoords, setCampusCoords] = useState(CAMPUS_COORDS.SGW);

  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [userDraggedMap, setUserDraggedMap] = useState(false);
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);
  
  //indoors stuff
  const [showIndoorMaps, setShowIndoorMaps] = useState(false);

  const [isPressedPOI, setIsPressedPOI] = useState(false);
  const [poiOriginBuilding, setPoiOriginBuilding] = useState(null);
  const [selectedPois, setSelectedPois] = useState([]);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [poiModalVisible, setPoiModalVisible] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false); // for loading check
  const [hasInitialized, setHasInitialized] = useState(false); // only load the first time

  //Live Loc
  const [isLiveLocVisible, setIsLiveLocVisible] = useState(true);

  const watchRef = useRef(null);
  const mapRef = useRef(null);

  //for selecting buildings as departure or destination on map
  const [departureBuilding, setDepartureBuilding] = useState(null);
  const [destinationBuilding, setDestinationBuilding] = useState(null);
  const [destinationPoi, setDestinationPoi] = useState(null);

  const [activeRouteCoords, setActiveRouteCoords] = useState([]);
  const [activeRouteMeta, setActiveRouteMeta] = useState(null);
  const [activeSegments, setActiveSegments] = useState([]);
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [directionOrigin, setDirectionOrigin] = useState(null);
  const [directionDestination, setDirectionDestination] = useState(null);

  const handlePoisChange = (poisFromSlider) => {
    setSelectedPois(poisFromSlider);
  };

  const getBuildingRole = (building) => {
    if (building?.id === departureBuilding?.id) return "departure";
    if (building?.id === destinationBuilding?.id) return "destination";
    return null;
  };

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
      const lastSeg = activeSegments.at(-1);
      return lastSeg?.coords?.[lastSeg.coords.length - 1] ?? null;
    }
    return activeRouteCoords?.at(-1) ?? null;
  })();

  const handleSelectRoute = ({ route, origin, destination }) => {
  const { coords, segments } = buildRouteFromResponse({ route });
  setActiveRouteCoords(coords);
  setActiveRouteMeta({ route, origin, destination });
  setActiveSegments(segments);
  setIsRouteActive(true);
  setShowOutdoorDirection(false);
  requestAnimationFrame(() => fitRoute(coords));
};

  const handleCancelRoute = () => {
    setActiveRouteCoords([]);
    setActiveSegments([]);
    setActiveRouteMeta(null);
    setIsRouteActive(false);
  };

  const handleGenerateDirectionsFromEvent = ({ buildingCode, room, event }) => {
  const result = resolveEventDestination({ buildingCode, buildings, userLocation });
  if (!result) {
    console.log("Cannot generate directions for event.", event?.location);
    return;
  }
  const { dest, targetBuilding, origin } = result;
  setDirectionDestination(dest);
  setDirectionOrigin(origin);
  setDepartureBuilding(null);
  setDestinationBuilding(targetBuilding);
  setDestinationPoi(null);
  setShowCalendar(false);
  setShowOutdoorDirection(true);
};

  const handleBuildingPress = (building) => {
    if (isPressedPOI) {
      setPoiOriginBuilding(building);
      setSelectedPois([]);
    } else {
      setSelectedBuilding(building);
      setModalVisible(true);
    }
  };

  useEffect(() => {
    const nextCoords = CAMPUS_COORDS[currentCampus];
    setCampusCoords(nextCoords);

    if (showLogin) return;

    setDataLoaded(false);

    mapRef.current?.animateToRegion(
      { ...nextCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      500
    );

    const url = `${API_BASE_URL}/campus/${currentCampus}/buildings`;

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
      if (status !== "granted") return;

      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 5 },
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

  useEffect(() => {
    if (!hasInitialized && dataLoaded) {
      setHasInitialized(true);
    }
  }, [dataLoaded, hasInitialized]);

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

  if (!hasInitialized) {
    return <LoadingPage />;
  }

  if (showIndoorMaps) {
    return (
      <IndoorMaps
        building={selectedBuilding}
        onPressBack={() => setShowIndoorMaps(false)}
        campus={currentCampus}
      />
    );
  }

  if (showOutdoorDirection) {
    return (
      <OutdoorDirection
        onPressBack={() => {
          setShowOutdoorDirection(false);
          setDirectionOrigin(null);
          setDirectionDestination(null);
        }}
        buildings={buildings}
        origin={directionOrigin}
        destination={directionDestination ?? destinationPoi}
        initialFrom={departureBuilding ? departureBuilding.name : ""}
        initialTo={destinationBuilding ? destinationBuilding.name : ""}
        onSelectRoute={handleSelectRoute}
      />
    );
  }

  if (showCalendar) {
    return (
      <CalendarPage
        onPressBack={() => setShowCalendar(false)}
        onGenerateDirections={handleGenerateDirectionsFromEvent}
      />
    );
  }

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
        onLiveLocDisappear={() => setIsLiveLocVisible(false)}
        onLiveLocAppear={() => setIsLiveLocVisible(true)}
      />
      {liveLocationEnabled && !isLiveLocVisible && userLocation && (
        <Pressable
          style={styles.recenterButton}
          onPress={() => {
            mapRef.current?.animateToRegion(
              {
                ...userLocation,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              },
              400
            );
            setUserDraggedMap(false);
          }}
        >
          <Ionicons name="compass" size={30} color="#912338" />
        </Pressable>
      )}

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
          setIsPressedPOI( prev => {
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
        selectedRole={ getBuildingRole(selectedBuilding) }
        onGoInside={() => {
          setModalVisible(false);
          setShowIndoorMaps(true);
        }}
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

      {isRouteActive && (
        <Pressable style={styles.cancelButton} onPress={handleCancelRoute}>
          <Ionicons name="close" size={22} color="white" />
        </Pressable>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { ...StyleSheet.absoluteFillObject },
  mapPlaceholder: { ...StyleSheet.absoluteFillObject },
  cancelButton: {
    position: "absolute",
    top: '12%',
    right: '3%',
    backgroundColor: "#912338",
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recenterButton: {
    position: "absolute",
    top: '33%',
    left: '6%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,   
    zIndex: 12,    
    borderColor: "#912338",
    borderWidth: 1.5,
  }
});