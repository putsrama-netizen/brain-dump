module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Worklets plugin must come last. Required for Reanimated v4.
      'react-native-worklets/plugin',
    ],
  };
};
