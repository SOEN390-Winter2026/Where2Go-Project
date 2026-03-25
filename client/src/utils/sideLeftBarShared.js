import { StyleSheet } from "react-native";
import PropTypes from "prop-types";
import { LEFT_BAR_BURGUNDY } from "./leftBarItemActive";

export const sideLeftBarAccessibilityPropTypes = {
  isAccessibilityEnabled: PropTypes.bool,
  onToggleAccessibility: PropTypes.func,
};

export const sideLeftBarSharedStyles = StyleSheet.create({
  floatLeftBar: {
    position: "absolute",
    padding: 5,
    borderWidth: 2,
    borderColor: LEFT_BAR_BURGUNDY,
    borderRadius: 20,
    left: "3%",
    top: "5%",
    alignItems: "center",
    backgroundColor: "white",
    zIndex: 20,
    elevation: 20,
  },
  barItem: {
    borderWidth: 2,
    borderColor: LEFT_BAR_BURGUNDY,
    borderRadius: 50,
    padding: 5,
    margin: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 20,
    height: 20,
  },
});
