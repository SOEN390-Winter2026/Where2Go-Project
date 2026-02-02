import React from 'react';
import { View, StyleSheet } from 'react-native';
import SideLeftBar from './src/SideLeftBar';
import TopRightMenu from './src/TopRightMenu'; // Import your new file!

export default function App() {
  return (
    <View style={styles.container}>
      {/* The Map would go here (in the Background) */}
      <View style={styles.mapPlaceholder} />

      {/*Side bar left */}
      <SideLeftBar />

      {/* 3. Top right menu */}
      <TopRightMenu />
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
    backgroundColor: '#e5e5e5', // This is where the map will show up
  }
});