import { StyleSheet, View, Image, Pressable } from 'react-native';
import React, { useEffect, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import MapView, { Marker, Polygon } from 'react-native-maps';

import BuildingCallout from './BuildingCallout';
import { colors } from './theme/colors';

const POI_ICONS = {
  restaurant: require("../assets/poi-icons/poi-marker-restaurant.png"),
  cafe: require("../assets/poi-icons/poi-marker-cafe.png"),
  bar: require("../assets/poi-icons/poi-marker-bar.png"),
  pharmacy: require("../assets/poi-icons/poi-marker-pharmacy.png"),
  gym: require("../assets/poi-icons/poi-marker-gym.png"),
};

const getPoiIcon = (types = []) => {
  for (const t of types) {
    if (POI_ICONS[t]) return POI_ICONS[t];
  }
};

const CampusMap = forwardRef((props, ref) => {
  const {
    campusCoords,
    buildings,
    onBuildingPress,
    liveLocationEnabled,
    userLocation,
    userDraggedMap,
    setUserDraggedMap,
    selectedPois,
    onPoiPress,
    onLiveLocDisappear,
    onLiveLocAppear,
  } = props;

  const mapRef = useRef(null);
  const [isLiveLocVisible, setIsLiveLocVisible] = useState(true);
  const [currentRegion, setCurrentRegion] = useState(null);

  const [isMarkerCurrentlyVisible, setIsMarkerCurrentlyVisible] = useState(true);

  const checkLiveLocationVisibility = (region) => {
    if (!userLocation || !liveLocationEnabled) return;

    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const { latitude: uLat, longitude: uLng } = userLocation; // Ensure naming matches your userLocation object

    const northBound = latitude + latitudeDelta / 2;
    const southBound = latitude - latitudeDelta / 2;
    const eastBound = longitude + longitudeDelta / 2;
    const westBound = longitude - longitudeDelta / 2;

    const isVisible = uLat <= northBound && uLat >= southBound && uLng <= eastBound && uLng >= westBound;

    // Only call the prop if visibility status HAS CHANGED
    if (isVisible !== isMarkerCurrentlyVisible) {
      setIsMarkerCurrentlyVisible(isVisible);
      if (!isVisible) {
        onLiveLocDisappear();
      } else if (props.onLiveLocAppear) { // Optional: Create a re-appear prop!
        onLiveLocAppear();
      }
    }
  };

  useImperativeHandle(ref, () => mapRef.current);

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

  return (
    <>
      <View style={styles.mapPlaceholder} pointerEvents="none" />
      <MapView
        testID="mapRef"
        accessible={true}
        ref={mapRef}
        initialRegion={{ ...campusCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        style={styles.map}
        onRegionChange={() => {
          if (liveLocationEnabled) {
            setUserDraggedMap(true);
          }
        }}
        onRegionChangeComplete={(region) => {
          // Check if user is out of view every time they stop moving the map
          checkLiveLocationVisibility(region);
        }}
        onPoiClick={(event) => {
          const { placeId, name } = event.nativeEvent;
          console.log(`Clicked on ${name} with ID: ${placeId}`);
        }}
        showsPointsOfInterest={false}
      >
        <BuildingCallout buildings={buildings} onBuildingPress={onBuildingPress} />

        {buildings.map((building) => (
          <Polygon
            key={building.id}
            coordinates={building.coordinates}
            fillColor={colors.buildingHighlightFill}
            strokeColor={colors.buildingHighlightStroke}
            strokeWidth={2}
          />
        ))}

        {liveLocationEnabled && userLocation && (
          <Marker
            coordinate={userLocation}
            title="You"
            pinColor="blue"
            accessible={true}
            accessibilityLabel="userMarker"
          />
        )}

        {selectedPois?.map((poi) => (
          <Marker
            key={poi.place_id}
            coordinate={{
              latitude: poi.geometry.location.lat,
              longitude: poi.geometry.location.lng,
            }}
            title={poi.name}
            description={poi.vicinity}
            onPress={() => onPoiPress(poi)}
            tracksViewChanges={false}
          >
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
    </>
  );
});

const styles = StyleSheet.create({
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

export default CampusMap;
