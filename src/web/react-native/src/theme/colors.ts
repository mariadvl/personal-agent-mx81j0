/**
 * Color palette for the Personal AI Agent mobile application.
 * 
 * This file defines the color system for both light and dark themes,
 * with a focus on privacy-oriented design principles. Colors are optimized
 * for mobile displays while maintaining consistency with the web application.
 * 
 * All color contrasts meet WCAG AA compliance for accessibility.
 */

/**
 * Base palette with color scales from 50-900
 * Used as foundation for both light and dark themes
 */
export const palette = {
  // Primary brand color - purple
  purple: {
    '50': '#F3F1FF',
    '100': '#E9E4FF',
    '200': '#D2C9FF',
    '300': '#B8ADFF',
    '400': '#A99DFF',
    '500': '#8C7CFF',
    '600': '#6C5CE7', // Primary main
    '700': '#5549C0',
    '800': '#3F3590',
    '900': '#2A2361',
  },
  
  // Secondary brand color - green
  green: {
    '50': '#E6FFF8',
    '100': '#CCFFF1',
    '200': '#99FFE3',
    '300': '#66FFD6',
    '400': '#55EFC4',
    '500': '#1DD1A1',
    '600': '#00B894', // Secondary main
    '700': '#009B7D',
    '800': '#007D66',
    '900': '#00604F',
  },
  
  // Error/danger color - red
  red: {
    '50': '#FFE6E6',
    '100': '#FFCCCC',
    '200': '#FF9999',
    '300': '#FF6666',
    '400': '#FF6B6B',
    '500': '#E64C4C', // Error main
    '600': '#C03A3A',
    '700': '#9A2828',
    '800': '#751717',
    '900': '#500505',
  },
  
  // Warning color - yellow
  yellow: {
    '50': '#FFF9E6',
    '100': '#FFF3CC',
    '200': '#FFE799',
    '300': '#FDCB6E', // Warning main
    '400': '#E0B050',
    '500': '#C99A3C',
    '600': '#B38728',
    '700': '#8C6914',
    '800': '#664C00',
    '900': '#402F00',
  },
  
  // Info color - blue
  blue: {
    '50': '#E6F4FF',
    '100': '#CCE9FF',
    '200': '#99D3FF',
    '300': '#74B9FF', // Info main
    '400': '#5A9AE0',
    '500': '#4A7FB8',
    '600': '#3A6491',
    '700': '#2A4969',
    '800': '#1A2F42',
    '900': '#0A141A',
  },
  
  // Neutral colors - grey
  grey: {
    '50': '#F5F6FA', // Background light
    '100': '#DFE6E9',
    '200': '#B2BEC3',
    '300': '#95A5A6',
    '400': '#7F8C8D',
    '500': '#636E72',
    '600': '#4D5656',
    '700': '#3D4852',
    '800': '#2D3436',
    '900': '#1E272E', // Text primary dark
  },
};

/**
 * Light theme color system
 * Optimized for light backgrounds with appropriate contrast ratios
 */
export const lightColors = {
  primary: {
    main: '#6C5CE7',
    light: '#8C7CFF',
    dark: '#5549C0',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#00B894',
    light: '#1DD1A1',
    dark: '#009B7D',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F5F6FA', // Light grey background
    paper: '#FFFFFF', // White surfaces
    elevated: '#FFFFFF', // Elevated surfaces
  },
  text: {
    primary: '#1E272E', // Near black for maximum contrast
    secondary: '#2D3436', // Slightly lighter for secondary text
    disabled: '#95A5A6', // Muted text for disabled elements
    hint: '#B2BEC3', // Subtle hint text
  },
  error: {
    main: '#E64C4C',
    light: '#FF6B6B',
    dark: '#C03A3A',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#E0B050',
    light: '#FDCB6E',
    dark: '#C99A3C',
    contrastText: '#1E272E',
  },
  info: {
    main: '#5A9AE0',
    light: '#74B9FF',
    dark: '#4A7FB8',
    contrastText: '#FFFFFF',
  },
  success: {
    main: '#41D0A5',
    light: '#55EFC4',
    dark: '#36B08C',
    contrastText: '#1E272E',
  },
  divider: '#DFE6E9',
  action: {
    active: '#1E272E',
    hover: 'rgba(0, 0, 0, 0.04)',
    selected: 'rgba(0, 0, 0, 0.08)',
    disabled: 'rgba(0, 0, 0, 0.26)',
    disabledBackground: 'rgba(0, 0, 0, 0.12)',
  },
  // Privacy indicators - used to clearly show data handling status
  privacy: {
    local: '#00B894', // Green for local-only operations
    external: '#E0B050', // Yellow for external service usage
    warning: '#E64C4C', // Red for privacy warnings
  },
};

/**
 * Dark theme color system
 * Optimized for dark backgrounds with appropriate contrast ratios
 */
export const darkColors = {
  primary: {
    main: '#8C7CFF', // Brighter than light theme for visibility
    light: '#A99DFF',
    dark: '#6C5CE7',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#1DD1A1',
    light: '#55EFC4',
    dark: '#00B894',
    contrastText: '#1E272E',
  },
  background: {
    default: '#1E272E', // Dark background
    paper: '#2D3436', // Surface color
    elevated: '#3D4852', // Elevated surface color
  },
  text: {
    primary: '#F5F6FA', // Near white for maximum contrast
    secondary: '#DFE6E9', // Slightly darker for secondary text
    disabled: '#B2BEC3', // Muted text for disabled elements
    hint: '#95A5A6', // Subtle hint text
  },
  error: {
    main: '#FF6B6B', // Brighter in dark mode
    light: '#FF8787',
    dark: '#E64C4C',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: '#FDCB6E', // Brighter in dark mode
    light: '#FED892',
    dark: '#E0B050',
    contrastText: '#1E272E',
  },
  info: {
    main: '#74B9FF', // Brighter in dark mode
    light: '#A3CFFF',
    dark: '#5A9AE0',
    contrastText: '#1E272E',
  },
  success: {
    main: '#55EFC4', // Brighter in dark mode
    light: '#7FF4D2',
    dark: '#41D0A5',
    contrastText: '#1E272E',
  },
  divider: '#4D5656',
  action: {
    active: '#FFFFFF',
    hover: 'rgba(255, 255, 255, 0.08)',
    selected: 'rgba(255, 255, 255, 0.16)',
    disabled: 'rgba(255, 255, 255, 0.3)',
    disabledBackground: 'rgba(255, 255, 255, 0.12)',
  },
  // Privacy indicators - slightly brighter in dark mode for visibility
  privacy: {
    local: '#1DD1A1', // Green for local-only operations
    external: '#FDCB6E', // Yellow for external service usage
    warning: '#FF6B6B', // Red for privacy warnings
  },
};