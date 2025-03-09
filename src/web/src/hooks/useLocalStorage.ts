import { useState, useEffect, useCallback } from 'react';
import { setLocalStorage, getLocalStorage, removeLocalStorage } from '../utils/storage';
import { STORAGE_KEYS, getStorageKey } from '../constants/storageKeys';

/**
 * A custom React hook that provides a stateful interface for interacting with browser's localStorage,
 * with support for automatic serialization/deserialization of JSON data and optional encryption
 * for sensitive information.
 * 
 * @param key - The key to store/retrieve data from localStorage
 * @param initialValue - The initial value to use if no data exists in localStorage
 * @param encrypt - Whether to encrypt the data in localStorage (default: false)
 * @returns [storedValue, setValue, removeValue] - The current value, a function to update the value, and a function to remove the value
 */
const useLocalStorage = <T>(key: string, initialValue: T, encrypt: boolean = false): [T, (value: T | ((val: T) => T)) => void, () => void] => {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      // Get from localStorage by key
      const item = getLocalStorage(key, encrypt);
      // Return stored value or initialValue if null
      return item !== null ? item : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error retrieving ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to localStorage
      setLocalStorage(key, valueToStore, encrypt);
    } catch (error) {
      console.error(`Error storing ${key} in localStorage:`, error);
    }
  }, [key, encrypt, storedValue]);

  // Remove from localStorage and state
  const removeValue = useCallback(() => {
    try {
      // Remove from localStorage
      removeLocalStorage(key);
      // Reset state to initial value
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to localStorage in other tabs/windows
  useEffect(() => {
    // Get the prefixed storage key that our utility functions use
    const prefixedKey = getStorageKey(key);
    
    // Handle storage events (only fires for changes in other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      // Check if this event is for our key
      if (e.key === prefixedKey) {
        try {
          // Get the current value from localStorage using our utility
          const newValue = getLocalStorage(key, encrypt);
          // Update state with the new value or initialValue if removed
          setStoredValue(newValue !== null ? newValue : initialValue);
        } catch (error) {
          console.error(`Error handling storage event for ${key}:`, error);
        }
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, encrypt, initialValue]);

  return [storedValue, setValue, removeValue];
};

export default useLocalStorage;