import React from 'react'; // react ^18.0.0
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'; // @react-navigation/bottom-tabs ^6.5.0
import { useColorScheme } from 'react-native'; // react-native 0.72.0+
import { Ionicons } from '@expo/vector-icons'; // @expo/vector-icons ^13.0.0

// Internal imports
import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import FilesScreen from '../screens/FilesScreen';
import MemoryScreen from '../screens/MemoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import theme from '../theme/theme';

/**
 * Type definition for the tab navigation parameters
 */
interface TabParamList {
  Home: undefined;
  Chat: undefined;
  Files: undefined;
  Memory: undefined;
  Settings: undefined;
}

/**
 * Bottom tab navigator object created by createBottomTabNavigator
 */
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Default options for all screens in the tab navigator
 */
const screenOptions = {
  tabBarActiveTintColor: theme.colors.primary.main,
  tabBarInactiveTintColor: theme.colors.text.secondary,
  tabBarStyle: {
    backgroundColor: theme.colors.background.paper,
    borderTopColor: theme.colors.divider,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontFamily: theme.typography.fontFamily.primary
  },
  headerShown: false
};

/**
 * Determines the appropriate icon for each tab based on the route name and focused state
 * @param routeName 
 * @param focused 
 * @param theme 
 * @returns 
 */
const getTabBarIcon = (routeName: string, focused: boolean, theme: any): JSX.Element => {
  let iconName: string;

  switch (routeName) {
    case 'Home':
      iconName = focused ? 'home' : 'home-outline';
      break;
    case 'Chat':
      iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
      break;
    case 'Files':
      iconName = focused ? 'document-text' : 'document-text-outline';
      break;
    case 'Memory':
      iconName = focused ? 'save' : 'save-outline';
      break;
    case 'Settings':
      iconName = focused ? 'settings' : 'settings-outline';
      break;
    default:
      iconName = 'information-circle-outline';
  }

  const iconColor = focused ? theme.colors.primary.main : theme.colors.text.secondary;

  return <Ionicons name={iconName} size={24} color={iconColor} />;
};

/**
 * Creates and configures the bottom tab navigator for the application
 */
const TabNavigator: React.FC = () => {
  // Get current theme
  const colorScheme = useColorScheme();
  const currentTheme = theme;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused, currentTheme),
        tabBarLabel: route.name,
        ...screenOptions,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Files" component={FilesScreen} />
      <Tab.Screen name="Memory" component={MemoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;