/**
 * Storage Service for Personal AI Agent
 * 
 * This service provides a high-level interface for data storage operations,
 * abstracting the underlying storage mechanisms (localStorage, IndexedDB) and
 * providing appropriate error handling and encryption for the Personal AI Agent.
 */

import { 
  STORAGE_KEYS, 
  INDEXED_DB_STORES 
} from '../constants/storageKeys';

import {
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  initializeIndexedDB,
  getIndexedDB,
  getAllIndexedDB,
  setIndexedDB,
  removeIndexedDB,
  clearIndexedDBStore,
  queryIndexedDB
} from '../utils/storage';

import {
  formatErrorMessage,
  logError
} from '../utils/errorHandlers';

// Constants
const DB_VERSION = 1;
const DEFAULT_ENCRYPTION_ENABLED = true;

/**
 * Stores user settings in localStorage with encryption
 * @param settings - The user settings object to store
 * @returns Promise resolving to true if successful
 */
export async function storeUserSettings(settings: object): Promise<boolean> {
  try {
    return setLocalStorage(STORAGE_KEYS.USER_SETTINGS, settings, DEFAULT_ENCRYPTION_ENABLED);
  } catch (error) {
    logError(error, 'Error storing user settings');
    return false;
  }
}

/**
 * Retrieves user settings from localStorage with decryption
 * @returns Promise resolving to user settings or null if not found
 */
export async function getUserSettings(): Promise<object | null> {
  try {
    return getLocalStorage(STORAGE_KEYS.USER_SETTINGS, DEFAULT_ENCRYPTION_ENABLED);
  } catch (error) {
    logError(error, 'Error retrieving user settings');
    return null;
  }
}

/**
 * Securely stores API keys in localStorage with encryption
 * @param apiKeys - The API keys object to store
 * @returns Promise resolving to true if successful
 */
export async function storeApiKeys(apiKeys: object): Promise<boolean> {
  try {
    return setLocalStorage(STORAGE_KEYS.API_KEYS, apiKeys, DEFAULT_ENCRYPTION_ENABLED);
  } catch (error) {
    logError(error, 'Error storing API keys');
    return false;
  }
}

/**
 * Retrieves API keys from localStorage with decryption
 * @returns Promise resolving to API keys or null if not found
 */
export async function getApiKeys(): Promise<object | null> {
  try {
    return getLocalStorage(STORAGE_KEYS.API_KEYS, DEFAULT_ENCRYPTION_ENABLED);
  } catch (error) {
    logError(error, 'Error retrieving API keys');
    return null;
  }
}

/**
 * Stores a conversation in IndexedDB
 * @param conversation - The conversation object to store
 * @returns Promise resolving to true if successful
 */
export async function storeConversation(conversation: object): Promise<boolean> {
  try {
    await setIndexedDB(INDEXED_DB_STORES.CONVERSATIONS, conversation, (conversation as any).id);
    
    // Update recent conversations list
    const recentConversations = await getRecentConversations();
    const conversationId = (conversation as any).id;
    
    // Add to recent conversations if not already present
    if (!recentConversations.includes(conversationId)) {
      // Add to beginning of array (most recent)
      recentConversations.unshift(conversationId);
      // Limit to 10 recent conversations
      const limitedRecent = recentConversations.slice(0, 10);
      await storeRecentConversations(limitedRecent);
    }
    
    return true;
  } catch (error) {
    logError(error, 'Error storing conversation');
    return false;
  }
}

/**
 * Retrieves a conversation from IndexedDB by ID
 * @param conversationId - The ID of the conversation to retrieve
 * @returns Promise resolving to the conversation or null if not found
 */
export async function getConversation(conversationId: string): Promise<object | null> {
  try {
    return await getIndexedDB(INDEXED_DB_STORES.CONVERSATIONS, conversationId);
  } catch (error) {
    logError(error, 'Error retrieving conversation');
    return null;
  }
}

/**
 * Retrieves all conversations from IndexedDB
 * @returns Promise resolving to an array of conversations
 */
export async function getAllConversations(): Promise<object[]> {
  try {
    return await getAllIndexedDB(INDEXED_DB_STORES.CONVERSATIONS);
  } catch (error) {
    logError(error, 'Error retrieving all conversations');
    return [];
  }
}

