import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  Platform,
  TouchableWithoutFeedback, 
  Keyboard,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const buildings = [
  // SGW
  "hall building",
  "mcconnell building",
  "visual arts building",
  "engineering & visual arts",
  "engineering and visual arts",
  "grey nuns building",
  "faubourg building (fg)",
  "cl building",
  "toronto-dominion building",
  "john molson school of business",
  "jmsb",
  "guy-de maisonneuve building",
  "learning square building",
  "er building",
  "gs building",
  "samuel bronfman building",
  "q annex",
  "p annex",
  "t annex",
  "rr annex",
  "r annex",
  "fa annex",
  "en annex",
  "x annex",
  "z annex",
  "pr annex",
  "v annex",
  "m annex",
  "s annex",
  "ci annex",
  "mi annex",
  "d annex",
  "b annex",
  "k annex",
  "mu annex",
  // Loyola
  "stinger dome",
  "perform centre",
  "recreation and athletics complex",
  "centre for structural and functional genomics",
  "communication studies and journalism building",
  "communications studies and journalism building",
  "richard j. renaud science complex",
  "administration building",
  "central building",
  "loyola jesuit hall and conference centre",
  "f.c. smith building",
  "fc smith building",
  "quadrangle",
  "psychology building",
  "vanier extension",
  "vanier library building",
  "oscar peterson concert hall",
  "student centre",
  "bh annex",
  "bb annex",
  "physical services building",
  "st. ignatius of loyola church",
  "jesuit residence",
  "applied science hub",
  "future buildings laboratory",
  "terrebonne building",
  "terrebone building",
];

export default function CalendarManuallyAdd({ visible, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [roomNumber, setRoomNumber] = useState("");

  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  // autocomplete building name
  const [filteredBuildings, setFilteredBuildings] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const saveEvent = () => {
    const startDateEvent = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    );
    const endDateEvent = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      endTime.getHours(),
      endTime.getMinutes()
    );

    if (endDateEvent <= startDateEvent) {
      alert("End time must be after start time");
      return;
    }
    
    if (!title.trim()) {
      alert("Please enter an event title");
      return;
    }
    if (!location.trim()) {
      alert("Please enter a valid location");
      return;
    }

    const newEvent = {
      id: `manual-${Date.now()}`,
      title,
      location,
      roomNumber: roomNumber.trim() || null,
      startDate: startDateEvent,
      endDate: endDateEvent,
      isManual: true
    };

    onSave(newEvent);
    onClose();

    setTitle("");
    setLocation("");
    setRoomNumber("");
  };

  const handleLocationChange = (text) => {
    setLocation(text);

    if (text.length === 0) {
        setFilteredBuildings([]);
        setShowSuggestions(false);
        return;
    }

    const query = text.toLowerCase();
    
    const matches = buildings
        .filter((b) => {
            const lower = b.toLowerCase();
            return lower.startsWith(query) || lower.includes(` ${query}`);
        })
        .slice(0, 5);

    setFilteredBuildings(matches);
    setShowSuggestions(matches.length > 0);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <TouchableWithoutFeedback
            onPress={() => {
            Keyboard.dismiss();
            setShowSuggestions(false);
            }}
        >
        <View style={styles.container}>

          <Text style={styles.title}>Add Event</Text>

          <TextInput
            placeholder="Event title"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />

          <TextInput
            placeholder="Building Location"
            value={location}
            onChangeText={handleLocationChange}
            style={styles.input}
          />

          <TextInput
            placeholder="Room Number (Optional)"
            value={roomNumber}
            onChangeText={setRoomNumber}
            style={styles.input}
          />

          {showSuggestions && filteredBuildings.length > 0 && (
            <FlatList
              data={filteredBuildings}
              keyExtractor={(item) => item}
              renderItem={({ item: building }) => (
                <Pressable
                  style={styles.suggestionItem}
                  onPress={() => {
                    setLocation(building);
                    setShowSuggestions(false);
                    Keyboard.dismiss();
                  }}
                >
                  <Text>{building}</Text>
                </Pressable>
              )}
              style={styles.suggestionsBox}
              nestedScrollEnabled={true}
              scrollEnabled={true}
            />
          )}

          <Pressable onPress={() => setShowDate(true)} style={styles.selector}>
            <Text>Select Date: {date.toDateString()}</Text>
          </Pressable>

          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              onChange={(e, d) => {
                setShowDate(Platform.OS === "ios");
                if (d) setDate(d);
              }}
            />
          )}

          <Pressable onPress={() => setShowStart(true)} style={styles.selector}>
            <Text>
              Start Time: {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Pressable>

          {showStart && (
            <DateTimePicker
              value={startTime}
              mode="time"
              onChange={(e, d) => {
                setShowStart(Platform.OS === "ios");
                if (d) setStartTime(d);
              }}
            />
          )}

          <Pressable onPress={() => setShowEnd(true)} style={styles.selector}>
            <Text>
              End Time: {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Pressable>

          {showEnd && (
            <DateTimePicker
              value={endTime}
              mode="time"
              onChange={(e, d) => {
                setShowEnd(Platform.OS === "ios");
                if (d) setEndTime(d);
              }}
            />
          )}

          <View style={styles.row}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.btnText}>Cancel</Text>
            </Pressable>

            <Pressable style={styles.save} onPress={saveEvent}>
              <Text style={styles.btnText}>Save</Text>
            </Pressable>
          </View>

        </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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