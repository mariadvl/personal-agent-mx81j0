import React from 'react'; // React ^18.0.0
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native'; // @react-navigation/native ^6.1.0
import { StatusBar, useColorScheme } from 'react-native'; // react-native 0.72.0+

import StackNavigator from './StackNavigator';
import TabNavigator from './TabNavigator';
import theme from '../theme/theme';

// Define a key for persisting navigation state
const NAVIGATION_PERSISTENCE_KEY = 'PersonalAINavigationState';

/**
 * Creates a navigation theme by extending the default React Navigation theme with app theme colors
 * @param appTheme - The application theme object
 * @param baseNavigationTheme - The base navigation theme (DefaultTheme or DarkTheme)
 * @returns Combined navigation theme with app colors
 */
const createNavigationTheme = (appTheme: typeof theme.light, baseNavigationTheme: typeof DefaultTheme | typeof DarkTheme) => {
  // 1. Merge the base navigation theme with custom colors from app theme
  const mergedTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: appTheme.colors.primary.main,
      background: appTheme.colors.background.default,
      card: appTheme.colors.background.paper,
      text: appTheme.colors.text.primary,
      border: appTheme.colors.divider,
    },
  };

  return mergedTheme;
};

/**
 * Main navigation container component that configures the navigation structure and theme
 * @returns Navigation container with configured theme and routes
 */
function AppNavigator() {
  // 1. Get the current device color scheme using useColorScheme
  const colorScheme = useColorScheme();

  // 2. Get the application theme using useTheme hook
  const { theme: appTheme } = theme;

  // 3. Determine if dark mode is active based on color scheme
  const isDarkMode = colorScheme === 'dark';

  // 4. Create a navigation theme by extending DefaultTheme or DarkTheme with app theme colors
  const navigationTheme = React.useMemo(() => {
    const baseNavigationTheme = isDarkMode ? DarkTheme : DefaultTheme;
    return createNavigationTheme(appTheme.light, baseNavigationTheme);
  }, [isDarkMode, appTheme]);

  // 5. Configure status bar appearance based on theme
  React.useEffect(() => {
    StatusBar.setBackgroundColor(navigationTheme.colors.background);
    StatusBar.setBarStyle(isDarkMode ? 'light-content' : 'dark-content');
  }, [isDarkMode, navigationTheme.colors.background]);

  // 6. Return NavigationContainer with appropriate theme
  return (
    <NavigationContainer theme={navigationTheme}>
      {/* 7. Render TabNavigator as the root navigator component */}
      <TabNavigator />
    </NavigationContainer>
  );
}

export default AppNavigator;