import { useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  Animated,
} from "react-native";
import Slider from '@react-native-community/slider';


export default function PoiSlider(){

    const [sliderValueRadius, setSliderValueRadius] = useState(0);

    return(

        <>
        
        <View style={styles.poiSliderView}>
            <Text> Radius Range: {sliderValueRadius}</Text>
            <Slider
        style={{ width: 300, height: 40 }}
        minimumValue={1}
        maximumValue={1000}
        minimumTrackTintColor="#ccc"
        maximumTrackTintColor="#000000"
        onValueChange={(value) => setSliderValueRadius(value)}
        value={sliderValueRadius}
        thumbTintColor="#912338"
        step={1}
      />
      <Pressable>
        <Text style={styles.enterText}>
            Enter
        </Text>
      </Pressable>

        </View>
        
        </>
    )

}

const styles = StyleSheet.create({

    poiSliderView:{
        position: "absolute",
        zIndex: 20,
        bottom: "2%",
        backgroundColor: "white",
        borderColor: "#912338",
        borderWidth: 1,
        borderRadius: 20,
        padding: 20,
        margin: 20,
        alignItems: "center",
        alignSelf: "center", // Aligns slider in the middle of the screen
        
    },

    enterText:{
        backgroundColor: "#912338",
        color: "white",
        borderWidth: 1,
        padding: 10,
        margin: 2,
        borderRadius: 20,
    },
});