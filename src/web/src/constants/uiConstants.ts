/**
 * UI Constants
 * 
 * This file contains UI-related constants used throughout the application
 * to ensure consistency in the design system. This includes spacing, sizing,
 * typography, animations, and other UI-specific values.
 */

// Spacing values in pixels for margins, padding, and layout
export const SPACING = {
  XS: '4px',
  SM: '8px',
  MD: '16px',
  LG: '24px',
  XL: '32px',
  XXL: '48px'
} as const;

// Standard button heights for different sizes
export const BUTTON_HEIGHT = {
  SMALL: '32px',
  MEDIUM: '40px',
  LARGE: '48px'
} as const;

// Standard input field heights for different sizes
export const INPUT_HEIGHT = {
  SMALL: '32px',
  MEDIUM: '40px',
  LARGE: '48px'
} as const;

// Border radius values for UI elements
export const BORDER_RADIUS = {
  SMALL: '4px',
  MEDIUM: '8px',
  LARGE: '16px',
  ROUND: '50%'
} as const;

// Font sizes for typography
export const FONT_SIZE = {
  XS: '12px',
  SM: '14px',
  MD: '16px',
  LG: '18px',
  XL: '20px',
  XXL: '24px',
  XXXL: '32px'
} as const;

// Font weights for typography
export const FONT_WEIGHT = {
  REGULAR: 400,
  MEDIUM: 500,
  SEMIBOLD: 600,
  BOLD: 700
} as const;

// Line heights for typography
export const LINE_HEIGHT = {
  TIGHT: 1.2,
  NORMAL: 1.5,
  LOOSE: 1.8
} as const;

// CSS transitions for animations
export const TRANSITION = {
  DEFAULT: 'all 0.2s ease-in-out',
  FAST: 'all 0.1s ease-in-out',
  SLOW: 'all 0.3s ease-in-out'
} as const;

// Box shadows for UI elements
export const SHADOW = {
  SMALL: '0 2px 4px rgba(0, 0, 0, 0.1)',
  MEDIUM: '0 4px 8px rgba(0, 0, 0, 0.1)',
  LARGE: '0 8px 16px rgba(0, 0, 0, 0.1)'
} as const;

// Z-index values for layering UI elements
export const Z_INDEX = {
  DROPDOWN: 100,
  MODAL: 200,
  TOOLTIP: 300,
  NOTIFICATION: 400
} as const;

// Breakpoints for responsive design as defined in the design system
export const BREAKPOINTS = {
  MOBILE: '768px',
  TABLET: '1024px',
  DESKTOP: '1280px',
  LARGE_DESKTOP: '1440px'
} as const;

// Standard container widths
export const CONTAINER_WIDTH = {
  SMALL: '600px',
  MEDIUM: '800px',
  LARGE: '1000px',
  XLARGE: '1200px'
} as const;

// Standard modal widths
export const MODAL_WIDTH = {
  SMALL: '400px',
  MEDIUM: '600px',
  LARGE: '800px',
  FULL: '90%'
} as const;

// CSS animations for UI elements
export const ANIMATION = {
  FADE_IN: 'fadeIn 0.3s ease-in-out',
  FADE_OUT: 'fadeOut 0.3s ease-in-out',
  SLIDE_IN: 'slideIn 0.3s ease-in-out',
  SLIDE_OUT: 'slideOut 0.3s ease-in-out'
} as const;

// Focus ring style for accessibility (keyboard focus)
export const FOCUS_RING = '0 0 0 2px rgba(66, 153, 225, 0.6)' as const;

// Standard icon sizes
export const ICON_SIZE = {
  SMALL: '16px',
  MEDIUM: '24px',
  LARGE: '32px'
} as const;

// Standard avatar sizes
export const AVATAR_SIZE = {
  SMALL: '32px',
  MEDIUM: '40px',
  LARGE: '48px',
  XLARGE: '64px'
} as const;

// Maximum width for chat message bubbles
export const MESSAGE_MAX_WIDTH = '70%' as const;

// Sidebar widths for collapsed and expanded states
export const SIDEBAR_WIDTH = {
  COLLAPSED: '64px',
  EXPANDED: '240px'
} as const;