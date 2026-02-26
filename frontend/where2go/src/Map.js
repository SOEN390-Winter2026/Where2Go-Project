import { StyleSheet, View, Image } from 'react-native';
import React, { useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
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
  } = props;

  const mapRef = useRef(null);

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
