import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.18.1
import CryptoJS from 'crypto-js'; // v4.1.1
import * as FileSystem from 'react-native-fs'; // v2.20.0
import * as SecureStore from 'expo-secure-store'; // v12.1.1
import { Platform } from 'react-native'; // v0.72.0

// Internal imports
import { formatErrorMessage, logError } from '../../src/utils/errorHandlers';
import { STORAGE_PREFIX, getStorageKey } from '../../src/constants/storageKeys';
import { checkStoragePermission, requestStoragePermission } from '../utils/permissions';

// Global constants
const DEFAULT_ENCRYPTION_KEY = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'personal-ai-agent-default-key';
const SECURE_STORAGE_MAX_SIZE = 2048; // SecureStore has size limitations

/**
 * Encrypts data using AES encryption
 * @param data Data to be encrypted
 * @param key Encryption key (optional, uses default if not provided)
 * @returns Encrypted data as string
 */
export const encryptData = (data: any, key: string = DEFAULT_ENCRYPTION_KEY): string => {
  try {
    // Convert to string if not already a string
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(dataString, key).toString();
  } catch (error) {
    logError(error, 'Encryption Error');
    throw new Error(formatErrorMessage(error, 'Failed to encrypt data'));
  }
};

/**
 * Decrypts data that was encrypted with AES
 * @param encryptedData Encrypted data string
 * @param key Decryption key (optional, uses default if not provided)
 * @returns Decrypted data
 */
export const decryptData = (encryptedData: string, key: string = DEFAULT_ENCRYPTION_KEY): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    // Try to parse as JSON, return as string if not valid JSON
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    logError(error, 'Decryption Error');
    throw new Error(formatErrorMessage(error, 'Failed to decrypt data'));
  }
};

/**
 * Stores data in AsyncStorage with optional encryption
 * @param key Storage key
 * @param value Data to store
 * @param encrypt Whether to encrypt the data (default: false)
 * @returns Promise resolving to true if successful, false otherwise
 */
export const storeData = async (
  key: string,
  value: any,
  encrypt: boolean = false
): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(key);
    
    // Handle null/undefined value (removes the item)
    if (value === null || value === undefined) {
      await AsyncStorage.removeItem(storageKey);
      return true;
    }
    
    // Prepare the value for storage
    let valueToStore: string;
    if (encrypt) {
      valueToStore = encryptData(value);
    } else {
      valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    }
    
    await AsyncStorage.setItem(storageKey, valueToStore);
    return true;
  } catch (error) {
    logError(error, `Error storing data for key: ${key}`);
    return false;
  }
};

/**
 * Retrieves data from AsyncStorage with optional decryption
 * @param key Storage key
 * @param encrypted Whether the data is encrypted (default: false)
 * @returns Promise resolving to retrieved data or null if not found
 */
export const retrieveData = async (
  key: string,
  encrypted: boolean = false
): Promise<any> => {
  try {
    const storageKey = getStorageKey(key);
    const value = await AsyncStorage.getItem(storageKey);
    
    if (value === null || value === undefined) {
      return null;
    }
    
    if (encrypted) {
      return decryptData(value);
    }
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logError(error, `Error retrieving data for key: ${key}`);
    return null;
  }
};

/**
 * Removes data from AsyncStorage
 * @param key Storage key
 * @returns Promise resolving to true if successful, false otherwise
 */
export const removeData = async (key: string): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(key);
    await AsyncStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    logError(error, `Error removing data for key: ${key}`);
    return false;
  }
};

/**
 * Stores sensitive data in SecureStore with encryption
 * @param key Storage key
 * @param value Data to store
 * @returns Promise resolving to true if successful, false otherwise
 */
export const storeSecureData = async (
  key: string,
  value: any
): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(key);
    
    // Handle null/undefined value (removes the item)
    if (value === null || value === undefined) {
      await SecureStore.deleteItemAsync(storageKey);
      return true;
    }
    
    // Convert to string if not already a string
    const valueString = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Check if within SecureStore size limits
    if (valueString.length > SECURE_STORAGE_MAX_SIZE) {
      throw new Error(
        `Data too large for SecureStore (${valueString.length} > ${SECURE_STORAGE_MAX_SIZE})`
      );
    }
    
    await SecureStore.setItemAsync(storageKey, valueString);
    return true;
  } catch (error) {
    logError(error, `Error storing secure data for key: ${key}`);
    return false;
  }
};

