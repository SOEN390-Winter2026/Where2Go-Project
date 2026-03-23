import React, { useState } from 'react';
import {
  View, Image, Text, TouchableOpacity,
  StyleSheet, Dimensions, ScrollView
} from 'react-native';
import { indoorMaps } from '../../indoorData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FloorMapViewer({ building, campus }) {
  const buildingData = indoorMaps[campus]?.[building];

  if (!buildingData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No data for {campus} – {building}</Text>
      </View>
    );
  }

  const floors = Object.keys(buildingData);
  const [selectedFloor, setSelectedFloor] = useState(floors[0]);
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    tabBar: {
        flexGrow: 0,
        borderBottomWidth: 1,
        borderColor: '#e5e5e5',
    },
    tabBarContent: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
    },
    tabActive: {
        backgroundColor: '#8B0000',
    },
    tabText: {
        fontSize: 13,
        color: '#555',
    },
    tabTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    mapImage: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#999',
        fontSize: 14,
    },
    placeholderText: {
        color: '#bbb',
        fontSize: 14,
    },
    noDataBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: '#f0ad4e',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    noDataText: {
        fontSize: 11,
        color: '#fff',
        fontWeight: '600',
    },
});