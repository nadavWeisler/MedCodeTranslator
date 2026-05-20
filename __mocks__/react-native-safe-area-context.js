// Mock react-native-safe-area-context
const React = require('react');
const { View } = require('react-native');

module.exports = {
  SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
};
