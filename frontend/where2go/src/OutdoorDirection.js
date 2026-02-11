import { View, Text, StyleSheet,Pressable } from 'react-native';

export default function OutdoorDirection({onPressBack}) {

  return (
    <View style={styles.container}>
        <Pressable testID='pressBack' style={styles.press}onPress={onPressBack}><Text style={styles.pressText}>Back</Text></Pressable>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    color: 'red',
  },
  press: {
    position: 'absolute',
    backgroundColor: "#912338", 
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    top: '5%',
    left:'5%',
    
  },
  pressText:{
    color: "#fff",
    fontWeight: "bold",
  },
});