/**
 * Retrieves sensitive data from SecureStore
 * @param key Storage key
 * @returns Promise resolving to retrieved data or null if not found
 */
export const retrieveSecureData = async (key: string): Promise<any> => {
  try {
    const storageKey = getStorageKey(key);
    const value = await SecureStore.getItemAsync(storageKey);
    
    if (value === null || value === undefined) {
      return null;
    }
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    logError(error, `Error retrieving secure data for key: ${key}`);
    return null;
  }
};

/**
 * Removes sensitive data from SecureStore
 * @param key Storage key
 * @returns Promise resolving to true if successful, false otherwise
 */
export const removeSecureData = async (key: string): Promise<boolean> => {
  try {
    const storageKey = getStorageKey(key);
    await SecureStore.deleteItemAsync(storageKey);
    return true;
  } catch (error) {
    logError(error, `Error removing secure data for key: ${key}`);
    return false;
  }
};

/**
 * Saves a file to the device's file system
 * @param fileName Name of the file
 * @param content Content to write to the file
 * @param encoding File encoding (default: 'utf8')
 * @returns Promise resolving to the file path if successful
 */
export const saveFile = async (
  fileName: string,
  content: string,
  encoding: string = 'utf8'
): Promise<string> => {
  try {
    // Check and request storage permission if needed
    const hasPermission = await checkStoragePermission();
    if (!hasPermission) {
      const granted = await requestStoragePermission();
      if (!granted) {
        throw new Error('Storage permission denied');
      }
    }
    
    // Determine the appropriate directory path based on platform
    const dirPath = Platform.OS === 'ios' 
      ? `${FileSystem.DocumentDirectoryPath}/personal_ai_agent`
      : `${FileSystem.ExternalDirectoryPath}/personal_ai_agent`;
      
    // Ensure directory exists
    const dirExists = await FileSystem.exists(dirPath);
    if (!dirExists) {
      await FileSystem.mkdir(dirPath);
    }
    
    const filePath = `${dirPath}/${fileName}`;
    await FileSystem.writeFile(filePath, content, { encoding });
    return filePath;
  } catch (error) {
    logError(error, `Error saving file: ${fileName}`);
    throw new Error(formatErrorMessage(error, 'Failed to save file'));
  }
};

/**
 * Reads a file from the device's file system
 * @param filePath Path to the file
 * @param encoding File encoding (default: 'utf8')
 * @returns Promise resolving to the file content
 */
export const readFile = async (
  filePath: string,
  encoding: string = 'utf8'
): Promise<string> => {
  try {
    const fileExists = await FileSystem.exists(filePath);
    if (!fileExists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return await FileSystem.readFile(filePath, { encoding });
  } catch (error) {
    logError(error, `Error reading file: ${filePath}`);
    throw new Error(formatErrorMessage(error, 'Failed to read file'));
  }
};

/**
 * Deletes a file from the device's file system
 * @param filePath Path to the file
 * @returns Promise resolving to true if successful, false otherwise
 */
export const deleteFile = async (filePath: string): Promise<boolean> => {
  try {
    const fileExists = await FileSystem.exists(filePath);
    if (!fileExists) {
      return false;
    }
    
    await FileSystem.unlink(filePath);
    return true;
  } catch (error) {
    logError(error, `Error deleting file: ${filePath}`);
    return false;
  }
};

/**
 * Gets the application's document directory path
 * @returns The document directory path
 */
export const getAppDirectory = (): string => {
  return FileSystem.DocumentDirectoryPath;
};

/**
 * Clears all application data from storage
 * @returns Promise resolving to true if successful, false otherwise
 */
export const clearAllData = async (): Promise<boolean> => {
  try {
    // Clear all data from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
    
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
    
    // Note: SecureStore doesn't provide a way to get all keys
    // The application needs to track secure keys separately
    // or have a predefined list of keys to clear
    
    return true;
  } catch (error) {
    logError(error, 'Error clearing all data');
    return false;
  }
};

/**
 * Gets all storage keys with the application prefix
 * @returns Promise resolving to an array of keys
 */
export const getAllKeys = async (): Promise<string[]> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => key.startsWith(STORAGE_PREFIX));
  } catch (error) {
    logError(error, 'Error getting all keys');
    return [];
  }
};