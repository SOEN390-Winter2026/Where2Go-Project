import { useState, useEffect } from "react";
import { View, Image, Pressable } from "react-native";
import PropTypes from "prop-types";
import { leftBarIconSource, leftBarIconState } from "./utils/leftBarItemActive";
import { sideLeftBarSharedStyles } from "./styles/sideLeftBarStyles";


//Template base for SideLeftBar
export default function SideLeftBarBase({
  topSection,
  isAccessibilityEnabled = false,
  onToggleAccessibility = () => {},
  isPOIEnabled = false,
  onTogglePOI = () => {},
}) {
  const firstDisabilityIcon = require("../assets/hugeicons--disability-02.png");
  const secondDisabilityIcon = require("../assets/hugeicons--disability-02-2.png");
  const firstPOIIcon = require("../assets/gis--poi-alt.png");
  const secondPOIIcon = require("../assets/gis--poi-alt-2.png");

  const [internalPOIEnabled, setInternalPOIEnabled] = useState(isPOIEnabled);

  useEffect(() => {
    setInternalPOIEnabled(isPOIEnabled);
  }, [isPOIEnabled]);

  const activePOI = internalPOIEnabled ? "poi" : null;
  const leftBarActiveInputs = { isAccessibilityEnabled, activePOI };
  const iconPairs = {
    disability: [firstDisabilityIcon, secondDisabilityIcon],
    poi: [firstPOIIcon, secondPOIIcon],
  };

  const handlePOIPress = () => {
    setInternalPOIEnabled((prev) => !prev);
    onTogglePOI();
  };

  return (
    <View style={sideLeftBarSharedStyles.floatLeftBar}>

      {/* Abstraction */}
      {topSection}

      {/* Concrete: disability */}
      <Pressable
        testID="disPress"
        style={[
          sideLeftBarSharedStyles.barItem,
          leftBarIconState("disability", leftBarActiveInputs),
        ]}
        onPress={onToggleAccessibility}
      >
        <Image
          source={leftBarIconSource("disability", leftBarActiveInputs, iconPairs)}
          style={sideLeftBarSharedStyles.icon}
        />
      </Pressable>

      {/* Concrete: pois */}
      <Pressable
        testID="poiPress"
        style={[
          sideLeftBarSharedStyles.barItem,
          leftBarIconState("poi", leftBarActiveInputs),
        ]}
        onPress={handlePOIPress}
      >
        <Image
          source={leftBarIconSource("poi", leftBarActiveInputs, iconPairs)}
          style={sideLeftBarSharedStyles.icon}
        />
      </Pressable>

    </View>
  );
}

SideLeftBarBase.propTypes = {
  topSection: PropTypes.node.isRequired,
  isAccessibilityEnabled: PropTypes.bool,
  onToggleAccessibility: PropTypes.func,
  isPOIEnabled: PropTypes.bool,
  onTogglePOI: PropTypes.func,
};