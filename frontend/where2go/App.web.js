import React from "react";
import { View, StyleSheet } from "react-native";
import AppCore from "./AppCore";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GOOGLE_WEB_CLIENT_ID } from "@env";

export default function AppWeb() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
      <View style={styles.page}>
        <View style={styles.frame}>
          <AppCore />
        </View>
      </View>
    </GoogleOAuthProvider>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f6f6f6",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  frame: {
    width: 420,
    height: "90vh",
    backgroundColor: "white",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eaeaea",
  },
});