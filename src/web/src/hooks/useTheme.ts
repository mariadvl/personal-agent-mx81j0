import { useMemo } from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useUIStore } from '../store/uiStore';
import { ThemeMode } from '../types/ui';
import { ThemeType } from '../themes/theme';
import lightTheme from '../themes/lightTheme';
import darkTheme from '../themes/darkTheme';
import { useMediaQuery } from './useMediaQuery';

/**
 * A custom React hook that provides theme management functionality for the application.
 * 
 * This hook handles:
 * - Accessing the current theme (light or dark) based on user preference or system settings
 * - Detection of system color scheme preferences
 * - Providing functions to change or toggle between theme modes
 * 
 * @returns An object containing the theme, current theme mode, and theme management functions
 */
export const useTheme = () => {
  // Access the theme mode and setter function from the global UI store
  const themeMode = useUIStore(state => state.themeMode);
  const setThemeMode = useUIStore(state => state.setThemeMode);
  
  // Check if the system prefers dark mode using media query
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Determine the effective theme mode based on user settings and system preference
  const effectiveThemeMode = useMemo(() => {
    if (themeMode === ThemeMode.SYSTEM) {
      return prefersDarkMode ? ThemeMode.DARK : ThemeMode.LIGHT;
    }
    return themeMode;
  }, [themeMode, prefersDarkMode]);
  
  // Get the appropriate theme object based on the effective mode
  const theme = useMemo<ThemeType>(() => {
    return effectiveThemeMode === ThemeMode.DARK ? darkTheme : lightTheme;
  }, [effectiveThemeMode]);
  
  /**
   * Toggles between light and dark theme modes.
   * - If currently in light mode, switches to dark mode
   * - If currently in dark mode, switches to light mode
   * - If in system mode, switches to explicit light or dark mode based on the opposite of system preference
   */
  const toggleTheme = () => {
    setThemeMode(
      themeMode === ThemeMode.LIGHT || 
      (themeMode === ThemeMode.SYSTEM && !prefersDarkMode) 
        ? ThemeMode.DARK 
        : ThemeMode.LIGHT
    );
  };
  
  return {
    theme,       // The current theme object (lightTheme or darkTheme)
    themeMode,   // The current theme mode setting (LIGHT, DARK, or SYSTEM)
    setThemeMode, // Function to set the theme mode directly
    toggleTheme   // Function to toggle between light and dark modes
  };
};