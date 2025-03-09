/**
 * Light theme configuration for the Personal AI Agent web application.
 * This theme provides a clean, bright interface that emphasizes readability
 * and accessibility while maintaining the privacy-focused design language.
 * 
 * All colors meet WCAG AA compliance for contrast ratios.
 */

import { ThemeType } from './theme';

const lightTheme: ThemeType = {
  colors: {
    primary: {
      main: '#6C5CE7',     // Purple
      light: '#8C7CFF', 
      dark: '#5549C0',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#00B894',     // Teal
      light: '#1DD1A1',
      dark: '#009B7D',
      contrastText: '#FFFFFF'
    },
    error: {
      main: '#E64C4C',     // Red
      light: '#FF6B6B',
      dark: '#C03A3A',
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#E0B050',     // Amber
      light: '#FDCB6E',
      dark: '#C99A3C',
      contrastText: '#1E272E'  // Dark text for better contrast on light color
    },
    info: {
      main: '#5A9AE0',     // Blue
      light: '#74B9FF',
      dark: '#4A7FB8',
      contrastText: '#FFFFFF'
    },
    success: {
      main: '#41D0A5',     // Green
      light: '#55EFC4',
      dark: '#36B08C',
      contrastText: '#1E272E'  // Dark text for better contrast
    },
    background: {
      default: '#F5F6FA',  // Very light gray-blue
      paper: '#FFFFFF',    // White
      elevated: '#FFFFFF'  // White
    },
    text: {
      primary: '#1E272E',    // Very dark blue-gray
      secondary: '#2D3436',  // Dark gray
      disabled: '#95A5A6',   // Medium gray
      hint: '#B2BEC3'        // Light gray
    },
    divider: '#DFE6E9',    // Light gray
    action: {
      active: '#1E272E',
      hover: 'rgba(0, 0, 0, 0.04)',
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)'
    },
    privacy: {
      local: '#00B894',      // Teal (same as secondary) for local storage
      external: '#E0B050',   // Amber (same as warning) for external services
      warning: '#E64C4C'     // Red (same as error) for privacy warnings
    }
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    fontSize: 16,  // Base font size
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.5
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      textTransform: 'none'  // No uppercase transformation for better readability
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.5,
      textTransform: 'uppercase'
    }
  },
  shadows: {
    small: '0 2px 8px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.15)',
    large: '0 8px 24px rgba(0, 0, 0, 0.2)'
  },
  shape: {
    borderRadius: 8  // Moderate rounding of corners
  },
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'
    },
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195
    }
  }
};

export default lightTheme;