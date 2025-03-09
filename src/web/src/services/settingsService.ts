import {
  UserSettings,
  VoiceSettings,
  PersonalitySettings,
  PrivacySettings,
  StorageSettings,
  LLMSettings,
  SearchSettings,
  MemorySettings
} from '../types/settings';

import {
  DEFAULT_USER_SETTINGS,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_PERSONALITY_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  DEFAULT_STORAGE_SETTINGS,
  DEFAULT_LLM_SETTINGS,
  DEFAULT_SEARCH_SETTINGS,
  DEFAULT_MEMORY_SETTINGS
} from '../constants/defaultSettings';

import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_ROUTES } from '../constants/apiRoutes';
import { setLocalStorage, getLocalStorage } from '../utils/storage';
import { formatErrorMessage } from '../utils/errorHandlers';
import { get, post, put } from './api';

/**
 * Retrieves user settings from local storage or API
 * @param fromApi Whether to fetch from API or local storage
 * @returns Promise resolving to user settings
 */
export async function getSettings(fromApi: boolean = false): Promise<UserSettings> {
  try {
    if (fromApi) {
      // Try fetching from API first
      const response = await get<UserSettings>(API_ROUTES.SETTINGS.BASE);
      
      if (response.success && response.data) {
        // Save API response to local storage
        setLocalStorage(STORAGE_KEYS.USER_SETTINGS, response.data);
        return response.data;
      }
      
      // If API fails, fall back to local storage
      console.warn('Failed to fetch settings from API, using local settings instead');
    }
    
    // Get from local storage
    const storedSettings = getLocalStorage(STORAGE_KEYS.USER_SETTINGS);
    
    // If no settings found, use defaults
    if (!storedSettings) {
      console.info('No settings found in local storage, using defaults');
      setLocalStorage(STORAGE_KEYS.USER_SETTINGS, DEFAULT_USER_SETTINGS);
      return DEFAULT_USER_SETTINGS;
    }
    
    return storedSettings as UserSettings;
  } catch (error) {
    console.error('Error getting settings:', formatErrorMessage(error));
    // Return default settings if anything goes wrong
    return DEFAULT_USER_SETTINGS;
  }
}

/**
 * Updates the complete user settings
 * @param settings The settings object to save
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateSettings(
  settings: UserSettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, settings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, settings);
      
      if (!response.success) {
        console.warn('Failed to sync settings with API:', response.error);
      }
    }
    
    return settings;
  } catch (error) {
    console.error('Error updating settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the voice settings portion
 * @param voiceSettings The voice settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateVoiceSettings(
  voiceSettings: VoiceSettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      voice_settings: voiceSettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<VoiceSettings>(API_ROUTES.SETTINGS.VOICE, voiceSettings);
      
      if (!response.success) {
        console.warn('Failed to sync voice settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating voice settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the personality settings portion
 * @param personalitySettings The personality settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updatePersonalitySettings(
  personalitySettings: PersonalitySettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      personality_settings: personalitySettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<PersonalitySettings>(
        API_ROUTES.SETTINGS.PERSONALITY, 
        personalitySettings
      );
      
      if (!response.success) {
        console.warn('Failed to sync personality settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating personality settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the privacy settings portion
 * @param privacySettings The privacy settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updatePrivacySettings(
  privacySettings: PrivacySettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      privacy_settings: privacySettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<PrivacySettings>(
        API_ROUTES.SETTINGS.PRIVACY, 
        privacySettings
      );
      
      if (!response.success) {
        console.warn('Failed to sync privacy settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating privacy settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the storage settings portion
 * @param storageSettings The storage settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateStorageSettings(
  storageSettings: StorageSettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      storage_settings: storageSettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<StorageSettings>(
        API_ROUTES.SETTINGS.STORAGE, 
        storageSettings
      );
      
      if (!response.success) {
        console.warn('Failed to sync storage settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating storage settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the LLM settings portion
 * @param llmSettings The LLM settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateLLMSettings(
  llmSettings: LLMSettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      llm_settings: llmSettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      // Use main settings endpoint since there's no specific LLM endpoint in API_ROUTES
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, updatedSettings);
      
      if (!response.success) {
        console.warn('Failed to sync LLM settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating LLM settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the search settings portion
 * @param searchSettings The search settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateSearchSettings(
  searchSettings: SearchSettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      search_settings: searchSettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      // Use main settings endpoint since there's no specific search endpoint in API_ROUTES
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, updatedSettings);
      
      if (!response.success) {
        console.warn('Failed to sync search settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating search settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Updates only the memory settings portion
 * @param memorySettings The memory settings to update
 * @param syncWithApi Whether to also send settings to API
 * @returns Promise resolving to updated settings
 */
