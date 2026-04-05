import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
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
import { parseEventLocation } from './utils/eventLocationParser';
import { getValidCalendarIds, fetchCalendarsIfPermitted } from './utils/calendarUtils';
import CalendarAddEvent from "./CalendarAddEvent";
import styles from "./styles/CalendarPage_styles";


WebBrowser.maybeCompleteAuthSession();

const SAVED_CALENDAR_IDS_KEY = "where2go_saved_calendar_ids";
const { height } = Dimensions.get("window");

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
  return loc || "Location not specified";
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

function toDateString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Put the current/next event first when viewing today's list. */
function reorderEventsWithNextUpFirst(dayEvents, selectedDateString) {
  if (selectedDateString !== todayString()) return dayEvents;
  const now = new Date();
  const nextIndex = dayEvents.findIndex((e) => new Date(e.endDate) > now);
  if (nextIndex < 0) return dayEvents;
  const nextEvent = dayEvents[nextIndex];
  const otherEvents = dayEvents.filter((_, i) => i !== nextIndex);
  return [nextEvent, ...otherEvents];
}

const calendarEventPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  title: PropTypes.string,
  startDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  endDate: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  location: PropTypes.string,
});

function NotConnectedCalendarPlaceholder({ isRestoring }) {
  if (isRestoring) {
    return (
      <View style={styles.noCalContainer}>
        <Text style={styles.txtNoCal}>Loading…</Text>
      </View>
    );
  }
  return (
    <View style={styles.noCalContainer}>
      <Image
        testID="calendar-icon"
        source={require("../assets/calendar.png")}
        style={styles.calendar}
      />
      <Text style={styles.txtNoCal}>No Calendar Yet</Text>
    </View>
  );
}

NotConnectedCalendarPlaceholder.propTypes = {
  isRestoring: PropTypes.bool,
};

function promptDirectionsForEvent(event, parsed, onGenerateDirections) {
  if (!onGenerateDirections) return;
  if (!parsed?.building) {
    console.log("Event location is missing or not a Concordia building. Skipping directions.");
    Alert.alert(
      "Cannot Generate Directions",
      "This event has no location or the location is not a Concordia building.",
      [{ text: "OK" }]
    );
    return;
  }
  onGenerateDirections({
    event,
    buildingCode: parsed.building,
    room: parsed.room ?? null,
    rawLocation: event.location ?? null,
  });
}

function CalendarEventRow({ event, index, selectedDate, onGenerateDirections, onLocateRoom }) {
  const { day, mon } = getDatePartsFromEvent(event);
  const timeRange = formatTimeRange(event);
  const now = new Date();
  const isViewingToday = selectedDate === todayString();
  const isNextEvent = isViewingToday && index === 0 && new Date(event.endDate) > now;
  const parsed = parseEventLocation(event.location);
  const hasValidBuilding = parsed?.building;

  return (
    <Pressable
      testID={`event-item-${event.id}`}
      style={styles.eventRow}
      onPress={() => promptDirectionsForEvent(event, parsed, onGenerateDirections)}
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

        <Text style={styles.eventTime}>{timeRange}</Text>

        {isNextEvent ? (
          <View style={styles.nextEventTag}>
            <Text style={styles.nextEventTagText}>Coming up</Text>
          </View>
        ) : null}
        <Text numberOfLines={1} style={styles.eventLoc}>
          {getLocation(event)}
        </Text>
      </View>

      {hasValidBuilding && onLocateRoom && (
        <Pressable
          testID={`locate-room-btn-${event.id}`}
          onPress={(e) => {
            e.stopPropagation();
            onLocateRoom({
              event,
              buildingCode: parsed.building,
              room: parsed.room ?? null,
            });
          }}
          style={{ marginRight: 8, padding: 8 }}
          accessibilityLabel="Locate room in building"
        >
          <Ionicons name="location" size={20} color="#912338" />
        </Pressable>
      )}

      <Ionicons name="chevron-forward" size={18} color="#888" />
    </Pressable>
  );
}

CalendarEventRow.propTypes = {
  event: calendarEventPropType.isRequired,
  index: PropTypes.number.isRequired,
  selectedDate: PropTypes.string.isRequired,
  onGenerateDirections: PropTypes.func,
  onLocateRoom: PropTypes.func,
};

