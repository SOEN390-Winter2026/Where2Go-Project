import { View, } from 'react-native';
import React, { useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import PropTypes from 'prop-types';

import BuildingCallout from './BuildingCallout';
import { colors } from './theme/colors';
import { styles, BURGUNDY, BURGUNDY_LIGHT } from './styles/Map_styles';

const POI_ICONS = {
  restaurant: require("../assets/poi-icons/poi-marker-restaurant.png"),
  cafe: require("../assets/poi-icons/poi-marker-cafe.png"),
  bar: require("../assets/poi-icons/poi-marker-bar.png"),
  pharmacy: require("../assets/poi-icons/poi-marker-pharmacy.png"),
  gym: require("../assets/poi-icons/poi-marker-gym.png"),
};

const coordShape = PropTypes.shape({
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
});

const segmentShape = PropTypes.shape({
  coords: PropTypes.arrayOf(coordShape).isRequired,
  isWalk: PropTypes.bool.isRequired,
  vehicle: PropTypes.string,
});

function getPoiIcon(types = []) {
  for (const t of types) {
    if (POI_ICONS[t]) return POI_ICONS[t];
  }
  return undefined;
}

function isBoardingTransition(seg, next) {
  return seg.isWalk && next && !next.isWalk;
}

function segKey(seg) {
  const { latitude, longitude } = seg.coords[0];
  return `${latitude},${longitude}`;
}

function StopDot() {
  return (
    <View style={styles.stopDotOuter}>
      <View style={styles.stopDotInner} />
    </View>
  );
}

function BoardingPin() {
  return (
    <View style={styles.boardingPinOuter}>
      <View style={styles.boardingPinInner} />
    </View>
  );
}

function StartMarker() {
  return (
    <View style={styles.startMarker}>
      <View style={styles.startMarkerInner} />
    </View>
  );
}

function EndMarker() {
  return (
    <View style={styles.endPin}>
      <View style={styles.endPinDot} />
    </View>
  );
}

function WalkPolylines({ segments }) {
  return segments
    .filter((s) => s.isWalk)
    .map((seg) => (
      <Polyline
        key={`walk-${segKey(seg)}`}
        coordinates={seg.coords}
        strokeColor={BURGUNDY_LIGHT}
        strokeWidth={3}
        lineDashPattern={[6, 6]}
      />
    ));
}

WalkPolylines.propTypes = { segments: PropTypes.arrayOf(segmentShape).isRequired };

function TransitPolylines({ segments }) {
  return segments
    .filter((s) => !s.isWalk)
    .map((seg) => (
      <Polyline
        key={`transit-${segKey(seg)}`}
        coordinates={seg.coords}
        strokeColor={BURGUNDY}
        strokeWidth={6}
      />
    ));
}

TransitPolylines.propTypes = { segments: PropTypes.arrayOf(segmentShape).isRequired };

function TransitStopDots({ segments }) {
  return segments
    .filter((s) => !s.isWalk)
    .map((seg) => {
      const start = seg.coords[0];
      const end = seg.coords[seg.coords.length - 1];
      const key = segKey(seg);
      return (
        <React.Fragment key={`stops-${key}`}>
          {start && (
            <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <StopDot />
            </Marker>
          )}
          {end && (
            <Marker coordinate={end} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <StopDot />
            </Marker>
          )}
        </React.Fragment>
      );
    });
}

TransitStopDots.propTypes = { segments: PropTypes.arrayOf(segmentShape).isRequired };

function BoardingPins({ segments }) {
  return segments.map((seg, idx) => {
    const next = segments[idx + 1];
    if (!isBoardingTransition(seg, next)) return null;
    const coord = next.coords[0];
    return coord ? (
      <Marker key={`board-${segKey(next)}`} coordinate={coord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
        <BoardingPin />
      </Marker>
    ) : null;
  });
}

BoardingPins.propTypes = { segments: PropTypes.arrayOf(segmentShape).isRequired };

const CampusMap = forwardRef((props, ref) => {
  const {
    campusCoords,
    buildings,
    onBuildingPress,
    liveLocationEnabled,
    userLocation = null,
    userDraggedMap,
    setUserDraggedMap,
    selectedPois = [],
    onPoiPress,
    onLiveLocDisappear,
    onLiveLocAppear,
    activeSegments = [],
    activeRouteCoords = [],
    routeStart = null,
    routeEnd = null,
  } = props;

  const mapRef = useRef(null);
  const [isLiveLocVisible, setIsLiveLocVisible] = useState(true);
  const [currentRegion, setCurrentRegion] = useState(null);

  const [isMarkerCurrentlyVisible, setIsMarkerCurrentlyVisible] = useState(true);

  const checkLiveLocationVisibility = (region) => {
    if (!userLocation || !liveLocationEnabled || !region) return;

    const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
    const { latitude: uLat, longitude: uLng } = userLocation;

    const northBound = latitude + latitudeDelta / 2;
    const southBound = latitude - latitudeDelta / 2;
    const eastBound = longitude + longitudeDelta / 2;
    const westBound = longitude - longitudeDelta / 2;

    const isVisible = uLat <= northBound && uLat >= southBound && uLng <= eastBound && uLng >= westBound;


    if (isVisible !== isMarkerCurrentlyVisible) {
      setIsMarkerCurrentlyVisible(isVisible);
      if (!isVisible) {
        onLiveLocDisappear();
      } else {
        onLiveLocAppear();
      }
    }
  };

  useImperativeHandle(ref, () => mapRef.current);

  const isPointInPolygon = (point, polygon) => {
    const { latitude: x, longitude: y } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].latitude, yi = polygon[i].longitude;
      const xj = polygon[j].latitude, yj = polygon[j].longitude;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  const snapBackToUser = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    mapRef.current.animateToRegion(
      { ...userLocation, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      400
    );
    setUserDraggedMap(false);
  }, [userLocation, setUserDraggedMap]);

  useEffect(() => {
    if (liveLocationEnabled && userLocation) {
      snapBackToUser();
    }
  }, [liveLocationEnabled, userLocation, snapBackToUser]);

  const hasSegments = activeSegments.length > 0;
  const showFallbackRoute = !hasSegments && activeRouteCoords.length > 0;

  return (
    <>
      <View style={styles.mapPlaceholder} pointerEvents="none" />
      <MapView
        testID="mapRef"
        accessible={true}
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        initialRegion={{ ...campusCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        style={styles.map}
        onRegionChange={() => {
          if (liveLocationEnabled) setUserDraggedMap(true);
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

        {buildings.map((building) => {
          
          const isInside = userLocation && isPointInPolygon(userLocation, building.coordinates);

          return (
            <Polygon
              key={building.id}
              coordinates={building.coordinates}
              fillColor={isInside ? colors.buildingInsideFill : colors.buildingHighlightFill}
              strokeColor={isInside ? colors.buildingInsideStroke : colors.buildingHighlightStroke}
              strokeWidth={1}
            />
          );
        })}

        {hasSegments && <WalkPolylines segments={activeSegments} />}
        {hasSegments && <TransitPolylines segments={activeSegments} />}
        {hasSegments && <TransitStopDots segments={activeSegments} />}
        {hasSegments && <BoardingPins segments={activeSegments} />}

        {showFallbackRoute && (
          <Polyline coordinates={activeRouteCoords} strokeColor={BURGUNDY} strokeWidth={6} />
        )}

        {routeStart && (
          <Marker coordinate={routeStart} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <StartMarker />
          </Marker>
        )}

        {routeEnd && (
          <Marker coordinate={routeEnd} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
            <EndMarker />
          </Marker>
        )}

        {liveLocationEnabled && userLocation && (
          <Marker
            coordinate={userLocation}
            zIndex={999}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={true}
            accessible={true}
            accessibilityLabel="userMarker"
          >
            <View style={styles.userDot} />
          </Marker>
        )}

        {selectedPois.map((poi) => (
          <Marker
            key={poi.place_id}
            coordinate={{
              latitude: poi.geometry.location.lat,
              longitude: poi.geometry.location.lng,
            }}
            onPress={() => onPoiPress(poi)}
            image={getPoiIcon(poi.types)}
            tracksViewChanges={false}
          />
        ))}
      </MapView>
    </>
  );
});

CampusMap.displayName = 'CampusMap';

export default CampusMap;