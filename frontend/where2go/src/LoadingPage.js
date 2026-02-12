import React from "react";
import { View, Image, ActivityIndicator, StyleSheet, Dimensions } from "react-native";

// Define the window height and width to use them for positioning
const { width, height } = Dimensions.get('window');

export default function LoadingPage() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/Where2GoLogo.png")} // change to your image path
        style={styles.image}
        resizeMode="contain"
      />

      <ActivityIndicator
        size="large"
        color="#3498db"
        style={styles.loader}
      />
    </View>
  );
}

// StyleSheet = type checks for react native components
const styles = StyleSheet.create({
  container: {
    flex: 1, // so it takes up entire container space
    backgroundColor: "#912338",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: '80%', // to make it responsive
    height: undefined,
    aspectRatio: 1, // to keep the logo square
    marginBottom: 30, // spacing
  },
  loader: {
    marginTop: 30,
  },
});
