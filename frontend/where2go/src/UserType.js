import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

export default function UserTypeScreen({ onSelectType }) {
  const [userType, setUserType] = useState(null);

  const handleContinue = () => {
    if (!userType) return;
    onSelectType(userType);
    // navigation.navigate("Map", { userType });
  };

  const OptionCard = ({ type, label, description }) => (
    <TouchableOpacity
      style={[
        styles.card,
        userType === type && styles.cardSelected,
      ]}
      onPress={() => setUserType(type)}
    >
      <Text style={styles.cardTitle}>{label}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
        <Image
 // source={require("../assets/where2go-logo.png")}
  style={styles.logo}
/>
      <Text style={styles.title}>Who are you?</Text>
      <Text style={styles.subtitle}>
        This helps us highlight Concordia buildings for you.
      </Text>

      <OptionCard
        type="student"
        label="Student"
        description="See academic buildings with department labels."
      />

      <OptionCard
        type="faculty"
        label="Faculty Member"
        description="Access detailed building and department information."
      />

      <OptionCard
        type="visitor"
        label="Visitor"
        description="View campus buildings clearly among city locations."
      />

      <TouchableOpacity
        style={[
          styles.continueButton,
          !userType && { opacity: 0.5 },
        ]}
        onPress={handleContinue}
        disabled={!userType}
      >
        <Text style={styles.continueText}>Continue to Map</Text>
      </TouchableOpacity>
    </View>

  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: "#ffffff",
      
    },
    title: {
      fontSize: 26,
      fontWeight: "bold",
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: "#555",
      textAlign: "center",
      marginBottom: 24,
    },
    card: {
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cardSelected: {
      borderColor: "#6b0f1a",
      backgroundColor: "#f9ecee",
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 6,
    },
    cardDescription: {
      fontSize: 14,
      color: "#555",
    },
    continueButton: {
      marginTop: 20,
      backgroundColor: "#6b0f1a",
      paddingVertical: 14,
      borderRadius: 10,
    },
    continueText: {
      color: "#fff",
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
    },

    logo: {
        width: 300,
        height: 80,
        resizeMode: "contain",
        alignSelf: "center",
        marginBottom: 32,
        marginTop: 60,
      },      
  });
  