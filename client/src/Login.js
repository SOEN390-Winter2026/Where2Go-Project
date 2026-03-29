import React from "react";
import { View, Text, ImageBackground, StyleSheet, TouchableOpacity, Image } from "react-native";
import PropTypes from 'prop-types';
import styles from "./styles/Login_styles";

const LoginScreen = ({onSkip}) => {
  return (
    <ImageBackground
      source={require('../assets/First_page.png')} 
      style={styles.background}
    >
     
      <View style ={styles.content}>
       <Image testID="user-icon"
       source={require('../assets/user_icon.png')} 
       style={styles.userIcon}
       />
         
         <Text style={styles.text}>WELCOME TO WHERE2GO</Text>

         <TouchableOpacity style={styles.skipButton} onPress = {onSkip}>
          <Text style={styles.skipText}>Continue</Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
};

LoginScreen.propTypes = {
  onSkip: PropTypes.func.isRequired,
};
export default LoginScreen;
