import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import SettingsPanel from '../components/SettingsPanel';
import { useTheme } from '../theme/theme';

/**
 * Props for the SettingsScreen component
 */
interface SettingsScreenProps extends NativeStackScreenProps<any, 'Settings'> {}

/**
 * Settings screen for the Personal AI Agent mobile application.
 * Provides access to application settings and configuration.
 */
const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  // Get current theme
  const { theme } = useTheme();
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <StatusBar
        backgroundColor={theme.components.statusBar.background}
        barStyle={theme.components.statusBar.barStyle}
      />
      <View style={[styles.content, { backgroundColor: theme.colors.background.default }]}>
        <SettingsPanel />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  }
});

export default SettingsScreen;