import React from 'react';
import { View, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

// Internal imports
import MemoryBrowser from '../components/MemoryBrowser';
import { useTheme } from '../theme/theme';

/**
 * Type definition for memory screen route parameters
 */
interface MemoryScreenParams {
  memoryId?: string;
  category?: string;
}

/**
 * Props interface for the MemoryScreen component
 */
interface MemoryScreenProps {
  navigation: any;
}

/**
 * Screen component for browsing and managing memory items
 */
const MemoryScreen = ({ navigation }: MemoryScreenProps) => {
  // Get the current theme using useTheme hook
  const { colors, components } = useTheme();
  
  // Get route parameters using useRoute hook
  const route = useRoute<RouteProp<Record<string, MemoryScreenParams>, string>>();
  
  // Extract memoryId and category from route.params if available
  const { memoryId, category } = route.params || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.main }]}>
      {/* Configure StatusBar with appropriate background color and style based on theme */}
      <StatusBar
        backgroundColor={components.statusBar.background}
        barStyle={components.statusBar.barStyle}
      />
      
      {/* Render MemoryBrowser component with navigation and route parameters */}
      <MemoryBrowser 
        navigation={navigation}
        memoryId={memoryId}
        initialCategory={category}
      />
    </SafeAreaView>
  );
};

/**
 * Main container for the memory screen
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default MemoryScreen;