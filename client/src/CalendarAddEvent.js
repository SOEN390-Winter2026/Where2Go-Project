import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import PropTypes from "prop-types";
import AutocompleteDropdown from "./AutocompleteDropdown"; 
import { filterLocations, getBuildingDisplayName } from "./utils/locationSearch";

function addLead0(n) {
  return String(n).padStart(2, "0");
}

/** Returns "YYYY-MM-DD" for a Date object */
function toDateString(date) {
  return `${date.getFullYear()}-${addLead0(date.getMonth() + 1)}-${addLead0(date.getDate())}`;
}

/** Returns "HH:MM" for a Date object */
function toTimeString(date) {
  return `${addLead0(date.getHours())}:${addLead0(date.getMinutes())}`;
}

/**
 * Parses "YYYY-MM-DD" + "HH:MM" into a JS Date.
 * Returns null if either string is invalid.
 */
function parseDateTime(dateStr, timeStr) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const timeRe = /^\d{2}:\d{2}$/;
  if (!dateRe.test(dateStr) || !timeRe.test(timeStr)) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function CalendarAddEvent({
  selectedCalendarIds,
  onEventAdded,
  onCancel,
}) {
  const today = new Date();
  const roundedStart = new Date(today);
  roundedStart.setMinutes(Math.ceil(today.getMinutes() / 30) * 30, 0, 0);
  const roundedEnd = new Date(roundedStart.getTime() + 75 * 60 * 1000);

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(toDateString(today));
  const [startTimeStr, setStartTimeStr] = useState(toTimeString(roundedStart));
  const [endTimeStr, setEndTimeStr] = useState(toTimeString(roundedEnd));

  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const locationResults = activeField === "location" ? filterLocations(locationInput, []) : [];

  const scheduleClose = () => {
    setTimeout(() => setActiveField((prev) => (prev === "location" ? null : prev)), 150);
  };

  const pickLocation = (loc) => {
    const cleanLabel = getBuildingDisplayName(loc.label);
    setSelectedLocation({ label: cleanLabel, lat: loc.lat, lng: loc.lng });
    setLocationInput(cleanLabel);
    setActiveField(null);
  };

  const clearLocation = () => {
    setLocationInput("");
    setSelectedLocation(null);
  };

  const validate = () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter an event title.");
      return false;
    }
    const start = parseDateTime(dateStr, startTimeStr);
    const end = parseDateTime(dateStr, endTimeStr);
    if (!start) {
      Alert.alert("Invalid date/time", "Please check the date and start time.");
      return false;
    }
    if (!end) {
      Alert.alert("Invalid end time", "Please check the end time.");
      return false;
    }
    if (end <= start) {
      Alert.alert("Invalid time range", "End time must be after start time.");
      return false;
    }
    if (!selectedCalendarIds?.length) {
      Alert.alert("No calendar selected", "Please select a calendar first.");
      return false;
    }
    return { start, end };
  };

  const handleSave = async () => {
    const times = validate();
    if (!times) return;

    setIsSaving(true);
    try {
      const calendarId = selectedCalendarIds[0];
      const building = selectedLocation?.label ?? locationInput.trim();
      const room = roomNumber.trim();
      const locationStr = building && room ? `${building} ${room}` : building ?? "";

      const newEventId = await Calendar.createEventAsync(calendarId, {
        title: title.trim(),
        startDate: times.start,
        endDate: times.end,
        location: locationStr,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      const savedEvent = await Calendar.getEventAsync(newEventId);
      onEventAdded(savedEvent);
    } catch (err) {
      console.error("Failed to create event:", err);
      Alert.alert("Error", "Could not save the event. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>New Event</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="Event title"
          placeholderTextColor="#aaa"
          value={title}
          onChangeText={setTitle}
          returnKeyType="done"
        />

        <Text style={styles.label}>Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#aaa"
          value={dateStr}
          onChangeText={setDateStr}
          keyboardType="numeric"
          maxLength={10}
          returnKeyType="done"
        />

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeFieldWrap}>
            <Text style={styles.timeLabel}>Start</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
              placeholderTextColor="#aaa"
              value={startTimeStr}
              onChangeText={setStartTimeStr}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="done"
            />
          </View>

          <Ionicons name="arrow-forward" size={18} color="#888" style={styles.timeArrow} />

          <View style={styles.timeFieldWrap}>
            <Text style={styles.timeLabel}>End</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM"
              placeholderTextColor="#aaa"
              value={endTimeStr}
              onChangeText={setEndTimeStr}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="done"
            />
          </View>
        </View>

        <Text style={styles.label}>Location</Text>
        <View style={[styles.locationWrap, { zIndex: activeField === "location" ? 20 : 1 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Search Concordia building…"
              placeholderTextColor="#aaa"
              value={locationInput}
              onChangeText={(text) => {
                setLocationInput(text);
                setSelectedLocation(null);
                setActiveField("location");
              }}
              onFocus={() => setActiveField("location")}
              onBlur={() => scheduleClose()}
              returnKeyType="done"
            />
            {locationInput.length > 0 && (
              <Pressable onPress={clearLocation} hitSlop={8} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </Pressable>
            )}
          </View>

          <AutocompleteDropdown
            results={locationResults}
            visible={activeField === "location" && locationResults.length > 0}
            onSelect={pickLocation}
            formatLabel={getBuildingDisplayName}
            iconName="business-outline"
            iconColor="#912338"
          />
        </View>

        <TextInput
          style={[styles.input, styles.roomInput]}
          placeholder="Room number (optional)"
          placeholderTextColor="#aaa"
          value={roomNumber}
          onChangeText={setRoomNumber}
          returnKeyType="done"
        />

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </Pressable>

          <Pressable
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveTxt}>{isSaving ? "Saving…" : "Save Event"}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

CalendarAddEvent.propTypes = {
  selectedCalendarIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEventAdded: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: "#912338",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 36,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  form: {
    padding: 20,
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 16,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#222",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  timeFieldWrap: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  timeInput: {
    textAlign: "center",
  },
  timeArrow: {
    marginBottom: 14,
  },
  locationWrap: {
    position: "relative",
  },
  roomInput: {
    marginTop: 8,
  },
  clearBtn: {
    marginLeft: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#912338",
    alignItems: "center",
  },
  cancelTxt: {
    color: "#912338",
    fontSize: 15,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#912338",
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveTxt: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});