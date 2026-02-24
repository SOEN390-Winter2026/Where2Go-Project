import React, { use, useRef, useState } from "react";
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

const { height } = Dimensions.get("window");
const SHEET_HEIGHT = height * 0.6;
const PEEK_HEIGHT = 80;

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

    return (
        <View style={styles.container}>
            <Pressable testID="pressBack" style={styles.backBtn} onPress={onPressBack}>
                <Ionicons name="arrow-back" size={26} color="white" />
            </Pressable>
            <Pressable style={styles.buttonModalUp} onPress={open}>
                <Ionicons name="arrow-up" size={26} color="white" />
            </Pressable>

            <Text style={styles.txtNoCal}> No Calendar Yet </Text>

            <Modal transparent visible={visible} animationType="none">
                <View style={styles.overlay}>
                    <Animated.View
                        style={[
                            styles.sheet,
                            { transform: [{ translateY }] },
                        ]}
                        {...panResponder.panHandlers}
                    >
                        <View style={styles.handle} />
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

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
    },
    handle: {
        width: 50,
        height: 6,
        backgroundColor: "#ccc",
        borderRadius: 10,
        alignSelf: "center",
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
    },
    txtNoCal: {
        fontSize: 30,
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    }
});