import React from 'react'; // React ^18.0.0
import { SafeAreaProvider } from 'react-native-safe-area-context'; // react-native-safe-area-context ^4.5.0
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // react-native-gesture-handler ^2.9.0
import { StatusBar, View, StyleSheet } from 'react-native'; // react-native 0.72.0+

import AppNavigator from './src/navigation/AppNavigator';
import { useTheme } from './src/theme/theme';
import { useStore } from './src/store';

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

/**
 * Root component of the Personal AI Agent mobile application
 * @returns Rendered application with all necessary providers
 */
function App(): JSX.Element {
  // LD1: Initialize theme using useTheme hook
  const { theme, isDarkMode } = useTheme();

  // LD1: Initialize global state using useStore hook
  useStore();

  // LD1: Set up SafeAreaProvider for handling safe area insets
  // LD1: Set up GestureHandlerRootView for gesture handling
  // LD1: Configure StatusBar appearance based on theme
  // LD1: Render AppNavigator as the main navigation container
  // LD1: Return the complete app structure with all providers
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar
          backgroundColor={theme.colors.background.default}
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        />
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;