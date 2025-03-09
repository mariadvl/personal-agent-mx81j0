import { Appearance, useColorScheme } from 'react-native'; // react-native 0.72.0+

import { lightColors, darkColors } from './colors';
import { spacing, insets } from './spacing';
import { typography, fontFamily } from './typography';
import { getResponsiveSpacing } from '../utils/responsive';

/**
 * Theme interface defining the structure of our theme object
 * This ensures type safety throughout the application
 */
export interface ThemeType {
  colors: {
    primary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    background: {
      default: string;
      paper: string;
      elevated: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
      hint: string;
    };
    error: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    warning: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    info: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    success: {
      main: string;
      light: string;
      dark: string;
      contrastText: string;
    };
    divider: string;
    action: {
      active: string;
      hover: string;
      selected: string;
      disabled: string;
      disabledBackground: string;
    };
    privacy: {
      local: string;
      external: string;
      warning: string;
    };
  };
  typography: {
    h1: object;
    h2: object;
    h3: object;
    h4: object;
    h5: object;
    h6: object;
    body1: object;
    body2: object;
    button: object;
    caption: object;
    overline: object;
    fontFamily: {
      primary: string;
      secondary: string;
      monospace: string;
    };
  };
  spacing: {
    none: number;
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  components: {
    button: {
      primary: object;
      secondary: object;
      outlined: object;
      text: object;
      disabled: object;
    };
    card: {
      root: object;
      elevated: object;
    };
    input: {
      container: object;
      field: object;
      label: object;
      error: object;
      disabled: object;
    };
    messageItem: {
      user: object;
      ai: object;
      system: object;
    };
    statusBar: {
      background: string;
      barStyle: 'light-content' | 'dark-content';
    };
    privacyIndicator: {
      local: object;
      external: object;
      warning: object;
    };
  };
}

/**
 * Creates a theme object with all necessary styling properties
 * based on the specified color scheme (light or dark)
 * 
 * @param colorScheme - 'light' or 'dark'
 * @returns Complete theme object with colors, typography, spacing, and component styles
 */
export const createTheme = (colorScheme: string): ThemeType => {
  const isDarkMode = colorScheme === 'dark';
  const colors = isDarkMode ? darkColors : lightColors;
  
  // Create responsive spacing values
  const responsiveSpacing = {
    none: spacing.none,
    xxs: getResponsiveSpacing(spacing.xxs),
    xs: getResponsiveSpacing(spacing.xs),
    sm: getResponsiveSpacing(spacing.sm),
    md: getResponsiveSpacing(spacing.md),
    lg: getResponsiveSpacing(spacing.lg),
    xl: getResponsiveSpacing(spacing.xl),
    xxl: getResponsiveSpacing(spacing.xxl),
  };
  
  // Combine typography with font family
  const typographyWithFontFamily = {
    ...typography,
    fontFamily,
  };
  
  // Create component-specific styles based on the color scheme
  const components = {
    button: {
      primary: {
        backgroundColor: colors.primary.main,
        paddingHorizontal: insets.button.horizontal,
        paddingVertical: insets.button.vertical,
        borderRadius: 8,
        elevation: 2,
        shadowColor: colors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      secondary: {
        backgroundColor: colors.secondary.main,
        paddingHorizontal: insets.button.horizontal,
        paddingVertical: insets.button.vertical,
        borderRadius: 8,
        elevation: 2,
        shadowColor: colors.secondary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      outlined: {
        backgroundColor: 'transparent',
        paddingHorizontal: insets.button.horizontal,
        paddingVertical: insets.button.vertical - 1, // Subtract 1 to account for border
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary.main,
      },
      text: {
        backgroundColor: 'transparent',
        paddingHorizontal: insets.button.horizontal,
        paddingVertical: insets.button.vertical,
        borderRadius: 8,
      },
      disabled: {
        backgroundColor: colors.action.disabledBackground,
        paddingHorizontal: insets.button.horizontal,
        paddingVertical: insets.button.vertical,
        borderRadius: 8,
      },
    },
    card: {
      root: {
        backgroundColor: colors.background.paper,
        borderRadius: 12,
        paddingHorizontal: insets.card.horizontal,
        paddingVertical: insets.card.vertical,
        marginVertical: responsiveSpacing.sm,
      },
      elevated: {
        backgroundColor: colors.background.elevated,
        borderRadius: 12,
        paddingHorizontal: insets.card.horizontal,
        paddingVertical: insets.card.vertical,
        marginVertical: responsiveSpacing.sm,
        elevation: 3,
        shadowColor: isDarkMode ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDarkMode ? 0.4 : 0.2,
        shadowRadius: 3,
      },
    },
    input: {
      container: {
        marginBottom: responsiveSpacing.md,
      },
      field: {
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        borderRadius: 8,
        paddingHorizontal: insets.input.horizontal,
        paddingVertical: insets.input.vertical,
        borderWidth: 1,
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        color: colors.text.primary,
        ...typography.body1,
      },
      label: {
        marginBottom: responsiveSpacing.xs,
        ...typography.caption,
        color: colors.text.secondary,
      },
      error: {
        borderColor: colors.error.main,
        borderWidth: 1,
      },
      disabled: {
        backgroundColor: colors.action.disabledBackground,
        color: colors.text.disabled,
      },
    },
    messageItem: {
      user: {
        alignSelf: 'flex-end',
        backgroundColor: colors.primary.main,
        borderRadius: 16,
        borderBottomRightRadius: 4,
        paddingHorizontal: responsiveSpacing.md,
        paddingVertical: responsiveSpacing.sm,
        marginVertical: responsiveSpacing.xs,
        maxWidth: '80%',
      },
      ai: {
        alignSelf: 'flex-start',
        backgroundColor: isDarkMode ? colors.background.elevated : colors.background.paper,
        borderRadius: 16,
        borderBottomLeftRadius: 4,
        paddingHorizontal: responsiveSpacing.md,
        paddingVertical: responsiveSpacing.sm,
        marginVertical: responsiveSpacing.xs,
        maxWidth: '80%',
        elevation: 1,
        shadowColor: isDarkMode ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDarkMode ? 0.3 : 0.1,
        shadowRadius: 2,
      },
      system: {
        alignSelf: 'center',
        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        borderRadius: 16,
        paddingHorizontal: responsiveSpacing.md,
        paddingVertical: responsiveSpacing.xs,
        marginVertical: responsiveSpacing.sm,
        maxWidth: '90%',
      },
    },
    statusBar: {
      background: isDarkMode ? colors.background.default : colors.background.default,
      barStyle: isDarkMode ? 'light-content' : 'dark-content',
    },
    privacyIndicator: {
      local: {
        color: colors.privacy.local,
        backgroundColor: isDarkMode 
          ? 'rgba(29, 209, 161, 0.1)' 
          : 'rgba(0, 184, 148, 0.1)',
        borderRadius: 4,
        paddingHorizontal: responsiveSpacing.xs,
        paddingVertical: responsiveSpacing.xxs,
      },
      external: {
        color: colors.privacy.external,
        backgroundColor: isDarkMode 
          ? 'rgba(253, 203, 110, 0.1)' 
          : 'rgba(224, 176, 80, 0.1)',
        borderRadius: 4,
        paddingHorizontal: responsiveSpacing.xs,
        paddingVertical: responsiveSpacing.xxs,
      },
      warning: {
        color: colors.privacy.warning,
        backgroundColor: isDarkMode 
          ? 'rgba(255, 107, 107, 0.1)' 
          : 'rgba(230, 76, 76, 0.1)',
        borderRadius: 4,
        paddingHorizontal: responsiveSpacing.xs,
        paddingVertical: responsiveSpacing.xxs,
      },
    },
  };
  
  // Return the complete theme object
  return {
    colors,
    typography: typographyWithFontFamily,
    spacing: responsiveSpacing,
    components,
  };
};

/**
 * React hook that provides access to the current theme based on device color scheme
 * 
 * @returns Object containing the current theme, isDarkMode flag, and theme utilities
 */
export const useTheme = () => {
  const colorScheme = useColorScheme();
  const theme = createTheme(colorScheme || 'light');
  const isDarkMode = colorScheme === 'dark';
  
  return {
    theme,
    isDarkMode,
    colors: theme.colors,
    typography: theme.typography,
    spacing: theme.spacing,
    components: theme.components,
  };
};

/**
 * Default theme object using system color scheme preference
 * Can be used as a fallback or in contexts where the hook can't be used
 */
export const defaultTheme = createTheme(Appearance.getColorScheme() || 'light');