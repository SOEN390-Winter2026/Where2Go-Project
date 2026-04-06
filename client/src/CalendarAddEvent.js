import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import PropTypes from "prop-types";
import AutocompleteDropdown from "./AutocompleteDropdown"; 
import { filterLocations, getBuildingDisplayName } from "./utils/locationSearch";
import styles from "./styles/CalendarAddEvent_styles";

const closeDelay = 150;

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

function formatTimeInput(raw) {
  const digits = raw.toString().replaceAll(/\D/g, "").slice(0, 4);
  if (digits.length < 4) return digits;
  const firstTwo = Number.parseInt(digits.slice(0, 2), 10);
  if (firstTwo > 23) {
    return `0${digits[0]}:${digits.slice(1, 3)}`;
  }
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function validateDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "Invalid date. Use YYYY-MM-DD format.";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31)
    return "Invalid date. Please use valid numbers and YYYY-MM-DD format.";
  const d = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d < today) return "Invalid date. Cannot add events in the past.";
  return null;
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
  const [dateError, setDateError] = useState(null);

  const [locationInput, setLocationInput] = useState("");
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [roomNumber, setRoomNumber] = useState("");
  const [activeField, setActiveField] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const locationResults = activeField === "location" ? filterLocations(locationInput, []) : [];

  const scheduleClose = () => {
    setTimeout(() => setActiveField((prev) => (prev === "location" ? null : prev)), closeDelay);
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
      return { ok: false };
    }
    const dateValidationError = validateDate(dateStr);
    if (dateValidationError) {
      setDateError(dateValidationError);
      Alert.alert("Invalid date", dateValidationError);
      return { ok: false };
    }
    const start = parseDateTime(dateStr, formatTimeInput(startTimeStr));
    const end = parseDateTime(dateStr, formatTimeInput(endTimeStr));
    if (!start) {
      Alert.alert("Invalid start time", "Please check the start time.");
      return { ok: false };
    }
    if (!end) {
      Alert.alert("Invalid end time", "Please check the end time.");
      return { ok: false };
    }
    if (end <= start) {
      Alert.alert("Invalid time range", "End time must be after start time.");
      return { ok: false };
    }
    if (!selectedCalendarIds?.length) {
      Alert.alert("No calendar selected", "Please select a calendar first.");
      return { ok: false };
    }
    return { ok: true, start, end };
  };

  const handleSave = async () => {
    const { ok, start, end } = validate();
    if (!ok) return;

    setIsSaving(true);
    try {
      const calendarId = selectedCalendarIds[0];
      const building = selectedLocation?.label ?? locationInput.trim();
      const room = roomNumber.trim();
      const locationStr = building && room ? `${building} ${room}` : building ?? "";

      const newEventId = await Calendar.createEventAsync(calendarId, {
        title: title.trim(),
        startDate: start,
        endDate: end,
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView
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
          style={[styles.input, dateError && styles.inputError]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#aaa"
          value={dateStr}
          onChangeText={(v) => { setDateStr(v); setDateError(null); }}
          onBlur={() => {
            const parts = dateStr.split("-");
            const normalized = parts.length === 3 
            && parts[0].length === 4 
            && parts[1] >= 1 && parts[1] <= 12
            && parts[2] >= 1 && parts[2] <= 31
              ? toDateString(new Date(parts[0], parts[1] - 1, parts[2]))
              : dateStr;
            setDateStr(normalized);
            setDateError(validateDate(normalized));
          }}
          keyboardType="numeric"
          maxLength={10}
          returnKeyType="done"
        />
        {dateError && (
          <Text style={styles.errorText}>{dateError}</Text>
        )}

        <Text style={styles.label}>Time</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeFieldWrap}>
            <Text style={styles.timeLabel}>Start</Text>
            <TextInput
              style={[styles.input, styles.timeInput]}
              placeholder="HH:MM, 24h"
              placeholderTextColor="#aaa"
              value={startTimeStr}
              onChangeText={(v) => setStartTimeStr(formatTimeInput(v))}
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
              placeholder="HH:MM, 24h"
              placeholderTextColor="#aaa"
              value={endTimeStr}
              onChangeText={(v) => setEndTimeStr(formatTimeInput(v))}
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
    </KeyboardAvoidingView>
  );
}

CalendarAddEvent.propTypes = {
  selectedCalendarIds: PropTypes.arrayOf(PropTypes.string).isRequired,
  onEventAdded: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
