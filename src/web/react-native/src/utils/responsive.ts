import { Dimensions, PixelRatio, Platform, ScaledSize } from 'react-native'; // react-native ^0.72.0
import { useEffect, useState } from 'react'; // react ^18.2.0

// Device screen dimensions
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCALE = SCREEN_WIDTH / 375; // Based on standard iPhone 6/7/8 width as baseline

/**
 * Normalizes a size value based on the device's screen width and pixel ratio
 * 
 * @param size Base size to normalize
 * @returns Normalized size adjusted for the current device
 */
export const normalize = (size: number): number => {
  const newSize = size * SCALE;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(newSize);
  }
};

/**
 * Calculates a width value as a percentage of the screen width
 * 
 * @param percentageWidth Percentage of screen width (0-100)
 * @returns Width in pixels based on the percentage of screen width
 */
export const getResponsiveWidth = (percentageWidth: number): number => {
  return (percentageWidth / 100) * SCREEN_WIDTH;
};

/**
 * Calculates a height value as a percentage of the screen height
 * 
 * @param percentageHeight Percentage of screen height (0-100)
 * @returns Height in pixels based on the percentage of screen height
 */
export const getResponsiveHeight = (percentageHeight: number): number => {
  return (percentageHeight / 100) * SCREEN_HEIGHT;
};

/**
 * Calculates a font size that scales appropriately for different screen sizes
 * 
 * @param baseFontSize Base font size to scale
 * @returns Responsive font size adjusted for the current device
 */
export const getResponsiveFontSize = (baseFontSize: number): number => {
  return normalize(baseFontSize);
};

/**
 * Calculates spacing values that scale appropriately for different screen sizes
 * 
 * @param baseSpacing Base spacing value to scale
 * @returns Responsive spacing value adjusted for the current device
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  return normalize(baseSpacing);
};

/**
 * React hook that provides responsive dimensions and updates when screen size changes
 * 
 * @returns Object containing current screen width, height, and scale factor
 */
export const useResponsiveDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    scale: SCALE
  });

  useEffect(() => {
    const handleDimensionsChange = ({ window }: { window: ScaledSize }) => {
      const width = window.width;
      const height = window.height;
      const scale = width / 375;
      
      setDimensions({ width, height, scale });
    };

    // Set up event listener for dimension changes
    const subscription = Dimensions.addEventListener('change', handleDimensionsChange);

    // Clean up subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);

  return dimensions;
};

/**
 * Determines if the current device has a small screen (width <= 375px)
 * 
 * @returns True if the device has a small screen, false otherwise
 */
export const isSmallDevice = (): boolean => {
  return SCREEN_WIDTH <= 375;
};

/**
 * Determines if the current device has a medium-sized screen (376px <= width <= 767px)
 * 
 * @returns True if the device has a medium-sized screen, false otherwise
 */
export const isMediumDevice = (): boolean => {
  return SCREEN_WIDTH > 375 && SCREEN_WIDTH < 768;
};

/**
 * Determines if the current device has a large screen (width >= 768px)
 * 
 * @returns True if the device has a large screen, false otherwise
 */
export const isLargeDevice = (): boolean => {
  return SCREEN_WIDTH >= 768;
};