export async function updateMemorySettings(
  memorySettings: MemorySettings,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Get current settings
    const currentSettings = await getSettings();
    
    // Create updated settings
    const updatedSettings: UserSettings = {
      ...currentSettings,
      memory_settings: memorySettings
    };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, updatedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      // Use main settings endpoint since there's no specific memory endpoint in API_ROUTES
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, updatedSettings);
      
      if (!response.success) {
        console.warn('Failed to sync memory settings with API:', response.error);
      }
    }
    
    return updatedSettings;
  } catch (error) {
    console.error('Error updating memory settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Resets all settings to default values
 * @param syncWithApi Whether to also send reset to API
 * @returns Promise resolving to default settings
 */
export async function resetSettings(syncWithApi: boolean = false): Promise<UserSettings> {
  try {
    // Use default settings
    const defaultSettings = { ...DEFAULT_USER_SETTINGS, id: 'default' };
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, defaultSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await post<UserSettings>(API_ROUTES.SETTINGS.RESET, {});
      
      if (!response.success) {
        console.warn('Failed to reset settings in API:', response.error);
      }
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Error resetting settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Exports settings as a JSON string
 * @returns Promise resolving to settings JSON string
 */
export async function exportSettings(): Promise<string> {
  try {
    const settings = await getSettings();
    return JSON.stringify(settings, null, 2);
  } catch (error) {
    console.error('Error exporting settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Imports settings from a JSON string
 * @param settingsJson The JSON string containing settings to import
 * @param syncWithApi Whether to also send imported settings to API
 * @returns Promise resolving to imported settings
 */
export async function importSettings(
  settingsJson: string,
  syncWithApi: boolean = false
): Promise<UserSettings> {
  try {
    // Parse settings JSON
    const parsedSettings = JSON.parse(settingsJson);
    
    // Validate the settings object
    if (!validateSettings(parsedSettings)) {
      throw new Error('Invalid settings format');
    }
    
    // Save to local storage
    setLocalStorage(STORAGE_KEYS.USER_SETTINGS, parsedSettings);
    
    // Sync with API if requested
    if (syncWithApi) {
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, parsedSettings);
      
      if (!response.success) {
        console.warn('Failed to sync imported settings with API:', response.error);
      }
    }
    
    return parsedSettings;
  } catch (error) {
    console.error('Error importing settings:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Synchronizes settings with the backend API
 * @param pullFromApi Whether to pull from API (true) or push to API (false)
 * @returns Promise resolving to synchronized settings
 */
export async function syncSettingsWithApi(pullFromApi: boolean = true): Promise<UserSettings> {
  try {
    if (pullFromApi) {
      // Pull from API and update local storage
      const response = await get<UserSettings>(API_ROUTES.SETTINGS.BASE);
      
      if (response.success && response.data) {
        setLocalStorage(STORAGE_KEYS.USER_SETTINGS, response.data);
        return response.data;
      } else {
        throw new Error(`Failed to fetch settings: ${response.error}`);
      }
    } else {
      // Push local settings to API
      const localSettings = await getSettings();
      const response = await put<UserSettings>(API_ROUTES.SETTINGS.BASE, localSettings);
      
      if (!response.success) {
        throw new Error(`Failed to update API settings: ${response.error}`);
      }
      
      return localSettings;
    }
  } catch (error) {
    console.error('Error syncing settings with API:', formatErrorMessage(error));
    throw error;
  }
}

/**
 * Validates settings object structure and types
 * @param settings The settings object to validate
 * @returns True if settings are valid, false otherwise
 */
export function validateSettings(settings: any): boolean {
  // Check if settings is an object
  if (!settings || typeof settings !== 'object') {
    return false;
  }
  
  // Check required properties
  const requiredProps = [
    'id',
    'voice_settings',
    'personality_settings', 
    'privacy_settings',
    'storage_settings',
    'llm_settings',
    'search_settings',
    'memory_settings'
  ];
  
  for (const prop of requiredProps) {
    if (!(prop in settings) || !settings[prop] || typeof settings[prop] !== 'object') {
      return false;
    }
  }
  
  // Basic validation passed
  return true;
}