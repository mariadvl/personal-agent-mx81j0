/**
 * Settings Store for Personal AI Agent
 * 
 * This store manages user settings and preferences for the application, including:
 * - Voice settings for speech recognition and synthesis
 * - Personality settings for AI's response style
 * - Privacy settings for data storage and sharing
 * - Storage settings for backups and file handling
 * - LLM settings for model configuration
 * - Search settings for web search preferences
 * - Memory settings for vector database configuration
 * 
 * The store follows the local-first approach, storing all settings locally by default,
 * with optional synchronization to a backend API if enabled by the user.
 */

import { create } from 'zustand'; // zustand ^4.4.0
import { devtools, persist } from 'zustand/middleware'; // zustand/middleware ^4.4.0
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

import { DEFAULT_USER_SETTINGS } from '../constants/defaultSettings';

import {
  getSettings,
  updateSettings as updateSettingsService,
  updateVoiceSettings as updateVoiceSettingsService,
  updatePersonalitySettings as updatePersonalitySettingsService,
  updatePrivacySettings as updatePrivacySettingsService,
  updateStorageSettings as updateStorageSettingsService,
  updateLLMSettings as updateLLMSettingsService,
  updateSearchSettings as updateSearchSettingsService,
  updateMemorySettings as updateMemorySettingsService,
  resetSettings as resetSettingsService,
  exportSettings as exportSettingsService,
  importSettings as importSettingsService,
  syncSettingsWithApi
} from '../services/settingsService';

// Store name constant for persistence and dev tools
const STORE_NAME = 'settingsStore';

/**
 * Interface for the settings store state
 */
interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  error: Error | null;
  isSyncing: boolean;
}

/**
 * Interface for the settings store actions
 */
interface SettingsActions {
  /**
   * Load settings from local storage or API
   * @param fromApi Whether to fetch from API (true) or local storage (false)
   * @returns Promise resolving to loaded settings
   */
  loadSettings: (fromApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update complete settings object
   * @param settings New settings object
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateSettings: (settings: UserSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update voice settings
   * @param voiceSettings New voice settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateVoiceSettings: (voiceSettings: VoiceSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update personality settings
   * @param personalitySettings New personality settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updatePersonalitySettings: (personalitySettings: PersonalitySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update privacy settings
   * @param privacySettings New privacy settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updatePrivacySettings: (privacySettings: PrivacySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update storage settings
   * @param storageSettings New storage settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateStorageSettings: (storageSettings: StorageSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update LLM settings
   * @param llmSettings New LLM settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateLLMSettings: (llmSettings: LLMSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update search settings
   * @param searchSettings New search settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateSearchSettings: (searchSettings: SearchSettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Update memory settings
   * @param memorySettings New memory settings
   * @param syncWithApi Whether to also sync with API
   * @returns Promise resolving to updated settings
   */
  updateMemorySettings: (memorySettings: MemorySettings, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Reset all settings to default values
   * @param syncWithApi Whether to also sync reset to API
   * @returns Promise resolving to default settings
   */
  resetSettings: (syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Export settings as a JSON string
   * @returns Promise resolving to settings JSON string
   */
  exportSettings: () => Promise<string>;
  
  /**
   * Import settings from a JSON string
   * @param settingsJson JSON string containing settings to import
   * @param syncWithApi Whether to also sync imported settings to API
   * @returns Promise resolving to imported settings
   */
  importSettings: (settingsJson: string, syncWithApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Synchronize settings with the API server
   * @param pullFromApi Whether to pull from API (true) or push to API (false)
   * @returns Promise resolving to synchronized settings
   */
  syncWithApi: (pullFromApi?: boolean) => Promise<UserSettings>;
  
  /**
   * Clear any error in the settings state
   */
  clearError: () => void;
}

/**
 * Combined interface for the settings store state and actions
 */
interface SettingsStore extends SettingsState, SettingsActions {}

/**
 * Zustand store for settings state management
 * Manages user preferences, application configuration, and synchronization
 */
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        settings: DEFAULT_USER_SETTINGS,
        isLoading: false,
        error: null,
        isSyncing: false,
        
        // Actions
        loadSettings: async (fromApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await getSettings(fromApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateSettings: async (newSettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateSettingsService(newSettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateVoiceSettings: async (voiceSettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateVoiceSettingsService(voiceSettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updatePersonalitySettings: async (personalitySettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updatePersonalitySettingsService(personalitySettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updatePrivacySettings: async (privacySettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updatePrivacySettingsService(privacySettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateStorageSettings: async (storageSettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateStorageSettingsService(storageSettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateLLMSettings: async (llmSettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateLLMSettingsService(llmSettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateSearchSettings: async (searchSettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateSearchSettingsService(searchSettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        updateMemorySettings: async (memorySettings, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await updateMemorySettingsService(memorySettings, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        resetSettings: async (syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await resetSettingsService(syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        exportSettings: async () => {
          try {
            return await exportSettingsService();
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error))
            });
            throw error;
          }
        },
        
        importSettings: async (settingsJson, syncWithApi = false) => {
          set({ isLoading: true, error: null });
          try {
            const settings = await importSettingsService(settingsJson, syncWithApi);
            set({ settings, isLoading: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isLoading: false 
            });
            return get().settings;
          }
        },
        
        syncWithApi: async (pullFromApi = true) => {
          set({ isSyncing: true, error: null });
          try {
            const settings = await syncSettingsWithApi(pullFromApi);
            set({ settings, isSyncing: false });
            return settings;
          } catch (error) {
            set({ 
              error: error instanceof Error ? error : new Error(String(error)),
              isSyncing: false 
            });
            return get().settings;
          }
        },
        
        clearError: () => set({ error: null })
      }),
      {
        name: STORE_NAME,
        // Only persist the settings, not the loading state or errors
        partialize: (state) => ({ settings: state.settings }),
      }
    ),
    { name: STORE_NAME }
  )
);