/**
 * Deletes a conversation and its messages from IndexedDB
 * @param conversationId - The ID of the conversation to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    // Delete the conversation
    await removeIndexedDB(INDEXED_DB_STORES.CONVERSATIONS, conversationId);
    
    // Delete all messages for this conversation
    const messages = await queryIndexedDB(INDEXED_DB_STORES.MESSAGES, 'conversation_id', conversationId);
    for (const message of messages) {
      await removeIndexedDB(INDEXED_DB_STORES.MESSAGES, message.id);
    }
    
    // Update recent conversations list
    const recentConversations = await getRecentConversations();
    const updatedRecent = recentConversations.filter(id => id !== conversationId);
    await storeRecentConversations(updatedRecent);
    
    return true;
  } catch (error) {
    logError(error, 'Error deleting conversation');
    return false;
  }
}

/**
 * Stores a message in IndexedDB
 * @param message - The message object to store
 * @returns Promise resolving to true if successful
 */
export async function storeMessage(message: object): Promise<boolean> {
  try {
    await setIndexedDB(INDEXED_DB_STORES.MESSAGES, message, (message as any).id);
    return true;
  } catch (error) {
    logError(error, 'Error storing message');
    return false;
  }
}

/**
 * Retrieves all messages for a specific conversation
 * @param conversationId - The ID of the conversation
 * @returns Promise resolving to an array of messages
 */
export async function getMessagesForConversation(conversationId: string): Promise<object[]> {
  try {
    const messages = await queryIndexedDB(INDEXED_DB_STORES.MESSAGES, 'conversation_id', conversationId);
    
    // Sort messages by timestamp (oldest first)
    return messages.sort((a: any, b: any) => {
      const timestampA = new Date(a.timestamp || a.created_at).getTime();
      const timestampB = new Date(b.timestamp || b.created_at).getTime();
      return timestampA - timestampB;
    });
  } catch (error) {
    logError(error, 'Error retrieving messages for conversation');
    return [];
  }
}

/**
 * Stores a memory item in IndexedDB
 * @param memoryItem - The memory item object to store
 * @returns Promise resolving to true if successful
 */
export async function storeMemoryItem(memoryItem: object): Promise<boolean> {
  try {
    await setIndexedDB(INDEXED_DB_STORES.MEMORY_ITEMS, memoryItem, (memoryItem as any).id);
    return true;
  } catch (error) {
    logError(error, 'Error storing memory item');
    return false;
  }
}

/**
 * Retrieves a memory item from IndexedDB by ID
 * @param memoryId - The ID of the memory item to retrieve
 * @returns Promise resolving to the memory item or null if not found
 */
export async function getMemoryItem(memoryId: string): Promise<object | null> {
  try {
    return await getIndexedDB(INDEXED_DB_STORES.MEMORY_ITEMS, memoryId);
  } catch (error) {
    logError(error, 'Error retrieving memory item');
    return null;
  }
}

/**
 * Retrieves all memory items from IndexedDB
 * @returns Promise resolving to an array of memory items
 */
export async function getAllMemoryItems(): Promise<object[]> {
  try {
    return await getAllIndexedDB(INDEXED_DB_STORES.MEMORY_ITEMS);
  } catch (error) {
    logError(error, 'Error retrieving all memory items');
    return [];
  }
}

/**
 * Deletes a memory item from IndexedDB
 * @param memoryId - The ID of the memory item to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteMemoryItem(memoryId: string): Promise<boolean> {
  try {
    await removeIndexedDB(INDEXED_DB_STORES.MEMORY_ITEMS, memoryId);
    return true;
  } catch (error) {
    logError(error, 'Error deleting memory item');
    return false;
  }
}

/**
 * Stores a document in IndexedDB
 * @param document - The document object to store
 * @returns Promise resolving to true if successful
 */
export async function storeDocument(document: object): Promise<boolean> {
  try {
    await setIndexedDB(INDEXED_DB_STORES.DOCUMENTS, document, (document as any).id);
    
    // Update recent documents list
    const recentDocuments = await getRecentDocuments();
    const documentId = (document as any).id;
    
    // Add to recent documents if not already present
    if (!recentDocuments.includes(documentId)) {
      // Add to beginning of array (most recent)
      recentDocuments.unshift(documentId);
      // Limit to 10 recent documents
      const limitedRecent = recentDocuments.slice(0, 10);
      await storeRecentDocuments(limitedRecent);
    }
    
    return true;
  } catch (error) {
    logError(error, 'Error storing document');
    return false;
  }
}

