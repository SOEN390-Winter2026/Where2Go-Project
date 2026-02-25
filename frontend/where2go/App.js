import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Image } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon } from 'react-native-maps';

import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import PoiSlider from "./src/PoiSlider";
import LoginScreen from "./src/Login";
import BuildingCallout from './src/BuildingCallout';
import BuildingInfoModal from './src/BuildingInfoModal';
import PoiInfoModal from './src/PoiInfoModal';
import OutdoorDirection from "./src/OutdoorDirection";
import LoadingPage from './src/LoadingPage';
import { colors } from './src/theme/colors';
import { API_BASE_URL } from './src/config';

const CAMPUS_COORDS = {
  SGW: { latitude: 45.4974, longitude: -73.5771 },
  Loyola: { latitude: 45.4587, longitude: -73.6409 },
};

export default function App() {
  console.log(API_BASE_URL);

  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
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

  //for points of interest (get images to display on map)
  const POI_ICONS = {
    restaurant: require("./assets/poi-icons/poi-marker-restaurant.png"),
    cafe: require("./assets/poi-icons/poi-marker-cafe.png"),
    bar: require("./assets/poi-icons/poi-marker-bar.png"),
    pharmacy: require("./assets/poi-icons/poi-marker-pharmacy.png"),
    gym: require("./assets/poi-icons/poi-marker-gym.png"),
  };

  const getPoiIcon = (types = []) => {
    for (const t of types) {
      if (POI_ICONS[t]) return POI_ICONS[t];
    }
  };

  //Snapping back to user
  const snapBackToUser = () => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.animateToRegion(
      {
        ...userLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      400
    );
    setUserDraggedMap(false);
  };

  // live location button turned on
  useEffect(() => {
    if (liveLocationEnabled && userLocation) {
      snapBackToUser();
    }
  }, [liveLocationEnabled, userLocation]);

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

  const markerRef = useRef(null);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.showCallout();
    }
  }, []);


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
    />;
  
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder} pointerEvents="none" />

      <MapView
        testID="mapRef"
        accessible={true}
        ref={mapRef}
        initialRegion={{ ...campusCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        style={styles.map}
        // When user drags map, snap back to them after they are done
        onRegionChange={() => {
          if (liveLocationEnabled) {
            setUserDraggedMap(true);
          }
        }}
        onRegionChangeComplete={() => {
          if (liveLocationEnabled && userLocation && userDraggedMap) {
            snapBackToUser();
          }
        }}
        onPoiClick={(event) => {
          const { placeId, name } = event.nativeEvent;
          console.log(`Clicked on ${name} with ID: ${placeId}`);
        }}
        showsPointsOfInterest={false}
      >

        {/* Building markers with callouts */}
        <BuildingCallout buildings={buildings} onBuildingPress={handleBuildingPress} />

        {/* this section renders the campus highlighted shapes */}
        {buildings.map((building) => (
          <Polygon
            key={building.id}
            coordinates={building.coordinates}
            fillColor={colors.buildingHighlightFill}
            strokeColor={colors.buildingHighlightStroke}
            strokeWidth={2}
          />
        ))}

        {/* User marker */}
        {liveLocationEnabled && userLocation && (
          <Marker

            coordinate={userLocation}
            title="You"
            pinColor="blue"
            accessible={true}
            accessibilityLabel="userMarker"
          />
        )}

        {/* POI Markers (custom icons) */}
        {selectedPois?.map((poi) => (
          <Marker
            key={poi.place_id}
            coordinate={{
              latitude: poi.geometry.location.lat,
              longitude: poi.geometry.location.lng,
            }}
            title={poi.name}
            description={poi.vicinity}
            onPress={() => {
              setSelectedPoi(poi);
              setPoiModalVisible(true);
            }}
            tracksViewChanges={false}>
            <View style={styles.poiMarker}>
              <Image
                source={getPoiIcon(poi.types)}
                style={styles.poiMarkerIcon}
                resizeMode="contain"
              />
            </View>
          </Marker>
        ))}

      </MapView>
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

      <TopRightMenu onPressDirection={() => setShowOutdoorDirection(true)} />
      <BuildingInfoModal
        building={selectedBuilding}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSetDeparture={(buildingCommute) => setDepartureBuilding(buildingCommute)}
        onSetDestination={(buildingCommute) => setDestinationBuilding(buildingCommute)}
        selectedRole={ getBuildingRole(selectedBuilding) }
      />
      <PoiInfoModal
        poi={selectedPoi}
        visible={poiModalVisible}
        onClose={() => setPoiModalVisible(false)}
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
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e5e5e5',
    zIndex: 0,
  },
  map: {
    width: '100%',
    height: '100%',
    zIndex: 1,
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
  poiMarker: {
    backgroundColor: "white",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#912338",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  poiMarkerIcon: {
    width: 24,
    height: 24,
  },
});