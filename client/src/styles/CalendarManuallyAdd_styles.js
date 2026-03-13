import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    overlay: {
        flex:1,
        backgroundColor:"rgba(0,0,0,0.4)",
        justifyContent:"center",
        alignItems:"center"
    },
    container: {
        width:"90%",
        backgroundColor:"white",
        padding:20,
        borderRadius:10
    },
    title: {
        fontSize:20,
        fontWeight:"bold",
        marginBottom:15
    },
    input: {
        borderWidth:1,
        borderColor:"#ccc",
        padding:10,
        borderRadius:6,
        marginBottom:10},
    selector: {
        padding:12,
        backgroundColor:"#eee",
        borderRadius:6,
        marginBottom:10
    },
    row: {
        flexDirection:"row",
        justifyContent:"space-between",
        marginTop:10
    },
    cancel: {
        backgroundColor:"#999",
        padding:10,
        borderRadius:6,
        width:"45%",
        alignItems:"center"
    },
    save: {
        backgroundColor:"#912338",
        padding:10,
        borderRadius:6,
        width:"45%",
        alignItems:"center"
    },
    btnText: {
        color:"white",
        fontWeight:"bold"
    },
    suggestionsBox: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        maxHeight: 150,
        marginBottom: 10,
        elevation: 5
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee"
    },
});