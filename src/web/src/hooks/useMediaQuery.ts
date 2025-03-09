import { useState, useEffect, useCallback } from 'react';
import { BREAKPOINTS } from '../constants/uiConstants';

/**
 * A hook that returns whether a given media query matches the current viewport
 * @param query - CSS media query string
 * @returns Whether the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  // Initialize state to track whether the media query matches
  const [matches, setMatches] = useState<boolean>(false);

  // Create a memoized event handler function to update the match state
  const handleChange = useCallback((e: MediaQueryListEvent) => {
    setMatches(e.matches);
  }, []);

  useEffect(() => {
    // Check if window is defined (for SSR compatibility)
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Create a MediaQueryList object for the given query
    const mediaQueryList = window.matchMedia(query);
    
    // Initialize the match state based on the initial match result
    setMatches(mediaQueryList.matches);
    
    // Add an event listener to the MediaQueryList to detect changes
    mediaQueryList.addEventListener('change', handleChange);
    
    // Return a cleanup function that removes the event listener
    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query, handleChange]);

  // Return the current match state
  return matches;
};

/**
 * A convenience hook that checks if the current viewport matches the mobile breakpoint
 * @returns True if the viewport is mobile-sized, false otherwise
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.MOBILE})`);
};

/**
 * A convenience hook that checks if the current viewport matches the tablet breakpoint range
 * @returns True if the viewport is tablet-sized, false otherwise
 */
export const useIsTablet = (): boolean => {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.MOBILE}) and (max-width: ${BREAKPOINTS.TABLET})`
  );
};

/**
 * A convenience hook that checks if the current viewport matches the desktop breakpoint
 * @returns True if the viewport is desktop-sized, false otherwise
 */
export const useIsDesktop = (): boolean => {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.TABLET})`);
};