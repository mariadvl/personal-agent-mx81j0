import { Platform } from 'react-native'; // react-native 0.72.0+

/**
 * Base font size for the application typography system.
 * All other font sizes are calculated relative to this value.
 */
export const baseFontSize = 16;

/**
 * Platform-specific font family definitions.
 * Uses system fonts appropriate for each platform to ensure optimal readability.
 */
export const fontFamily = {
  // System font for iOS devices, Roboto for Android
  primary: Platform.OS === 'ios' ? 'System' : 'Roboto',
  // Secondary font for cases where a different typography style is needed
  secondary: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  // Monospace font for code blocks or technical content
  monospace: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

/**
 * Font size values for different text elements.
 * These sizes are designed for optimal readability on mobile devices.
 */
export const fontSize = {
  xs: 12, // Extra small text (captions, fine print)
  sm: 14, // Small text (secondary information)
  md: 16, // Medium text (standard body text)
  lg: 18, // Large text (emphasized content)
  xl: 20, // Extra large text (sub-headings)
  xxl: 24, // Extra extra large text (headings)
};

/**
 * Font weight values for different text styles.
 * Uses standard weight naming conventions with string values.
 */
export const fontWeight = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

/**
 * Complete typography styles for different text elements.
 * Includes font family, size, weight, line height, and letter spacing.
 */
export const typography = {
  // Heading styles
  h1: {
    fontFamily: fontFamily.primary,
    fontSize: 32,
    fontWeight: fontWeight.bold,
    lineHeight: 40,
    letterSpacing: 0.25,
  },
  h2: {
    fontFamily: fontFamily.primary,
    fontSize: 28,
    fontWeight: fontWeight.bold,
    lineHeight: 36,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fontFamily.primary,
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    lineHeight: 32,
    letterSpacing: 0.15,
  },
  h4: {
    fontFamily: fontFamily.primary,
    fontSize: 20,
    fontWeight: fontWeight.semibold,
    lineHeight: 28,
    letterSpacing: 0.15,
  },
  h5: {
    fontFamily: fontFamily.primary,
    fontSize: 18,
    fontWeight: fontWeight.medium,
    lineHeight: 26,
    letterSpacing: 0.1,
  },
  h6: {
    fontFamily: fontFamily.primary,
    fontSize: 16,
    fontWeight: fontWeight.medium,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  // Body text styles
  body1: {
    fontFamily: fontFamily.primary,
    fontSize: 16,
    fontWeight: fontWeight.regular,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  body2: {
    fontFamily: fontFamily.primary,
    fontSize: 14,
    fontWeight: fontWeight.regular,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  // Additional text styles
  button: {
    fontFamily: fontFamily.primary,
    fontSize: 14,
    fontWeight: fontWeight.medium,
    lineHeight: 20,
    letterSpacing: 0.75,
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: fontFamily.primary,
    fontSize: 12,
    fontWeight: fontWeight.regular,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  overline: {
    fontFamily: fontFamily.primary,
    fontSize: 10,
    fontWeight: fontWeight.medium,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
};

/**
 * Creates a custom typography object with predefined text styles based on a specified base font size.
 * This allows for creating different typography scales for different screen sizes or user preferences.
 * 
 * @param baseFontSize - Base font size to calculate the typography scale
 * @returns Typography object with various text styles
 */
export function createTypography(baseFontSize: number) {
  // Calculate scale factor based on the provided base font size
  const scaleFactor = baseFontSize / 16;
  
  // Scale font sizes based on the scale factor
  const scaledFontSize = {
    xs: Math.round(fontSize.xs * scaleFactor),
    sm: Math.round(fontSize.sm * scaleFactor),
    md: Math.round(fontSize.md * scaleFactor),
    lg: Math.round(fontSize.lg * scaleFactor),
    xl: Math.round(fontSize.xl * scaleFactor),
    xxl: Math.round(fontSize.xxl * scaleFactor),
  };
  
  // Create typography with scaled font sizes
  return {
    h1: {
      ...typography.h1,
      fontSize: Math.round(typography.h1.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h1.lineHeight * scaleFactor),
    },
    h2: {
      ...typography.h2,
      fontSize: Math.round(typography.h2.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h2.lineHeight * scaleFactor),
    },
    h3: {
      ...typography.h3,
      fontSize: Math.round(typography.h3.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h3.lineHeight * scaleFactor),
    },
    h4: {
      ...typography.h4,
      fontSize: Math.round(typography.h4.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h4.lineHeight * scaleFactor),
    },
    h5: {
      ...typography.h5,
      fontSize: Math.round(typography.h5.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h5.lineHeight * scaleFactor),
    },
    h6: {
      ...typography.h6,
      fontSize: Math.round(typography.h6.fontSize * scaleFactor),
      lineHeight: Math.round(typography.h6.lineHeight * scaleFactor),
    },
    body1: {
      ...typography.body1,
      fontSize: Math.round(typography.body1.fontSize * scaleFactor),
      lineHeight: Math.round(typography.body1.lineHeight * scaleFactor),
    },
    body2: {
      ...typography.body2,
      fontSize: Math.round(typography.body2.fontSize * scaleFactor),
      lineHeight: Math.round(typography.body2.lineHeight * scaleFactor),
    },
    button: {
      ...typography.button,
      fontSize: Math.round(typography.button.fontSize * scaleFactor),
      lineHeight: Math.round(typography.button.lineHeight * scaleFactor),
    },
    caption: {
      ...typography.caption,
      fontSize: Math.round(typography.caption.fontSize * scaleFactor),
      lineHeight: Math.round(typography.caption.lineHeight * scaleFactor),
    },
    overline: {
      ...typography.overline,
      fontSize: Math.round(typography.overline.fontSize * scaleFactor),
      lineHeight: Math.round(typography.overline.lineHeight * scaleFactor),
    },
  };
}