import { useState, useEffect, useRef } from 'react';

/**
 * A custom React hook that delays the update of a value until after a specified
 * delay has passed. This is useful for preventing excessive function calls
 * in scenarios like search inputs, where you want to wait until the user has
 * stopped typing before making API calls.
 * 
 * @example
 * // In a search component:
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * // Use debouncedSearchTerm for API calls, it will only update
 * // 500ms after the user has stopped typing
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     searchMemories(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 * 
 * @template T The type of the value to debounce
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 500ms)
 * @returns The debounced value that updates only after the specified delay
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  // Store the timeout ID so we can clear it if value changes
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear the previous timeout when value or delay changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to update the debounced value after the delay
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout when the component unmounts or dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]); // Re-run the effect when value or delay changes

  // Return the current debounced value
  return debouncedValue;
}