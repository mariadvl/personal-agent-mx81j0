import { useEffect, useCallback } from 'react';
import {
  useSettingsStore
} from '../store/settingsStore';
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

/**
 * Interface for the object returned by the useSettings hook
 */
interface SettingsHookResult {
  /** The complete user settings object */
  settings: UserSettings;
  /** Whether settings are currently being loaded */
  isLoading: boolean;
  /** Any error that occurred during settings operations */
  error: Error | null;
  /** Whether settings are currently being synchronized with the API */
  isSyncing: boolean;
  
  /**
   * Load settings from local storage or API
   * @param fromApi Whether to fetch from API (true) or local storage (false)
   * @returns Promise resolving to loaded settings
   */
  loadSettings: (fromApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Save complete settings object
   * @param newSettings New settings object
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  saveSettings: (newSettings: UserSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update voice settings
   * @param voiceSettings New voice settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateVoice: (voiceSettings: VoiceSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update personality settings
   * @param personalitySettings New personality settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updatePersonality: (personalitySettings: PersonalitySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update privacy settings
   * @param privacySettings New privacy settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updatePrivacy: (privacySettings: PrivacySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update storage settings
   * @param storageSettings New storage settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateStorage: (storageSettings: StorageSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update LLM settings
   * @param llmSettings New LLM settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateLLM: (llmSettings: LLMSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update search settings
   * @param searchSettings New search settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateSearch: (searchSettings: SearchSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update memory settings
   * @param memorySettings New memory settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateMemory: (memorySettings: MemorySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Reset all settings to default values
   * @param syncWithApi Whether to also sync reset to API
   * @returns Promise resolving to default settings
   */
  resetToDefaults: (syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Export settings as a JSON string
   * @returns Promise resolving to settings JSON string
   */
  exportToJson: () => Promise<string>;
  
  /**
   * Import settings from a JSON string
   * @param settingsJson JSON string containing settings to import
   * @param syncWithApi Whether to also sync imported settings to API
   * @returns Promise resolving to imported settings
   */
  importFromJson: (settingsJson: string, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Synchronize settings with the API server
   * @param pullFromApi Whether to pull from API (true) or push to API (false)
   * @returns Promise resolving to synchronized settings
   */
  syncSettings: (pullFromApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Clear any error in the settings state
   */
  clearSettingsError: () => void;
  
  /**
   * Check if voice features are enabled
   * @returns True if voice features are enabled
   */
  isVoiceEnabled: () => boolean;
  
  /**
   * Check if local storage only mode is enabled
   * @returns True if local storage only mode is enabled
   */
  isLocalStorageOnly: () => boolean;
  
  /**
   * Check if backup is enabled
   * @returns True if backup is enabled
   */
  isBackupEnabled: () => boolean;
  
  /**
   * Check if web search is enabled
   * @returns True if web search is enabled
   */
  isWebSearchEnabled: () => boolean;
  
  /**
   * Check if local LLM is enabled
   * @returns True if local LLM is enabled
   */
  isLocalLLMEnabled: () => boolean;
}

/**
 * A hook that provides access to user settings with simplified interface
 * for the Personal AI Agent application. This hook wraps the settingsStore
 * Zustand store and adds additional utility functions for common settings operations.
 * 
 * @param loadOnMount Whether to load settings when the component mounts (default: false)
 * @returns Object containing settings state and utility functions
 */
function useSettings(loadOnMount = false): SettingsHookResult {
  // Extract everything we need from the settings store
  const {
    settings,
    isLoading,
    error,
    isSyncing,
    loadSettings,
    updateSettings,
    updateVoiceSettings,
    updatePersonalitySettings,
    updatePrivacySettings,
    updateStorageSettings,
    updateLLMSettings,
    updateSearchSettings,
    updateMemorySettings,
    resetSettings,
    exportSettings,
    importSettings,
    syncWithApi,
    clearError
  } = useSettingsStore();

  // Load settings on mount if requested
  useEffect(() => {
    if (loadOnMount) {
      loadSettings();
    }
  }, [loadOnMount, loadSettings]);

  // Create memoized utility functions
  
  // Function to save complete settings
  const saveSettings = useCallback(
    (newSettings: UserSettings, syncWithApi = false) => {
      return updateSettings(newSettings, syncWithApi);
    },
    [updateSettings]
  );

  // Functions for updating specific settings sections
  const updateVoice = useCallback(
    (voiceSettings: VoiceSettings, syncWithApi = false) => {
      return updateVoiceSettings(voiceSettings, syncWithApi);
    },
    [updateVoiceSettings]
  );

  const updatePersonality = useCallback(
    (personalitySettings: PersonalitySettings, syncWithApi = false) => {
      return updatePersonalitySettings(personalitySettings, syncWithApi);
    },
    [updatePersonalitySettings]
  );

  const updatePrivacy = useCallback(
    (privacySettings: PrivacySettings, syncWithApi = false) => {
      return updatePrivacySettings(privacySettings, syncWithApi);
    },
    [updatePrivacySettings]
  );

  const updateStorage = useCallback(
    (storageSettings: StorageSettings, syncWithApi = false) => {
      return updateStorageSettings(storageSettings, syncWithApi);
    },
    [updateStorageSettings]
  );

  const updateLLM = useCallback(
    (llmSettings: LLMSettings, syncWithApi = false) => {
      return updateLLMSettings(llmSettings, syncWithApi);
    },
    [updateLLMSettings]
  );

  const updateSearch = useCallback(
    (searchSettings: SearchSettings, syncWithApi = false) => {
      return updateSearchSettings(searchSettings, syncWithApi);
    },
    [updateSearchSettings]
  );

  const updateMemory = useCallback(
    (memorySettings: MemorySettings, syncWithApi = false) => {
      return updateMemorySettings(memorySettings, syncWithApi);
    },
    [updateMemorySettings]
  );

  // Functions for resetting, exporting, importing
  const resetToDefaults = useCallback(
    (syncWithApi = false) => {
      return resetSettings(syncWithApi);
    },
    [resetSettings]
  );

  const exportToJson = useCallback(() => {
    return exportSettings();
  }, [exportSettings]);

  const importFromJson = useCallback(
    (settingsJson: string, syncWithApi = false) => {
      return importSettings(settingsJson, syncWithApi);
    },
    [importSettings]
  );

  // Sync and error handling
  const syncSettings = useCallback(
    (pullFromApi = true) => {
      return syncWithApi(pullFromApi);
    },
    [syncWithApi]
  );

  const clearSettingsError = useCallback(() => {
    clearError();
  }, [clearError]);

  // Helper functions for checking settings
  const isVoiceEnabled = useCallback(() => {
    return settings.voice_settings.enabled;
  }, [settings.voice_settings]);

  const isLocalStorageOnly = useCallback(() => {
    return settings.privacy_settings.local_storage_only;
  }, [settings.privacy_settings]);

  const isBackupEnabled = useCallback(() => {
    return settings.storage_settings.backup_enabled;
  }, [settings.storage_settings]);

  const isWebSearchEnabled = useCallback(() => {
    return settings.search_settings.enabled;
  }, [settings.search_settings]);

  const isLocalLLMEnabled = useCallback(() => {
    return settings.llm_settings.use_local_llm;
  }, [settings.llm_settings]);

  // Return all the state and functions
  return {
    settings,
    isLoading,
    error,
    isSyncing,
    loadSettings,
    saveSettings,
    updateVoice,
    updatePersonality,
    updatePrivacy,
    updateStorage,
    updateLLM,
    updateSearch,
    updateMemory,
    resetToDefaults,
    exportToJson,
    importFromJson,
    syncSettings,
    clearSettingsError,
    isVoiceEnabled,
    isLocalStorageOnly,
    isBackupEnabled,
    isWebSearchEnabled,
    isLocalLLMEnabled,
  };
}

export default useSettings;