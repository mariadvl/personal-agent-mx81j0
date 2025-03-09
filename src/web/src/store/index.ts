import useAuthStore from './authStore';
import { useConversationStore } from './conversationStore';
import useMemoryStore from './memoryStore';
import { useSettingsStore } from './settingsStore';
import { useUIStore } from './uiStore';
import useDocumentStore from './documentStore';

/**
 * Interface for the combined store object
 */
interface StoreInterface {
  auth: typeof useAuthStore;
  conversation: typeof useConversationStore;
  memory: typeof useMemoryStore;
  settings: typeof useSettingsStore;
  ui: typeof useUIStore;
  document: typeof useDocumentStore;
}

/**
 * Custom hook that provides access to all application stores in one place
 * @returns Object containing all application stores
 */
const useStore = (): StoreInterface => {
  // Create a store object that combines all individual stores
  const store = {
    auth: useAuthStore,
    conversation: useConversationStore,
    memory: useMemoryStore,
    settings: useSettingsStore,
    ui: useUIStore,
    document: useDocumentStore,
  };

  // Return the combined store object for use in components
  return store;
};

/**
 * Re-export authentication store for direct access
 */
export { useAuthStore };

/**
 * Re-export conversation store for direct access
 */
export { useConversationStore };

/**
 * Re-export memory store for direct access
 */
export { useMemoryStore };

/**
 * Re-export settings store for direct access
 */
export { useSettingsStore };

/**
 * Re-export UI store for direct access
 */
export { useUIStore };

/**
 * Re-export document store for direct access
 */
export { useDocumentStore };

/**
 * Export combined store hook for accessing all stores in one place
 */
export { useStore };