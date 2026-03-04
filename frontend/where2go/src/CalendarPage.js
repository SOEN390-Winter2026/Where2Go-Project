import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  Image,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Calendar from "expo-calendar";
import Checkbox from "expo-checkbox";
import { Calendar as CalendarUI, CalendarList } from "react-native-calendars";
import PropTypes from "prop-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseEventLocation } from './utils/eventLocationParser'; // location string → { building, room }

WebBrowser.maybeCompleteAuthSession();

const SAVED_CALENDAR_IDS_KEY = "where2go_saved_calendar_ids";
const { height, width } = Dimensions.get("window");

function getValidCalendarIds(savedIds, allCalendars) {
    const idSet = new Set(allCalendars.map((c) => String(c.id)));
    return savedIds.filter((id) => idSet.has(String(id)));
}

async function fetchCalendarsIfPermitted() {
    try {
        return await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    } catch {
        return null;
    }
}
const SHEET_HEIGHT = height * 0.6;

function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthShort(monthIndex0) {
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return months[monthIndex0] || "";
}
function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function getDatePartsFromEvent(event) {
  const d = event?.startDate ? new Date(event.startDate) : new Date();
  return { day: pad2(d.getDate()), mon: monthShort(d.getMonth()) };
}
function getLocation(event) {
  const loc = event?.location && String(event.location).trim();
  return loc ? loc : "Location not specified";
}
function formatTime(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatTimeRange(event) {
  const start = event?.startDate ? formatTime(event.startDate) : "";
  const end = event?.endDate ? formatTime(event.endDate) : "";
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return "Time not specified";
}

export default function CalendarPage({ onPressBack }) {
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const open = () => {
    setVisible(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const close = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 120) close();
        else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [isCalendarsChosen, setIsCalendarsChosen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  const [events, setEvents] = useState([]);

  const [isFullCalendarView, setIsFullCalendarView] = useState(false);
  const [selectedCalsModalVisible, setSelectedCalsModalVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState(todayString());

  const getCalendars = async () => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      const calList = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      setCalendars(calList);
      setIsCalendarsChosen(false);
      console.log("Permission granted. Calendars retrieved!");
    } else {
      Alert.alert(
        "Calendar Access Required",
        status === "denied"
          ? "Calendar access was previously denied. To connect your calendar, enable it in Settings."
          : "Calendar access is needed to show your events.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => { Linking.openSettings(); } },
        ]
      );
    }
  };

  const toggleCalendar = (id) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((calId) => calId !== id) : [...prev, id]
    );
  };

  const getEventsForDay = async (selectedDateString) => {
    setSelectedDate(selectedDateString);

    if (!selectedCalendarIds.length) {
      setEvents([]);
      return;
    }

    const [year, month, day] = selectedDateString.split("-").map(Number);
    const start = new Date(year, month - 1, day, 0, 0, 0, 0);
    const end = new Date(year, month - 1, day, 23, 59, 59, 999);

    try {
      const dayEvents = await Calendar.getEventsAsync(selectedCalendarIds, start, end);
      dayEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setEvents(dayEvents);
    } catch (e) {
      console.error(e);
      setEvents([]);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function restoreSavedCalendars() {
      try {
        const saved = await AsyncStorage.getItem(SAVED_CALENDAR_IDS_KEY);
        if (!saved) {
          setIsRestoring(false);
          return;
        }

        const savedIds = JSON.parse(saved);
        if (!Array.isArray(savedIds) || savedIds.length === 0) {
          setIsRestoring(false);
          return;
        }

        let allCalendars;
        try {
          allCalendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        } catch (permErr) {
          setIsRestoring(false);
          return;
        }

        const validIds = savedIds.filter((id) =>
          allCalendars.some((c) => String(c.id) === String(id))
        );

        if (!cancelled && validIds.length > 0) {
          setCalendars(allCalendars);
          setSelectedCalendarIds(validIds);
          setIsCalendarConnected(true);
          setIsCalendarsChosen(true);
        }
      } catch (e) {
        // AsyncStorage can fail in Expo Go/web
      } finally {
        if (!cancelled) setIsRestoring(false);
      }
    }

    restoreSavedCalendars();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (calendars.length === 0) {
      setIsCalendarConnected(false);
    } else {
      setIsCalendarConnected(true);
      close();
    }
  }, [calendars]);
  useEffect(() => {
    console.log("CalendarPage events:", events.map(event => event.title));
        // Turn each event’s location string into { building, room } for nav/routing later
    const parsedLocations = events.map((e) => parseEventLocation(e.location));
    console.log("CalendarPage parsed locations:", parsedLocations);
  }, [events]);

  useEffect(() => {
    if (isCalendarConnected && isCalendarsChosen) {
      getEventsForDay(selectedDate || todayString());
    }
  }, [isCalendarConnected, isCalendarsChosen, selectedCalendarIds]);

  const chosenCalendars = calendars.filter((c) => selectedCalendarIds.includes(c.id));
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: "#912338" },
  };

  const notConnectedView = isRestoring ? (
    <View style={styles.noCalContainer}>
      <Text style={styles.txtNoCal}>Loading…</Text>
    </View>
  ) : (
    <View style={styles.noCalContainer}>
      <Image
        testID="calendar-icon"
        source={require("../assets/calendar.png")}
        style={styles.calendar}
      />
      <Text style={styles.txtNoCal}>No Calendar Yet</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="pressBack" style={styles.headerBtn} onPress={onPressBack}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>
      </View>

      {/* Arrow-up bottom sheet button */}
      <Pressable testID="openModalBtn" style={styles.buttonModalUp} onPress={open}>
        <Ionicons name="arrow-up" size={26} color="white" />
      </Pressable>

      {isCalendarConnected ? (
        isCalendarsChosen ? (
          <View style={styles.pageWrap}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarTopRow}>
                <Pressable
                  style={styles.iconBtn}
                  onPress={() => setSelectedCalsModalVisible(true)}
                  accessibilityLabel="Selected calendars"
                >
                  <Ionicons name="menu" size={18} color="#555" />
                </Pressable>

                <Pressable
                  style={styles.iconBtn}
                  onPress={() => setIsFullCalendarView((v) => !v)}
                  accessibilityLabel="Toggle full calendar view"
                >
                  <Ionicons
                    name={isFullCalendarView ? "contract-outline" : "calendar-outline"}
                    size={18}
                    color="#555"
                  />
                </Pressable>
              </View>

              {isFullCalendarView ? (
                <CalendarList
                  testID="full-calendar-list"
                  current={selectedDate}
                  pastScrollRange={12}
                  futureScrollRange={12}
                  scrollEnabled
                  showScrollIndicator={false}
                  onDayPress={(day) => getEventsForDay(day.dateString)}
                  markedDates={markedDates}
                  theme={{
                    arrowColor: "#18A0FB",
                    todayTextColor: "#18A0FB",
                  }}
                />
              ) : (
                <CalendarUI
                  testID="mock-calendar"
                  onDayPress={(day) => getEventsForDay(day.dateString)}
                  markedDates={markedDates}
                  theme={{
                    arrowColor: "#18A0FB",
                    todayTextColor: "#18A0FB",
                  }}
                />
              )}
            </View>

            <Text style={styles.upcomingTitle}>Upcoming Events</Text>

            <View style={styles.upcomingBox}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {events.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>No events for this day</Text>
                    <Text style={styles.emptySub}>Select another date to view events.</Text>
                  </View>
                ) : (
                  events.map((event) => {
                    const { day, mon } = getDatePartsFromEvent(event);
                    const timeRange = formatTimeRange(event);

                    return (
                      <Pressable
                        key={event.id}
                        testID={`event-item-${event.id}`}
                        style={styles.eventRow}
                        onPress={() => console.log("Selected event:", event.title)}
                      >
                        <View style={styles.leftAccent} />

                        <View style={styles.dateCol}>
                          <Text style={styles.dateDay}>{day}</Text>
                          <Text style={styles.dateMonth}>{mon}</Text>
                        </View>

                        <View style={styles.eventInfo}>
                          <Text numberOfLines={1} style={styles.eventName}>
                            {event.title || "Untitled"}
                          </Text>

                          {/* show timing */}
                          <Text style={styles.eventTime}>{timeRange}</Text>

                          <Text style={styles.eventMeta}>Next class</Text>
                          <Text numberOfLines={1} style={styles.eventLoc}>
                            {getLocation(event)}
                          </Text>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="#888" />
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <Modal
              testID="selectedCalsModal"
              transparent
              visible={selectedCalsModalVisible}
              animationType="fade"
              onRequestClose={() => setSelectedCalsModalVisible(false)}
            >
              <Pressable
                testID="selectedCalsOverlay"
                style={styles.modalOverlay}
                onPress={() => setSelectedCalsModalVisible(false)}
              >
                <Pressable
                  testID="selectedCalsContent"
                  style={styles.selectedCalsModal}
                  onPress={() => {}}
                >
                  <View style={styles.selectedCalsHeader}>
                    <Text style={styles.selectedCalsTitle}>Selected Calendars</Text>

                    <Pressable
                      testID="selectedCalsCloseBtn"
                      onPress={() => setSelectedCalsModalVisible(false)}
                    >
                      <Ionicons name="close" size={20} color="#333" />
                    </Pressable>
                  </View>

                  {chosenCalendars.length === 0 ? (
                    <Text style={styles.selectedCalsEmpty}>
                      No calendars selected. Tap "Change" to choose calendars.
                    </Text>
                  ) : (
                    chosenCalendars.map((cal) => (
                      <View key={cal.id} style={styles.calRow}>
                        <View
                          style={[
                            styles.colorDot,
                            { backgroundColor: cal.color || "#912338" },
                          ]}
                        />
                        <Text style={styles.calName} numberOfLines={1}>
                          {cal.title}
                        </Text>
                      </View>
                    ))
                  )}

                  <Pressable
                    testID="selectedCalsChangeBtn"
                    style={styles.changeBtn}
                    onPress={() => {
                      setSelectedCalsModalVisible(false);
                      setIsCalendarsChosen(false);
                    }}
                  >
                    <Text style={styles.changeBtnTxt}>Change</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        ) : (
          <>
            <View style={styles.titleView}>
              <Text style={styles.txtTitle}> Extracting Calendars</Text>
            </View>

            <View style={styles.selectCalView}>
              <Text style={styles.txtSelectCal}>Select Desired Calendars to Extract</Text>

              {calendars.map((calendar) => (
                <View key={calendar.id} style={styles.checkboxRow}>
                  <Checkbox
                    testID={`checkbox-${calendar.id}`}
                    value={selectedCalendarIds.includes(calendar.id)}
                    onValueChange={() => toggleCalendar(calendar.id)}
                    color={calendar.color}
                  />
                  <Text style={styles.checkboxLabel}>{calendar.title}</Text>
                </View>
              ))}

              <Pressable
                style={styles.saveBtn}
                onPress={async () => {
                  if (selectedCalendarIds.length > 0) {
                    try {
                      const idsToSave = selectedCalendarIds.map((id) => String(id));
                      await AsyncStorage.setItem(
                        SAVED_CALENDAR_IDS_KEY,
                        JSON.stringify(idsToSave)
                      );
                    } catch (e) {
                      // AsyncStorage can fail in Expo Go/web
                    }
                  }
                  setIsCalendarsChosen(true);
                }}
              >
                <Text testID="saveBtn" style={styles.btnTxt}>
                  Done
                </Text>
              </Pressable>
            </View>
          </>
        )
      ) : (
        notConnectedView
      )}

      <Modal transparent visible={visible} animationType="none">
        <View style={styles.overlay}>
          <Animated.View
            testID="bottom-sheet-view"
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />

            <Pressable
              testID="closeModalBtn"
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
            >
              <Ionicons name="close" size={26} color="black" />
            </Pressable>

            <Pressable testID="calBtn" style={styles.googleCalBtn} onPress={getCalendars}>
              <Text style={styles.btnTxt}>Connect to Google Calendar</Text>
            </Pressable>

            {/* not implemented yet*/}
            <Pressable style={styles.manualBtn}>
              <Text style={styles.btnTxt}>Manually Add Events</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

CalendarPage.propTypes = {
  onPressBack: PropTypes.func.isRequired,
};

/* Styles CSS*/
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 100,
    backgroundColor: "#912338",
    paddingTop: 35,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  buttonModalUp: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    position: "absolute",
    bottom: 25,
    right: 15,
    justifyContent: "center",
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    justifyContent: "center",
    flexDirection: "column",
    gap: 20,
  },
  handle: {
    width: 50,
    height: 6,
    backgroundColor: "#ccc",
    borderRadius: 10,
    alignSelf: "center",
    position: "absolute",
    top: 10,
    marginBottom: 15,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 12,
  },

  googleCalBtn: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  manualBtn: {
    backgroundColor: "#912338",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTxt: { color: "white", fontWeight: "bold" },

  calendar: {
    width: 150,
    height: 150,
    marginBottom: 10,
    borderRadius: 45,
  },
  txtNoCal: { fontSize: 30, fontWeight: "700" },
  noCalContainer: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 220,
  },

  titleView: {
    backgroundColor: "#912338",
    width: width,
    justifyContent: "center",
    alignItems: "center",
  },
  txtTitle: {
    color: "white",
    fontSize: 18,
    bottom: 30,
    fontWeight: "800",
    fontFamily: "Helvetica Neue",
  },
  selectCalView: {
    flex: 1,
    width: "100%",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  txtSelectCal: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Helvetica Neue",
    marginBottom: 10,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  checkboxLabel: { marginLeft: 10, fontSize: 16 },
  saveBtn: {
    backgroundColor: "#912338",
    padding: 15,
    borderRadius: 10,
    marginTop: 50,
    alignItems: "center",
  },

  /* -------- Calendar page -------- */
  pageWrap: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 18,
  },
  calendarCard: {
    borderWidth: 1,
    borderColor: "#E9E9E9",
    borderRadius: 16,
    backgroundColor: "#fff",
    padding: 10,
  },
  calendarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  upcomingTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  upcomingBox: {
    borderWidth: 1,
    borderColor: "#E9E9E9",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    maxHeight: height * 0.36,
  },

  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingRight: 6,
    borderRadius: 10,
  },
  leftAccent: {
    width: 3,
    height: "70%",
    backgroundColor: "#912338",
    borderRadius: 4,
    marginRight: 10,
    marginLeft: 6,
  },
  dateCol: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "900",
    color: "#912338",
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: "900",
    color: "#912338",
    marginTop: 2,
  },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 14, fontWeight: "900", color: "#111" },
  eventTime: {
    marginTop: 2,
    fontSize: 12,
    color: "#333",
    fontWeight: "800",
  },
  eventMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
    fontWeight: "700",
  },
  eventLoc: {
    marginTop: 2,
    fontSize: 12,
    color: "#444",
    fontWeight: "700",
  },

  emptyWrap: { padding: 12 },
  emptyTitle: { fontWeight: "900", fontSize: 13, color: "#111" },
  emptySub: { marginTop: 4, color: "#666", fontWeight: "600" },

  /* -------- Selected calendars modal -------- */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  selectedCalsModal: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E9E9E9",
  },
  selectedCalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  selectedCalsTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
  },
  selectedCalsEmpty: {
    color: "#666",
    fontWeight: "700",
    marginVertical: 6,
  },
  calRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  calName: {
    flex: 1,
    fontWeight: "800",
    color: "#222",
  },
  changeBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: "#912338",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  changeBtnTxt: {
    color: "#fff",
    fontWeight: "900",
  },
});

