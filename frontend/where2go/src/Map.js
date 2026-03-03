import { View } from 'react-native';
import React, { useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import PropTypes from 'prop-types';

import BuildingCallout from './BuildingCallout';
import { colors } from './theme/colors';
import { styles, BURGUNDY, BURGUNDY_LIGHT } from './css/Map_styles';

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
    activeSegments = [],
    activeRouteCoords = [],
    routeStart = null,
    routeEnd = null,
  } = props;

  const mapRef = useRef(null);

  useImperativeHandle(ref, () => mapRef.current);

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
        ref={mapRef}
        initialRegion={{ ...campusCoords, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        style={styles.map}
        onRegionChange={() => {
          if (liveLocationEnabled) setUserDraggedMap(true);
        }}
        onRegionChangeComplete={() => {
          if (liveLocationEnabled && userLocation && userDraggedMap) snapBackToUser();
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
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
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