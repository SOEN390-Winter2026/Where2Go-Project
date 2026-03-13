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
import { styles } from "./styles/CalendarManuallyAdd_styles";
import DateTimePicker from "@react-native-community/datetimepicker";

const buildings = [
  // SGW
  "Hall Building",
  "McConnell Building",
  "Visual Arts Building",
  "Engineering & Visual Arts",
  "Grey Nuns Building",
  "Faubourg Building (FG)",
  "CL Annex Building",
  "Toronto-Dominion Building",
  "John Molson School of Business (JMSB)",
  "Guy-de Maisonneuve Building",
  "Learning Square Building",
  "ER Building",
  "GS Building",
  "Samuel Bronfman Building",
  "Q Annex",
  "P Annex",
  "T Annex",
  "RR Annex",
  "R Annex",
  "FA Annex",
  "EN Annex",
  "X Annex",
  "Z Annex",
  "PR Annex",
  "V Annex",
  "M Annex",
  "S Annex",
  "CI Annex",
  "MI Annex",
  "D Annex",
  "B Annex",
  "K Annex",
  "MU Annex",
  // Loyola
  "Stinger Dome Building",
  "PERFORM Centre",
  "Recreation and Athletics Complex",
  "Centre for Structural and Functional Genomics",
  "Communications Studies and Journalism Building",
  "Richard J. Renaud Science Complex",
  "Administration Building",
  "Central Building",
  "Loyola Jesuit Hall and Conference Centre",
  "F.C. Smith Building",
  "Quadrangle",
  "Psychology Building",
  "Vanier Extension",
  "Vanier Library Building",
  "Oscar Peterson Concert Hall",
  "Student Centre",
  "BH Annex",
  "BB Annex",
  "Physical Services Building",
  "St. Ignatius of Loyola Church",
  "Jesuit Residence",
  "Applied Science Hub",
  "Hingston Hall, wing HB",
  "Future Buildings Laboratory",
  "Terrebone Building",
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
