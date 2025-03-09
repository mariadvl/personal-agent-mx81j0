import React from 'react'; // react ^18.0.0
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'; // @react-navigation/stack ^6.3.0
import { useColorScheme } from 'react-native'; // react-native 0.72.0+
import { HeaderBackButton } from '@react-navigation/elements'; // @react-navigation/elements ^1.3.0

// Internal imports for screen components
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import FilesScreen from '../screens/FilesScreen';
import MemoryScreen from '../screens/MemoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WebScreen from '../screens/WebScreen';
import theme from '../theme/theme';

// Define the stack navigator
const Stack = createStackNavigator();

/**
 * Determines the appropriate header title based on the route name
 * @param routeName 
 * @returns Header title for the screen
 */
const getHeaderTitle = (routeName: string): string => {
  switch (routeName) {
    case 'Home':
      return 'Home';
    case 'Chat':
      return 'Chat';
    case 'Files':
      return 'Files';
    case 'Memory':
      return 'Memory';
    case 'Settings':
      return 'Settings';
    case 'Web':
      return 'Web Reader';
    default:
      return 'Personal AI Agent';
  }
};

/**
 * Creates and configures the stack navigator for the application
 * @returns Stack navigator component with configured screens
 */
function StackNavigator() {
  // Get the current color scheme
  const colorScheme = useColorScheme();

  // Define default screen options
  const screenOptions = {
    headerStyle: {
      backgroundColor: theme.light.colors.background.primary,
      elevation: 0, // Remove shadow on Android
      shadowOpacity: 0, // Remove shadow on iOS
    },
    headerTintColor: theme.light.colors.text.primary,
    headerTitleStyle: theme.light.typography.h6,
    cardStyle: {
      backgroundColor: theme.light.colors.background.primary,
    },
    ...TransitionPresets.SlideFromRightIOS,
  };

  return (
    <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
      {/* Main Tabs */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: getHeaderTitle('Home'),
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerTitle: getHeaderTitle('Chat'),
        }}
      />
      <Stack.Screen
        name="Files"
        component={FilesScreen}
        options={{
          headerTitle: getHeaderTitle('Files'),
        }}
      />
      <Stack.Screen
        name="Memory"
        component={MemoryScreen}
        options={{
          headerTitle: getHeaderTitle('Memory'),
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: getHeaderTitle('Settings'),
        }}
      />
      <Stack.Screen
        name="Web"
        component={WebScreen}
        options={{
          headerTitle: getHeaderTitle('Web'),
        }}
      />
    </Stack.Navigator>
  );
}

export default StackNavigator;