export default function CalendarPage({ onPressBack, onGenerateDirections, onLocateRoom }) {
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

  const [showAddEvent, setShowAddEvent] = useState(false);

  const handleEventAdded = (newEvent) => {
    const eventDateStr = toDateString(new Date(newEvent.startDate));
    if (eventDateStr === selectedDate) {
      setEvents((prev) =>
        [...prev, newEvent].sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      );
    }
    setShowAddEvent(false);
  };

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
      setEvents(reorderEventsWithNextUpFirst(dayEvents, selectedDateString));
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

        const allCalendars = await fetchCalendarsIfPermitted();
        if (!allCalendars) {
          setIsRestoring(false);
          return;
        }

        const validIds = getValidCalendarIds(savedIds, allCalendars);

        if (!cancelled && validIds.length > 0) {
          setCalendars(allCalendars);
          setSelectedCalendarIds(validIds);
          setIsCalendarConnected(true);
          setIsCalendarsChosen(true);
        }
      } catch (e) {
        console.error("Failed to restore calendar settings:", e);
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

  const handleMonthChange = (month) => {
    const monthStr = month.dateString.slice(0, 7);
    const todayStr = todayString();
    if (todayStr.startsWith(monthStr)) {
      getEventsForDay(todayStr);
    }
  };

  const chosenCalendars = calendars.filter((c) => selectedCalendarIds.includes(c.id));
  const markedDates = {
    [selectedDate]: { selected: true, selectedColor: "#912338" },
  };

  if (showAddEvent) {
    return (
      <CalendarAddEvent
        selectedCalendarIds={selectedCalendarIds}
        onEventAdded={handleEventAdded}
        onCancel={() => setShowAddEvent(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="pressBack" style={styles.headerBtn} onPress={onPressBack}>
          <Ionicons name="arrow-back" size={26} color="white" />
        </Pressable>
      </View>

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
                  onVisibleMonthsChange={(months) => { if (months?.[0]) handleMonthChange(months[0]); }}
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
                  onMonthChange={handleMonthChange}
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
              <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 140 }}>
                {events.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyTitle}>No events for this day</Text>
                    <Text style={styles.emptySub}>Select another date to view events.</Text>
                  </View>
                ) : (
                  events.map((event, index) => (
                    <CalendarEventRow
                      key={event.id}
                      event={event}
                      index={index}
                      selectedDate={selectedDate}
                      onGenerateDirections={onGenerateDirections}
                      onLocateRoom={onLocateRoom}
                    />
                  ))
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
                  onPress={() => { }}
                >
                  <View style={styles.selectedCalsHeader}>
                    <Text style={styles.selectedCalsTitle} testID="selectedCalendarsModalTitle">Selected Calendars</Text>

                    <Pressable
                      testID="selectedCalsCloseBtn"
                      onPress={() => setSelectedCalsModalVisible(false)}
                    >
                      <Ionicons name="close" size={20} color="#333" />
                    </Pressable>
                  </View>

                  <ScrollView
                    style={styles.selectedCalsList}
                    showsVerticalScrollIndicator={false}
                  >
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
                  </ScrollView>

                  <View style={styles.modalActions}>
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
                    <Pressable
                      testID="selectedCalsDisconnectBtn"
                      style={styles.disconnectBtn}
                      onPress={async () => {
                        setSelectedCalsModalVisible(false);
                        try {
                          await AsyncStorage.removeItem(SAVED_CALENDAR_IDS_KEY);
                        } catch (e) {
                          console.error("Failed to clear saved calendar IDs:", e);
                        }
                        setCalendars([]);
                        setSelectedCalendarIds([]);
                        setIsCalendarConnected(false);
                        setIsCalendarsChosen(false);
                      }}
                    >
                      <Text style={styles.disconnectBtnTxt}>Disconnect</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          </View>
        );
    } else {
      calendarMainPanel = (
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
                      const idsToSave = selectedCalendarIds.map(String);
                      await AsyncStorage.setItem(
                        SAVED_CALENDAR_IDS_KEY,
                        JSON.stringify(idsToSave)
                      );
                    } catch (e) {
                      console.error("Error saving calendar IDs to storage:", e);
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
        );
    }
  } else {
    calendarMainPanel = (
        <NotConnectedCalendarPlaceholder isRestoring={isRestoring} />
    );
  }

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

      {calendarMainPanel}

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

            <Pressable
              testID="manualAddBtn"
              style={styles.manualBtn}
              onPress={() => {
                close();
                setShowAddEvent(true);
              }}
            >
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
  onPressCalendar: PropTypes.func,
  title: PropTypes.string,
  onGenerateDirections: PropTypes.func,
  onLocateRoom: PropTypes.func,
};
