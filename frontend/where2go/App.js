import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

import CampusMap from './src/Map';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import PoiSlider from "./src/PoiSlider";
import LoginScreen from "./src/Login";
import BuildingInfoModal from './src/BuildingInfoModal';
import PoiInfoModal from './src/PoiInfoModal';
import OutdoorDirection from "./src/OutdoorDirection";
import CalendarPage from "./src/CalendarPage";
import LoadingPage from './src/LoadingPage';
import { API_BASE_URL } from './src/config';

const CAMPUS_COORDS = {
  SGW: { latitude: 45.4974, longitude: -73.5771 },
  Loyola: { latitude: 45.4587, longitude: -73.6409 },
};

export default function App() {
  console.log(API_BASE_URL);

  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState(CAMPUS_COORDS.SGW);

  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userDraggedMap, setUserDraggedMap] = useState(false); //to snap back to user when dragged away
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);

  // POI state
  const [isPressedPOI, setIsPressedPOI] = useState(false);
  const [poiOriginBuilding, setPoiOriginBuilding] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [poiModalVisible, setPoiModalVisible] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false); // for loading check
  const [hasInitialized, setHasInitialized] = useState(false); // only load the first time
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  //for selecting buildings as departure or destination on map
  const [departureBuilding, setDepartureBuilding] = useState(null);
  const [destinationBuilding, setDestinationBuilding] = useState(null);
  const [destinationPoi, setDestinationPoi] = useState(null);
  const getBuildingRole = (building) => {
    if (building?.id === departureBuilding?.id) return 'departure';
    if (building?.id === destinationBuilding?.id) return 'destination';
    return null;
  };

  const handleBuildingPress = (building) => {
    if(isPressedPOI){
      setPoiOriginBuilding(building);
    }else{
    setSelectedBuilding(building);
    setModalVisible(true);
    }
  };

  // whenever currentCampus changes, update coordinates locally and fetch building polygons from the backend
  // Also set that map loaded

  useEffect(() => {
    const nextCoords = CAMPUS_COORDS[currentCampus];
    setCampusCoords(nextCoords);
    setDataLoaded(true);
    mapRef.current?.animateToRegion(
      {
        ...nextCoords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );

    console.log('Fetching buildings from:', `${API_BASE_URL}/campus/${currentCampus}/buildings`);
    fetch(`${API_BASE_URL}/campus/${currentCampus}/buildings`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Buildings received:', data.length);
        setBuildings(data);
      })
      .catch((err) => console.error('Error fetching buildings:', err));
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
      watchRef.current = sub;
    };

    startTracking();
  }, [liveLocationEnabled]);

  // to change the loading to done/wont long load again
  useEffect(() => {
    if (!hasInitialized && dataLoaded) {
      setHasInitialized(true);

      // >> un/comment below area if test
      // const timer = setTimeout(() => {
      //   setHasInitialized(true);
      // }, 3000); // 3 sec delay for testing

      // return () => clearTimeout(timer);
      // >> comment end
    }
  }, [dataLoaded, hasInitialized]);

  //handle POI Change
  const [selectedPois, setSelectedPois] = useState([]);
  const handlePoisChange = (poisFromSlider) => {
    setSelectedPois(poisFromSlider);
  };

  //Login page first
  if (showLogin) {
    return (
      <LoginScreen
        onSkip={() => {
          setShowLogin(false);
          setHasInitialized(false); // for loading
        }}
      />
    );
  }
  // start loading if the map still isn't done
  if (!hasInitialized) {
    return <LoadingPage />;
  }

  if(showOutdoorDirection){
    return <OutdoorDirection
    onPressBack={() => setShowOutdoorDirection((prev) => (prev !== true))}
    buildings={buildings}
    initialFrom={departureBuilding ? departureBuilding.name : ""}
    initialTo={destinationBuilding ? destinationBuilding.name : ""}
    destination={destinationPoi}
    />;

  }

  if(showCalendar){
    return <CalendarPage 
    onPressBack={() => setShowCalendar((prev) => (prev !== true))} 
    />;
  
  }


  return (
    <View style={styles.container}>
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
      />
      <SideLeftBar
        currentCampus={currentCampus}
        onToggleCampus={() =>
          setCurrentCampus((prev) => (prev === "SGW" ? "Loyola" : "SGW"))
        }
        onToggleLiveLocation={() =>
          setLiveLocationEnabled((prev) => {
            if (prev) {
              setUserLocation(null);
            }
            return !prev;
          })
        }
        onPressPOI={() => {
          setIsPressedPOI(prev => {
            if(prev) {
              setPoiOriginBuilding(null);
              setSelectedPois([]);
            }
            return !prev;
          });
        }}
      />

      <TopRightMenu onPressDirection={() => setShowOutdoorDirection(true)} onPressCalendar={() => setShowCalendar(true)}/>
      <BuildingInfoModal
        building={selectedBuilding}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSetDeparture={(buildingCommute) => setDepartureBuilding(buildingCommute)}
        onSetDestination={(buildingCommute) => {
          setDestinationBuilding(buildingCommute);
          setDestinationPoi(null);
        }}
        selectedRole={ getBuildingRole(selectedBuilding) }
      />
      <PoiInfoModal
        poi={selectedPoi}
        visible={poiModalVisible}
        onClose={() => setPoiModalVisible(false)}
        onSetAsDestination={() => {
          setDestinationPoi({
            label: selectedPoi.name,
            lat: selectedPoi.geometry.location.lat,
            lng: selectedPoi.geometry.location.lng,
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  buttons: {
    position: 'absolute',
    bottom: 40,
    width: '90%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6b0f1a',
    zIndex: 10,
    elevation: 10,
    alignSelf: 'center',
  },
});