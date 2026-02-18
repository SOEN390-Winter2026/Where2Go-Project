  const React = require("react");
  const { View, Pressable } = require("react-native");

  const Marker = ({ children }) => <View testID="marker">{children}</View>;

  const Callout = ({ children, onPress }) => (
    <Pressable testID="callout" onPress={onPress}>
      {children}
    </Pressable>
  );

module.exports = { __esModule: true, Marker, Callout };