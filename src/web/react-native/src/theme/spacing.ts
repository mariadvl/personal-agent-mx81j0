import { Dimensions } from 'react-native'; // react-native 0.72.0+

/**
 * Base spacing unit for the application
 * All spacing values are derived from this unit to maintain consistency
 */
export const unit = 8;

/**
 * Standard spacing values for consistent layout throughout the application
 * Values are multipliers of the base unit to create a harmonious visual rhythm
 */
export const spacing = {
  none: 0,   // No spacing
  xxs: 2,    // Extra extra small (unit * 0.25)
  xs: 4,     // Extra small (unit * 0.5)
  sm: 8,     // Small (unit * 1)
  md: 16,    // Medium (unit * 2)
  lg: 24,    // Large (unit * 3)
  xl: 32,    // Extra large (unit * 4)
  xxl: 48,   // Extra extra large (unit * 6)
};

/**
 * Padding and margin values for different UI components
 * Provides consistent spacing for various UI elements
 */
export const insets = {
  screen: {
    horizontal: 16, // Horizontal padding for screen containers
    vertical: 16,   // Vertical padding for screen containers
  },
  card: {
    horizontal: 16, // Horizontal padding for cards
    vertical: 12,   // Vertical padding for cards
  },
  input: {
    horizontal: 12, // Horizontal padding for input fields
    vertical: 10,   // Vertical padding for input fields
  },
  button: {
    horizontal: 16, // Horizontal padding for buttons
    vertical: 8,    // Vertical padding for buttons
  },
};

/**
 * Creates a spacing object with predefined spacing values based on a base unit
 * Allows creating custom spacing systems with different base units
 * 
 * @param baseUnit The base unit for spacing calculations
 * @returns An object with various spacing values as multiples of the base unit
 */
export function createSpacing(baseUnit: number) {
  return {
    none: 0,
    xxs: Math.round(baseUnit * 0.25), // 2 for default unit of 8
    xs: Math.round(baseUnit * 0.5),   // 4 for default unit of 8
    sm: baseUnit,                     // 8 for default unit of 8
    md: baseUnit * 2,                 // 16 for default unit of 8
    lg: baseUnit * 3,                 // 24 for default unit of 8
    xl: baseUnit * 4,                 // 32 for default unit of 8
    xxl: baseUnit * 6,                // 48 for default unit of 8
  };
}