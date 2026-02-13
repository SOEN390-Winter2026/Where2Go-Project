import React from "react";
import { View, Image, ActivityIndicator, StyleSheet } from "react-native";

export default function LoadingPage() {
  return (
    <View style={styles.container}>
      <Image
        testID="loadingLogo"
        source={require("../assets/Where2GoLogo.png")} // change to your image path
        style={styles.image}
        resizeMode="contain"
      />

      <ActivityIndicator
        testID="loadingSpin"
        size="large"
        color="#04e6ff"
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
    // width: 200,
    // height: 200, // for testing
    // backgroundColor: "cyan", // testing 2
    aspectRatio: 1, // to keep the logo square
    marginBottom: 30, // spacing
  },
  loader: {
    marginTop: 30,
    transform: [{ scale: 2.5 }], // bigger spinny 
  },
});
