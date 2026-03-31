import { StyleSheet } from "react-native";
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
export default styles;