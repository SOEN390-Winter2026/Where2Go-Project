import { View, Text, StyleSheet, Pressable, ImageBackground, TextInput, ScrollView, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef } from 'react';
import { colors } from './theme/colors';

export default function OutdoorDirection({ onPressBack }) {

  const routes = [
    { id: "1" }, { id: "2" }, { id: "3" },
  ]

  //Input Destinations Variables
  const [fromDestination, setFromDestination] = useState("");
  const [toDestination, setToDestination] = useState("");

  //Live Location Variables
  const [liveLocCoordinates, setLiveLocCoordinates] = useState(null);
  const [isPressedFromDest, setIsPressedFromDest] = useState(false);

  useEffect(() =>{
    console.log(isPressedFromDest); 
  },[isPressedFromDest])


  return (
    <ImageBackground
      source={require("../assets/background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <Pressable testID="pressBack" style={styles.backBtn} onPress={onPressBack}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Plan Your Trip</Text>
        <Text style={styles.headerSubtitle}>
          Find the best route between campuses
        </Text>
        <View style={styles.input}>
          <Text style={styles.inputLabel}>From</Text>
          <TextInput testID="inputStartLoc" placeholder="Choose Start Location"
            value={fromDestination}
            onChangeText={setFromDestination}
            style={styles.inputText} 
            onFocus={() => setIsPressedFromDest(true)}
            onBlur={() => setIsPressedFromDest(false)} />
            
        </View>

        <View style={styles.input}>
          <Text style={styles.inputLabel}>To</Text>
          <TextInput testID="inputDestLoc" placeholder="Choose destination"
            value={toDestination}
            onChangeText={setToDestination}
            style={styles.inputText} />
        </View>
      </View>



      <View style={styles.bottomPart}>
        {/*Live Location Button*/}

        {isPressedFromDest && 
        <View>
          <Pressable style={styles.liveLoc}>
            <Ionicons name="location" size={26} color="#912338" />
            <Text>Set to Your Location</Text>
          </Pressable>
        </View>}
        <View style={styles.routesHeader}>
          <Text style={styles.routesTitle}>
            {routes.length} routes{"\n"}available
          </Text>

          <Pressable testID="pressFilter">
            <Text style={styles.filterText}>Filter</Text>
          </Pressable>
        </View>
        <View style={styles.scrollBar} />
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.routesContent}>
          {routes.map((r) => (
            <View key={r.id} style={styles.routeContainer} />
          ))}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  header: {
    width: "100%",
    paddingTop: 35,
    paddingHorizontal: 20,
    position: "relative",
  },
  backBtn: {
    position: "absolute",
    top: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 30,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 14,
    padding: 10,
    marginTop: 14,
    backgroundColor: "white",
  },
  bottomPart: {
    flex: 1,
    marginTop: 40,
    paddingHorizontal: 16,
    backgroundColor: "white",
    paddingTop: 10,
    overflow: "hidden",
  },
  routesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  routesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
  },
  filterText: {
    color: "#7C2B38",
    fontWeight: "800"
  },
  routesSection: {
    flex: 1,
    backgroundColor: "#F5F6F8",
    marginTop: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  routeContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#7C2B38",
    flexDirection: "row",
    marginBottom: 16,
    marginHorizontal: 16,
    height: 170,
  },
  routeBody: {
    flex: 1,
  },
  flex: 1,
  routesContent: {
  },
  liveLoc: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 10,
    marginTop: 2,
    backgroundColor: "white",
    flexDirection: "row",        
    alignItems: "center",        // vertical alignment
    gap: 8,
  },
});

