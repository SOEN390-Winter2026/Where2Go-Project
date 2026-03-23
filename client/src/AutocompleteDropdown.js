import React from "react";
import { ScrollView, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { styles } from "./styles/OutdoorDirection_styles";

const AutocompleteDropdown = ({
  results,
  visible,
  onSelect,
  formatLabel,
  iconName = "location-outline",
  iconColor = "#7C2B38",
}) => {
  if (!visible || !results || results.length === 0) {
    return null;
  }

  return (
    <ScrollView
      style={styles.dropdown}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {results.map((loc) => (
        <Pressable
          key={`${loc.label}-${loc.lat}-${loc.lng}`}
          style={styles.dropdownItem}
          onPress={() => onSelect(loc)}
        >
          <Ionicons
            name={iconName}
            size={16}
            color={iconColor}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {formatLabel ? formatLabel(loc.label) : loc.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

AutocompleteDropdown.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      lat: PropTypes.number,
      lng: PropTypes.number,
      searchText: PropTypes.string,
    })
  ).isRequired,
  visible: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  formatLabel: PropTypes.func,
  iconName: PropTypes.string,
  iconColor: PropTypes.string,
};

AutocompleteDropdown.defaultProps = {
  formatLabel: null,
  iconName: "location-outline",
  iconColor: "#7C2B38",
};

export default AutocompleteDropdown;
