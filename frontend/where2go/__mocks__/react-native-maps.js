  const React = require("react");
  const { View, Pressable } = require("react-native");

const Marker = ({ children, accessibilityLabel, onPress }) => (
  <Pressable testID="marker" accessibilityLabel={accessibilityLabel} onPress={onPress}>
    {children}
  </Pressable>
);

  const Callout = ({ children, onPress }) => (
    <Pressable testID="callout" onPress={onPress}>
      {children}
    </Pressable>
  );

  const Polygon = () => <View testID="polygon" />;

  const MapView = React.forwardRef(
    (
      {
        children,
        testID,
        onRegionChange,
        onRegionChangeComplete,
        onPoiClick,
        ...props
      },
      ref
    ) => {
      React.useImperativeHandle(ref, () => ({
        animateToRegion: jest.fn(),
      }));
      return (
        <View testID={testID || "mapView"} {...props}>
          <Pressable
            testID="regionChangeTrigger"
            onPress={() => {
              onRegionChange?.();
              onRegionChangeComplete?.();
            }}
          />
          <Pressable
            testID="poiClickTrigger"
            onPress={() =>
              onPoiClick?.({ nativeEvent: { placeId: "test-id", name: "Test POI" } })
            }
          />
          {children}
        </View>
      );
    }
  );

module.exports = {
  __esModule: true,
  default: MapView,
  Marker,
  Callout,
  Polygon,
  MapView,
};