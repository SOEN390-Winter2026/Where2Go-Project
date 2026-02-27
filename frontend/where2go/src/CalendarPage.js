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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from 'expo-web-browser';
import * as Calendar from 'expo-calendar';
import Checkbox from 'expo-checkbox';
import { Calendar as CalendarUI } from 'react-native-calendars';
import PropTypes from 'prop-types';

WebBrowser.maybeCompleteAuthSession();

const { height, width } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.6;

export default function CalendarPage({ onPressBack }) {

    const [visible, setVisible] = useState(false);
    const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    const [isCalendarConnected, setIsCalendarConnected] = useState(false);

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
                if (gesture.dy > 0) {
                    translateY.setValue(gesture.dy);
                }
            },

            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > 120) {
                    close();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    //Sign In Google Calendar
    const getCalendars = async () => {

        const { status } = await Calendar.requestCalendarPermissionsAsync();

        let calendars = [];


        if (status === 'granted') {
            calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            setCalendars(calendars);
            console.log("Permission granted. Calendars retrieved!");
        } else {
            console.log("Permission denied for calendar");
        }


    };

    const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
    const [isCalendarsChosen, setIsCalendarsChosen] = useState(false);

    //For Checkboxes
    const toggleCalendar = (id) => {
        setSelectedCalendarIds((prev) =>
            prev.includes(id)
                ? prev.filter((calId) => calId !== id) // Remove if already there
                : [...prev, id] // Add if not there
        );
    };

    //Retrieve events based on the day and selected Calendars
    const getEventsForDay = async (selectedDateString) => {
        const start = new Date(selectedDateString);
        start.setHours(0, 0, 0, 0);

        const end = new Date(selectedDateString);
        end.setHours(23, 59, 59, 999);

        try {
            const dayEvents = await Calendar.getEventsAsync(
                selectedCalendarIds,
                start,
                end
            );

            setEvents(dayEvents);
        } catch (e) {
            console.error(e);
        }
    };

    const [events, setEvents] = useState([]);
    const [calendars, setCalendars] = useState([]);

    useEffect(() => {
        console.log(calendars.map(calendar => calendar.title));
        if (calendars.length === 0){
            setIsCalendarConnected(false);
        } else {
            setIsCalendarConnected(true);
            close();
        }
        
    }, [calendars]);

    useEffect(() => {
        console.log(events.map(event => event.title));

    }, [events])

    useEffect(() => {
        console.log(selectedCalendarIds);

    }, [selectedCalendarIds]);

    return (
        <View style={styles.container}>
            <Pressable testID="pressBack" style={styles.backBtn} onPress={onPressBack}>
                <Ionicons name="arrow-back" size={26} color="white" />
            </Pressable>
            <Pressable testID="openModalBtn" style={styles.buttonModalUp} onPress={open}>
                <Ionicons name="arrow-up" size={26} color="white" />
            </Pressable>

            {isCalendarConnected ? (
                isCalendarsChosen ? (
                    <View style={styles.eventListContainer}>
                        {/* To modify: - display full info of events, choices to select specific calendars to display, option to display full calenday view (to research more) 
                        - styles must also be modified to beautify the page
                        - if no selected event, give a warning
                        - still not implemented: option to add events manually
                        - make caledar button invisible if calendar is already connected, or change it to "add more calendars" and make it open the calendar selection view again
                    */}
                        <CalendarUI
                            testID="mock-calendar"
                            onDayPress={(day) => {
                                console.log('User selected:', day.dateString);
                                getEventsForDay(day.dateString);
                            }}
                        />
                        <Text> Upcoming Events: </Text>
                        {events.map((event) => (
                            <Pressable
                                key={event.id}
                                testID={`event-item-${event.id}`}
                                style={styles.btnEvent}
                            >
                                <Text> {event.title}</Text>
                            </Pressable>
                        ))}
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
                                onPress={() => setIsCalendarsChosen(selectedCalendarIds.length > 0)}
                            >
                                <Text testID="saveBtn" style={styles.btnTxt}>Done</Text>
                            </Pressable>
                        </View>
                    </>
                )
            ) : (
                <Text style={styles.txtNoCal}> No Calendar Yet </Text>
            )}

            <Modal transparent visible={visible} animationType="none">
                <View style={styles.overlay}>
                    <Animated.View
                        testID="bottom-sheet-view"
                        style={[
                            styles.sheet,
                            { transform: [{ translateY }] },
                        ]}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.handle} />
                        <Pressable testID="closeModalBtn" style={styles.closeBtn} onPress={() => setVisible(false)}><Ionicons name="close" size={26} color="black" /></Pressable>
                        <Pressable testID="calBtn" style={styles.googleCalBtn} onPress={() => getCalendars()}><Text style={styles.btnTxt}>Connect to Google Calendar</Text></Pressable>
                        {/**Still not implemented */}
                        <Pressable style={styles.manualBtn}><Text style={styles.btnTxt}>Manually Add Events</Text></Pressable>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

CalendarPage.propTypes = {
    onPressBack: PropTypes.func.isRequired,
    onPressCalendar: PropTypes.func.isRequired,
    title: PropTypes.string,
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "white",
    },
    buttonModalUp: {
        backgroundColor: "#912338",
        padding: 12,
        borderRadius: 50,
        position: "absolute",
        bottom: 15,
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
    backBtn: {
        backgroundColor: "#912338",
        position: "absolute",
        top: 50,
        left: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 12,
    },
    txtNoCal: {
        fontSize: 30,
        position: "absolute",
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
    googleCalBtn: {
        backgroundColor: "#912338",
        padding: 12,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
    },
    titleView: {
        position: "absolute",
        backgroundColor: "#912338",
        width: width,
        height: height * 0.3,
        top: 0,
        zIndex: 11,
        justifyContent: "center",
        alignItems: "center",

    },
    txtTitle: {
        color: "white",
        bottom: 10,
        position: "absolute",
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Helvetica Neue',

    },
    selectCalView: {
        position: "absolute",
        top: height * 0.35,

    },
    txtSelectCal: {
        fontSize: 18,
        fontWeight: '700', 
        fontFamily: 'Helvetica Neue',
        marginBottom: 10,
    },
    checkboxRow: {
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 10,     
        paddingHorizontal: 15,
    },
    checkboxLabel: {
        marginLeft: 10,       
        fontSize: 16,
    },
    saveBtn: {
        backgroundColor: '#912338',
        padding: 15,
        borderRadius: 10,
        marginTop: 50,
        alignItems: 'center',
    },
    btnTxt: {
        color: 'white',
        fontWeight: 'bold',
    },
    eventListContainer: {
        position: "absolute",
        top: height * 0.1
    },
    closeBtn: {
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 12,
    },
});