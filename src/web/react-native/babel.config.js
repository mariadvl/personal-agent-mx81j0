module.exports = function(api) {
  // This caches the Babel config for better performance
  api.cache(true);

  return {
    presets: [
      // This preset includes all the necessary transformations for React Native
      // including React, TypeScript, and other features
      'module:metro-react-native-babel-preset'
    ],
    plugins: [
      // Add support for React Native Reanimated for fluid animations
      'react-native-reanimated/plugin'
    ],
    env: {
      production: {
        // Production-specific settings
        // No special settings required for iOS 14+ and Android 10+ as
        // these are handled at the native project configuration level
      },
      development: {
        // Development-specific settings to improve developer experience
      },
      test: {
        // Test-specific settings for improved testing experience
      }
    }
  };
};