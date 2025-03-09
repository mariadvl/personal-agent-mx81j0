import AsyncStorage from '@react-native-async-storage/async-storage'; // v1.18.1
import { create } from 'zustand'; // v4.3.8
import { persist } from 'zustand/middleware'; // v4.3.8
import { storeData, retrieveData } from '../services/storageService';

/**
 * Interface for the AsyncStorage adapter used with Zustand persist
 */
interface AsyncStorageAdapter {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

/**
 * Interface for the combined store object
 */
interface StoreInterface {
  // To be expanded as more stores are implemented
  // ui: UIStore;
  // conversation: ConversationStore;
  // memory: MemoryStore;
  // settings: SettingsStore;
  // document: DocumentStore;
  // search: SearchStore;
}

/**
 * Creates a storage adapter for Zustand persist middleware using AsyncStorage
 * @returns Storage adapter compatible with Zustand persist
 */
export const createAsyncStorageAdapter = (): AsyncStorageAdapter => {
  return {
    getItem: async (name: string) => {
      return retrieveData(name, false);
    },
    setItem: async (name: string, value: string) => {
      await storeData(name, value, false);
    },
    removeItem: async (name: string) => {
      await storeData(name, null, false);
    }
  };
};

/**
 * Custom hook that provides access to application stores in one place
 * @returns Object containing application stores
 */
export const useStore = (): StoreInterface => {
  return {
    // This will be populated with imported stores as they are implemented
    // For example:
    // ui: useUIStore(),
    // conversation: useConversationStore(),
    // memory: useMemoryStore(),
    // settings: useSettingsStore(),
    // document: useDocumentStore(),
    // search: useSearchStore(),
  } as StoreInterface;
};