/**
 * Retrieves a document from IndexedDB by ID
 * @param documentId - The ID of the document to retrieve
 * @returns Promise resolving to the document or null if not found
 */
export async function getDocument(documentId: string): Promise<object | null> {
  try {
    return await getIndexedDB(INDEXED_DB_STORES.DOCUMENTS, documentId);
  } catch (error) {
    logError(error, 'Error retrieving document');
    return null;
  }
}

/**
 * Retrieves all documents from IndexedDB
 * @returns Promise resolving to an array of documents
 */
export async function getAllDocuments(): Promise<object[]> {
  try {
    return await getAllIndexedDB(INDEXED_DB_STORES.DOCUMENTS);
  } catch (error) {
    logError(error, 'Error retrieving all documents');
    return [];
  }
}

/**
 * Deletes a document from IndexedDB
 * @param documentId - The ID of the document to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    await removeIndexedDB(INDEXED_DB_STORES.DOCUMENTS, documentId);
    
    // Update recent documents list
    const recentDocuments = await getRecentDocuments();
    const updatedRecent = recentDocuments.filter(id => id !== documentId);
    await storeRecentDocuments(updatedRecent);
    
    return true;
  } catch (error) {
    logError(error, 'Error deleting document');
    return false;
  }
}

/**
 * Stores the list of recent conversations in localStorage
 * @param conversationIds - Array of conversation IDs
 * @returns Promise resolving to true if successful
 */
export async function storeRecentConversations(conversationIds: string[]): Promise<boolean> {
  try {
    return setLocalStorage(STORAGE_KEYS.RECENT_CONVERSATIONS, conversationIds, false);
  } catch (error) {
    logError(error, 'Error storing recent conversations');
    return false;
  }
}

/**
 * Retrieves the list of recent conversations from localStorage
 * @returns Promise resolving to an array of conversation IDs
 */
export async function getRecentConversations(): Promise<string[]> {
  try {
    const recent = getLocalStorage(STORAGE_KEYS.RECENT_CONVERSATIONS, false);
    return Array.isArray(recent) ? recent : [];
  } catch (error) {
    logError(error, 'Error retrieving recent conversations');
    return [];
  }
}

/**
 * Stores the list of recent documents in localStorage
 * @param documentIds - Array of document IDs
 * @returns Promise resolving to true if successful
 */
export async function storeRecentDocuments(documentIds: string[]): Promise<boolean> {
  try {
    return setLocalStorage(STORAGE_KEYS.RECENT_DOCUMENTS, documentIds, false);
  } catch (error) {
    logError(error, 'Error storing recent documents');
    return false;
  }
}

/**
 * Retrieves the list of recent documents from localStorage
 * @returns Promise resolving to an array of document IDs
 */
export async function getRecentDocuments(): Promise<string[]> {
  try {
    const recent = getLocalStorage(STORAGE_KEYS.RECENT_DOCUMENTS, false);
    return Array.isArray(recent) ? recent : [];
  } catch (error) {
    logError(error, 'Error retrieving recent documents');
    return [];
  }
}

/**
 * Clears all application data from storage
 * @returns Promise resolving to true if successful
 */
export async function clearAllData(): Promise<boolean> {
  try {
    // Clear all IndexedDB stores
    await clearIndexedDBStore(INDEXED_DB_STORES.CONVERSATIONS);
    await clearIndexedDBStore(INDEXED_DB_STORES.MESSAGES);
    await clearIndexedDBStore(INDEXED_DB_STORES.MEMORY_ITEMS);
    await clearIndexedDBStore(INDEXED_DB_STORES.DOCUMENTS);
    await clearIndexedDBStore(INDEXED_DB_STORES.WEB_PAGES);
    
    // Clear localStorage items
    removeLocalStorage(STORAGE_KEYS.USER_SETTINGS);
    removeLocalStorage(STORAGE_KEYS.API_KEYS);
    removeLocalStorage(STORAGE_KEYS.RECENT_CONVERSATIONS);
    removeLocalStorage(STORAGE_KEYS.RECENT_DOCUMENTS);
    
    return true;
  } catch (error) {
    logError(error, 'Error clearing all data');
    return false;
  }
}

