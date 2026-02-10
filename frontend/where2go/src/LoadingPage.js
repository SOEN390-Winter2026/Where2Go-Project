import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated } from 'react-native';
import * as Progress from 'react-native-progress';

// Define the window height and width to use them for positioning
const { width, height } = Dimensions.get('window');

const LoadingPage = ({ progress = null }) => {
  const [defaultProgress, setDefaultProgress] = useState(0);
  const fadeAnim = new Animated.Value(0);
  
  // Use passed progress or default progress, for future update
  const currentProgress = progress !== null ? progress : defaultProgress;

  // Simulate loading progress (only if no progress prop is provided)
  // >> No prop set right now
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 90, // if you lower this value, the entire page looks faded. Try 1, see what happens
      duration: 1000,
      useNativeDriver: true,
    }).start();

    if (progress === null) {
      const interval = setInterval(() => {
        setDefaultProgress(prev => {
          if (prev >= 0.95) {
            clearInterval(interval);
            return 0.95; // Stop at 95% until actual loading completes
          }
          return prev + 0.01; // change here for faster or slower bar animation
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [progress]);

  // opacity: was the reason why it looked faded. Other types of animation exist but this is the closest to mockup goal. Unless we upload a gif
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.loaderContainer, { opacity: fadeAnim }]}> 
        <Image
          source={require('../assets/Where2GoLogo.png')}
          style={styles.icon}
        />
        <Text style={styles.loadingText}>Loading...</Text>
        <Progress.Bar
          progress={currentProgress}
          width={width - 40}
          height={10}
          borderRadius={5}
          color="#4e222a"
          unfilledColor="#4798ca"
        />
      </Animated.View>
    </View>
  );
};

// StyleSheet = type checks for react native components
const styles = StyleSheet.create({
  container: {
    flex: 1, // so it takes up entire container space
    backgroundColor: '#912338',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '80%', // to make it responsive
    height: undefined,
    aspectRatio: 1, // to keep the logo square
    marginBottom: 30, // spacing
  },
  loadingText: {
    fontSize: 30,
    color: '#ffffff',
    marginBottom: 20, // spacing
  },
});

export default LoadingPage;