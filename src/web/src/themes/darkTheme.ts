import { ThemeType } from './theme';

/**
 * Dark theme configuration for the Personal AI Agent application.
 * 
 * This theme provides a sleek, dark interface that reduces eye strain
 * in low-light environments while maintaining WCAG AA compliant contrast ratios.
 * It includes specific color indicators for privacy features to help users
 * understand when data is stored locally versus sent to external services.
 * 
 * @version 1.0.0
 */
const darkTheme: ThemeType = {
  colors: {
    primary: {
      main: '#8C7CFF',      // Purple - primary action color
      light: '#A99DFF',     // Lighter purple for hover states
      dark: '#6C5CE7',      // Darker purple for pressed states
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#1DD1A1',      // Teal - secondary action color
      light: '#55EFC4',     // Lighter teal for hover states
      dark: '#00B894',      // Darker teal for pressed states
      contrastText: '#1E272E'
    },
    error: {
      main: '#FF6B6B',      // Red - error states
      light: '#FF8787',     // Lighter red
      dark: '#E64C4C',      // Darker red
      contrastText: '#FFFFFF'
    },
    warning: {
      main: '#FDCB6E',      // Amber - warning states
      light: '#FED892',     // Lighter amber
      dark: '#E0B050',      // Darker amber
      contrastText: '#1E272E'
    },
    info: {
      main: '#74B9FF',      // Blue - informational states
      light: '#A3CFFF',     // Lighter blue
      dark: '#5A9AE0',      // Darker blue
      contrastText: '#1E272E'
    },
    success: {
      main: '#55EFC4',      // Green - success states
      light: '#7FF4D2',     // Lighter green
      dark: '#41D0A5',      // Darker green
      contrastText: '#1E272E'
    },
    background: {
      default: '#1E272E',   // Dark blue-gray for main background
      paper: '#2D3436',     // Slightly lighter for cards/surfaces
      elevated: '#3D4852'   // Even lighter for elevated surfaces
    },
    text: {
      primary: '#F5F6FA',   // Nearly white for primary text
      secondary: '#DFE6E9', // Light gray for secondary text
      disabled: '#B2BEC3',  // Mid-gray for disabled text
      hint: '#95A5A6'       // Muted gray for hint text
    },
    divider: '#4D5656',     // Dark gray for dividers
    action: {
      active: '#FFFFFF',    // White for active icons
      hover: 'rgba(255, 255, 255, 0.08)',   // Subtle white for hover states
      selected: 'rgba(255, 255, 255, 0.16)', // More visible white for selected states
      disabled: 'rgba(255, 255, 255, 0.3)',  // Faded white for disabled states
      disabledBackground: 'rgba(255, 255, 255, 0.12)' // Subtle background for disabled items
    },
    privacy: {
      local: '#1DD1A1',     // Teal for local-only operations (safe)
      external: '#FDCB6E',  // Amber for external service usage (caution)
      warning: '#FF6B6B'    // Red for potential privacy concerns (warning)
    }
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    fontSize: 16,
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
    small: '0 2px 8px rgba(0, 0, 0, 0.3)',    // Subtle shadow for small elevations
    medium: '0 4px 12px rgba(0, 0, 0, 0.4)',  // Medium shadow for moderate elevations
    large: '0 8px 24px rgba(0, 0, 0, 0.5)'    // Pronounced shadow for high elevations
  },
  shape: {
    borderRadius: 8  // Consistent rounded corners throughout the application
  },
  transitions: {
    easing: {
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', // Standard
      easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',   // Deceleration
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',      // Acceleration
      sharp: 'cubic-bezier(0.4, 0, 0.6, 1)'      // Standard deceleration
    },
    duration: {
      shortest: 150,  // Very quick transitions
      shorter: 200,   // Quick transitions
      short: 250,     // Brief transitions
      standard: 300,  // Standard transitions
      complex: 375,   // More complex animations
      enteringScreen: 225, // Optimized for elements entering the screen
      leavingScreen: 195   // Optimized for elements leaving the screen
    }
  }
};

export default darkTheme;