/**
 * Exports all application data as a JSON string
 * @param includeSettings - Whether to include user settings in the export
 * @param includeConversations - Whether to include conversations in the export
 * @param includeMemory - Whether to include memory items in the export
 * @param includeDocuments - Whether to include documents in the export
 * @returns Promise resolving to a JSON string of exported data
 */
export async function exportData(
  includeSettings: boolean = true,
  includeConversations: boolean = true,
  includeMemory: boolean = true,
  includeDocuments: boolean = true
): Promise<string> {
  try {
    const exportData: any = {
      version: DB_VERSION,
      timestamp: new Date().toISOString(),
      data: {}
    };
    
    // Include user settings if requested
    if (includeSettings) {
      exportData.data.userSettings = await getUserSettings();
    }
    
    // Include conversations and messages if requested
    if (includeConversations) {
      const conversations = await getAllConversations();
      exportData.data.conversations = conversations;
      
      // Include messages for each conversation
      exportData.data.messages = [];
      for (const conversation of conversations) {
        const conversationId = (conversation as any).id;
        const messages = await getMessagesForConversation(conversationId);
        exportData.data.messages.push(...messages);
      }
    }
    
    // Include memory items if requested
    if (includeMemory) {
      exportData.data.memoryItems = await getAllMemoryItems();
    }
    
    // Include documents if requested
    if (includeDocuments) {
      exportData.data.documents = await getAllDocuments();
    }
    
    return JSON.stringify(exportData);
  } catch (error) {
    logError(error, 'Error exporting data');
    throw new Error(formatErrorMessage(error, 'Failed to export data'));
  }
}

/**
 * Imports application data from a JSON string
 * @param jsonData - JSON string of data to import
 * @param clearExisting - Whether to clear existing data before import
 * @returns Promise resolving to true if successful
 */
export async function importData(jsonData: string, clearExisting: boolean = false): Promise<boolean> {
  try {
    const importData = JSON.parse(jsonData);
    
    // Validate the structure of the imported data
    if (!importData.version || !importData.data) {
      throw new Error('Invalid import data format');
    }
    
    // Clear existing data if requested
    if (clearExisting) {
      await clearAllData();
    }
    
    // Import user settings if present
    if (importData.data.userSettings) {
      await storeUserSettings(importData.data.userSettings);
    }
    
    // Import conversations if present
    if (importData.data.conversations) {
      for (const conversation of importData.data.conversations) {
        await storeConversation(conversation);
      }
    }
    
    // Import messages if present
    if (importData.data.messages) {
      for (const message of importData.data.messages) {
        await storeMessage(message);
      }
    }
    
    // Import memory items if present
    if (importData.data.memoryItems) {
      for (const memoryItem of importData.data.memoryItems) {
        await storeMemoryItem(memoryItem);
      }
    }
    
    // Import documents if present
    if (importData.data.documents) {
      for (const document of importData.data.documents) {
        await storeDocument(document);
      }
    }
    
    return true;
  } catch (error) {
    logError(error, 'Error importing data');
    throw new Error(formatErrorMessage(error, 'Failed to import data'));
  }
}

/**
 * Estimates the size of the IndexedDB database
 * @returns Promise resolving to the estimated size in bytes
 */
export async function getDatabaseSize(): Promise<number> {
  try {
    let totalSize = 0;
    
    // Get all data from each store and calculate the size
    const stores = [
      INDEXED_DB_STORES.CONVERSATIONS,
      INDEXED_DB_STORES.MESSAGES,
      INDEXED_DB_STORES.MEMORY_ITEMS,
      INDEXED_DB_STORES.DOCUMENTS,
      INDEXED_DB_STORES.WEB_PAGES
    ];
    
    for (const store of stores) {
      const data = await getAllIndexedDB(store);
      const dataString = JSON.stringify(data);
      totalSize += dataString.length;
    }
    
    return totalSize;
  } catch (error) {
    logError(error, 'Error getting database size');
    return 0;
  }
}