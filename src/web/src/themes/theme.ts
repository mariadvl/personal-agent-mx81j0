/**
 * Theme definitions for the Personal AI Agent application.
 * 
 * This file defines the core theme interface and related types that all
 * theme implementations must follow to ensure consistency across the application.
 * 
 * The theming system is designed with privacy, accessibility, and customization
 * in mind, featuring WCAG AA compliant color contrasts and clear visual
 * indicators for privacy-related features.
 */

/**
 * Main theme interface that all theme implementations must follow
 */
export interface ThemeType {
  colors: ColorPalette;
  typography: Typography;
  shadows: Shadows;
  shape: Shape;
  transitions: Transitions;
}

/**
 * Complete color palette definition for the theme
 */
export interface ColorPalette {
  primary: ColorSet;
  secondary: ColorSet;
  error: ColorSet;
  warning: ColorSet;
  info: ColorSet;
  success: ColorSet;
  background: BackgroundColors;
  text: TextColors;
  divider: string;
  action: ActionColors;
  privacy: PrivacyColors;
}

/**
 * A set of related colors with main, light, dark, and contrast text variants
 */
export interface ColorSet {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}

/**
 * Background colors for different surface types
 */
export interface BackgroundColors {
  default: string;
  paper: string;
  elevated: string;
}

/**
 * Text colors for different purposes
 */
export interface TextColors {
  primary: string;
  secondary: string;
  disabled: string;
  hint: string;
}

/**
 * Colors for interactive elements in different states
 */
export interface ActionColors {
  active: string;
  hover: string;
  selected: string;
  disabled: string;
  disabledBackground: string;
}

/**
 * Colors specifically for privacy indicators in the application
 * Used to clearly differentiate between local and external operations
 */
export interface PrivacyColors {
  local: string;    // Indicates data stored locally only
  external: string; // Indicates data sent to external services
  warning: string;  // Indicates potential privacy considerations
}

/**
 * Typography definitions for the theme
 */
export interface Typography {
  fontFamily: string;
  fontSize: number;
  fontWeightLight: number;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightBold: number;
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  h4: TypographyStyle;
  h5: TypographyStyle;
  h6: TypographyStyle;
  body1: TypographyStyle;
  body2: TypographyStyle;
  button: TypographyStyle;
  caption: TypographyStyle;
  overline: TypographyStyle;
}

/**
 * Style properties for a typography variant
 */
export interface TypographyStyle {
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
  textTransform?: string;
}

/**
 * Shadow styles for different elevation levels
 */
export interface Shadows {
  small: string;
  medium: string;
  large: string;
}

/**
 * Shape-related properties for the theme
 */
export interface Shape {
  borderRadius: number;
}

/**
 * Transition settings for animations
 */
export interface Transitions {
  easing: TransitionEasing;
  duration: TransitionDuration;
}

/**
 * Easing functions for transitions
 */
export interface TransitionEasing {
  easeInOut: string;
  easeOut: string;
  easeIn: string;
  sharp: string;
}

/**
 * Duration values for different types of transitions
 */
export interface TransitionDuration {
  shortest: number;
  shorter: number;
  short: number;
  standard: number;
  complex: number;
  enteringScreen: number;
  leavingScreen: number;
}

/**
 * Available theme modes
 */
export type ThemeMode = 'light' | 'dark' | 'system';