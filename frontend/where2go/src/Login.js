import React from "react";
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity, Image } from "react-native";
import PropTypes from 'prop-types';

LoginScreen.propTypes = {
  onSkip: PropTypes.func.isRequired,
};

const LoginScreen = ({onSkip}) => {
  return (
    <ImageBackground
      source={require('../assets/First_page.png')} 
      style={styles.background}
    >
     
      <View style ={styles.content}>
       <Image
       source={require('../assets/user_icon.png')} 
       style={styles.userIcon}
       />
         
         <Text style={styles.text}>WELCOME TO WHERE2GO</Text>

         <TouchableOpacity style = {styles.googleButton}>
         <Image
         source={require('../assets/google_icon.png')} 
         style={styles.googleIcon}
         />
         <Text style={styles.googleText}> Sign in with Google</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.skipButton} onPress = {onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,  
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center", 
  },
  userIcon: {
    width: 120,       
    height: 120,
    marginBottom: 20,
    borderRadius: 45, 
  },
  text: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
    letterSpacing: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 10,
  },
  googleText: {
    marginLeft: 10,
    color: "#000",
    fontWeight: "bold",
  },
  googleIcon: {
  width: 20,
  height: 20,
  resizeMode: "contain",
},
   skipButton: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    paddingHorizontal: 40,
    borderRadius: 50,
    marginBottom: 10,
  },
  skipText: {
    color: "#000",
    fontWeight: "bold",
  },
});

export default LoginScreen;
