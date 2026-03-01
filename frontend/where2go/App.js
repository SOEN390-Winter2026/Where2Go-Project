import { StatusBar } from 'expo-status-bar';
import polyline from "@mapbox/polyline";
import { StyleSheet, View } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu';
import LoginScreen from "./src/Login";
import OutdoorDirection from "./src/OutdoorDirection";
import { colors } from './src/theme/colors';
import { API_BASE_URL } from './src/config';
import { polygonCentroid } from './src/utils/geo';
import RouteDetailSheet from "./src/RouteDetailSheet";

export default function App() {
  console.log(API_BASE_URL);
  
  const [showOutdoorDirection, setShowOutdoorDirection] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
  const [currentCampus, setCurrentCampus] = useState('SGW');
  const [campusCoords, setCampusCoords] = useState({
    latitude: 45.4974,
    longitude: -73.5771,
  });

  const [buildings, setBuildings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [userDraggedMap, setUserDraggedMap] = useState(false); //to snap back to user when dragged away
  const [liveLocationEnabled, setLiveLocationEnabled] = useState(false);
  const watchRef = useRef(null);
  const mapRef = useRef(null);

  const [selectDestination, setSelectDestination] = useState(null);

  const [activeRouteCoords, setActiveRouteCoords] = useState([]);
const [activeRouteMeta, setActiveRouteMeta] = useState(null); 
const [activeSegments, setActiveSegments] = useState([]);

// ---- START/END markers derived from current route ----
const routeStart =
  activeSegments?.[0]?.coords?.[0] ??
  activeRouteCoords?.[0] ??
  null;

const routeEnd = (() => {
  if (activeSegments?.length) {
    const lastSeg = activeSegments[activeSegments.length - 1];
    return lastSeg?.coords?.[lastSeg.coords.length - 1] ?? null;
  }
  return activeRouteCoords?.[activeRouteCoords.length - 1] ?? null;
})();

// { origin, destination, route }

const handleSelectRoute = ({ route, origin, destination }) => {
  const coords = decodePolylineToCoords(route?.polyline);

  setActiveRouteCoords(coords);
  setActiveRouteMeta({ route, origin, destination });

  const steps = Array.isArray(route?.steps) ? route.steps : [];
  const segments = steps
    .map((s) => {
      const coords = decodePolylineToCoords(s.polyline);
      if (!coords.length) return null;

      const isWalk = s.type === "walk";
      return {
        coords,
        isWalk,
        vehicle: s.vehicle,
      };
    })
    .filter(Boolean);

  setActiveSegments(segments);
  // Go back to the map screen
  setShowOutdoorDirection(false);

  // Fit after returning to map view
  requestAnimationFrame(() => {
    fitRoute(coords);
  });
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

  useEffect(() => {
    if (liveLocationEnabled && userLocation) {
      snapBackToUser();
    }
  }, [liveLocationEnabled, userLocation]);

  // Select building as destination
  const handleSelectDestination = (building) => {
    if (selectDestination?.id === building.id) {
      setSelectDestination(null);
    } else {
      setSelectDestination(building);
    }
  };


  // whenever currentCampus changes, get coordinates and building polygons from the backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/campus/${currentCampus}`)
      .then((res) => res.json())
      .then((data) => {
        const nextCoords = { latitude: data.lat, longitude: data.lng };
        setCampusCoords(nextCoords);
        mapRef.current?.animateToRegion(
          {
            ...nextCoords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          500
        );
      })
      .catch((err) => console.error('Error fetching campus coordinates:', err));

    fetch(`${API_BASE_URL}/campus/${currentCampus}/buildings`)
      .then((res) => res.json())
      .then(setBuildings)
      .catch((err) => console.error('Error fetching buildings:', err));
  }, [currentCampus,showLogin]);


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

// ---- Route helpers ----
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


  //Login page first
  if (showLogin){
    return <LoginScreen onSkip={() => setShowLogin(false)}/>;
  }
  if(showOutdoorDirection){
    // Convert selected building polygon to a { label, lat, lng } location object.
    let destLocation = null;
    if (selectDestination?.coordinates?.length) {
      const center = polygonCentroid(selectDestination.coordinates);
      destLocation = {
        label: selectDestination.name || selectDestination.id,
        ...center,
      };
    }
    return (
      <OutdoorDirection
        destination={destLocation}
        onPressBack={() => setShowOutdoorDirection(false)}
         onSelectRoute={handleSelectRoute}   
      />
    );
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
        >

        {/* Campus marker */}
        <Marker coordinate={campusCoords} title={currentCampus} />

        {/* User marker */}
        {userLocation && liveLocationEnabled && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
          />
        )}
        {/* this section renders the campus highlighted shapes */}
        {buildings.map((building) => {
          const destination = selectDestination?.id === building.id;
          return (
            <Polygon
              key={building.id}
              coordinates={building.coordinates}
              fillColor={
                destination ? colors.destinationHighlightFill : 
                colors.buildingHighlightFill
              }
              strokeColor={
                colors.buildingHighlightStroke
              }
              strokeWidth={2}
              tappable
              onPress={() => 
                handleSelectDestination(building)
              }
            />
          )
      })}
       {/* ⭐ START MARKER */}
  {routeStart && (
    <Marker coordinate={routeStart} title="Start" pinColor="green" />
  )}

  {/* ⭐ END MARKER */}
  {routeEnd && (
    <Marker coordinate={routeEnd} title="Destination" pinColor="red" />
  )}

      {activeSegments.map((seg, idx) => (
  <Polyline
    key={`seg-${idx}`}
    coordinates={seg.coords}
    strokeWidth={5}
    strokeColor={seg.isWalk ? "#1e88e5" : "#6b0f1a"}
    lineDashPattern={seg.isWalk ? [8, 8] : undefined}
  />
))}


      {activeRouteCoords.length > 0 && activeSegments.length === 0 && (
  <Polyline
    coordinates={activeRouteCoords}
    strokeWidth={5}
    strokeColor="#6b0f1a"
  />
)}

      </MapView>
      <SideLeftBar
        currentCampus={currentCampus}
        onToggleCampus={() =>
          setCurrentCampus((prev) => (prev === "SGW" ? "Loyola" : "SGW"))
        }
        onToggleLiveLocation={() =>
          setLiveLocationEnabled((prev) => 
            {
              if(prev){
                setUserLocation(null);
              }
              return !prev;
            })
        }
        />

      <TopRightMenu onPressDirection={() => setShowOutdoorDirection(true)}/>
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
});