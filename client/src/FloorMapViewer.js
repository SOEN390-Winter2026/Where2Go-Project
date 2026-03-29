import React, { useState, useMemo } from 'react';
import {
  View, Image, Text, TouchableOpacity,
  Dimensions, ScrollView
} from 'react-native';
import PropTypes from 'prop-types';
import { indoorMaps } from './data/indoorData';
import { styles } from "./styles/FloorMapViewer_styles";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

FloorMapViewer.propTypes = {
  building: PropTypes.object.isRequired,
  campus: PropTypes.string.isRequired
};

export default function FloorMapViewer({ building, campus }) {
  const buildingData = indoorMaps[campus]?.[building];
  const floors = useMemo(() => buildingData ? Object.keys(buildingData) : [], [buildingData]);
  const [selectedFloor, setSelectedFloor] = useState(floors[0]);

  if (!buildingData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No data for {campus} – {building}</Text>
      </View>
    );
  }

  const floorEntry = buildingData[selectedFloor];

  return (
    <View style={styles.container}>

      {/* FLOOR SELECTOR */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {floors.map(floor => (
          <TouchableOpacity
            key={floor}
            style={[styles.tab, selectedFloor === floor && styles.tabActive]}
            onPress={() => setSelectedFloor(floor)}
          >
            <Text style={[styles.tabText, selectedFloor === floor && styles.tabTextActive]}>
              Floor {floor}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* FLOOR MAP IMAGE */}
      <View style={styles.mapContainer}>
        {floorEntry?.image ? (
          <Image
            source={floorEntry.image}
            style={styles.mapImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.placeholderText}>Map coming soon</Text>
          </View>
        )}

        {/* Badge if no JSON data yet */}
        {!floorEntry?.data && (
          <View style={styles.noDataBadge}>
            <Text style={styles.noDataText}>Navigation unavailable</Text>
          </View>
        )}
      </View>

    </View>
  );
}