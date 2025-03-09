import { STORAGE_PREFIX, getStorageKey } from '../constants/storageKeys';
import { formatErrorMessage, logError } from './errorHandlers';
import CryptoJS from 'crypto-js'; // crypto-js version ^4.1.1

// Database name and version for IndexedDB
const DB_NAME = "personal_ai_agent_db";
const DB_VERSION = 1;

// Default encryption key (ideally overridden by user-provided key)
const DEFAULT_ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'personal-ai-agent-default-key';

/**
 * Checks if a specific storage type is available in the browser
 * @param type - The storage type to check ('localStorage' or 'sessionStorage')
 * @returns True if storage is available, false otherwise
 */
export function isStorageAvailable(type: string): boolean {
  try {
    const storage = window[type as keyof Window] as Storage;
    const testKey = `${STORAGE_PREFIX}test`;
    storage.setItem(testKey, "test");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Encrypts data using AES encryption
 * @param data - The data to encrypt (can be any type)
 * @param key - The encryption key (defaults to environment variable or fallback)
 * @returns Encrypted data as string
 */
export function encryptData(data: any, key: string = DEFAULT_ENCRYPTION_KEY): string {
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(dataString, key).toString();
  } catch (error) {
    logError(error, "Encryption error");
    throw new Error(formatErrorMessage(error, "Failed to encrypt data"));
  }
}

/**
 * Decrypts data that was encrypted with AES
 * @param encryptedData - The encrypted data string
 * @param key - The encryption key (defaults to environment variable or fallback)
 * @returns Decrypted data (parsed from JSON if possible)
 */
export function decryptData(encryptedData: string, key: string = DEFAULT_ENCRYPTION_KEY): any {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    
    try {
      // Try to parse as JSON
      return JSON.parse(decryptedString);
    } catch {
      // Return as string if not valid JSON
      return decryptedString;
    }
  } catch (error) {
    logError(error, "Decryption error");
    throw new Error(formatErrorMessage(error, "Failed to decrypt data"));
  }
}

/**
 * Stores data in localStorage with optional encryption
 * @param key - The key to store the data under
 * @param value - The value to store
 * @param encrypt - Whether to encrypt the data (default: false)
 * @returns True if successful, false otherwise
 */
export function setLocalStorage(key: string, value: any, encrypt: boolean = false): boolean {
  try {
    if (!isStorageAvailable('localStorage')) {
      throw new Error("localStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    let storageValue: string;
    
    if (encrypt) {
      storageValue = encryptData(value);
    } else {
      storageValue = typeof value === 'string' ? value : JSON.stringify(value);
    }
    
    localStorage.setItem(storageKey, storageValue);
    return true;
  } catch (error) {
    logError(error, "localStorage set error");
    return false;
  }
}

/**
 * Retrieves data from localStorage with optional decryption
 * @param key - The key to retrieve data from
 * @param encrypted - Whether the data is encrypted (default: false)
 * @returns Retrieved data or null if not found
 */
export function getLocalStorage(key: string, encrypted: boolean = false): any {
  try {
    if (!isStorageAvailable('localStorage')) {
      throw new Error("localStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    const value = localStorage.getItem(storageKey);
    
    if (value === null || value === undefined) {
      return null;
    }
    
    if (encrypted) {
      return decryptData(value);
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value;
    }
  } catch (error) {
    logError(error, "localStorage get error");
    return null;
  }
}

/**
 * Removes data from localStorage
 * @param key - The key to remove
 * @returns True if successful, false otherwise
 */
export function removeLocalStorage(key: string): boolean {
  try {
    if (!isStorageAvailable('localStorage')) {
      throw new Error("localStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    localStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    logError(error, "localStorage remove error");
    return false;
  }
}

/**
 * Stores data in sessionStorage
 * @param key - The key to store the data under
 * @param value - The value to store
 * @returns True if successful, false otherwise
 */
export function setSessionStorage(key: string, value: any): boolean {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      throw new Error("sessionStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    const storageValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    sessionStorage.setItem(storageKey, storageValue);
    return true;
  } catch (error) {
    logError(error, "sessionStorage set error");
    return false;
  }
}

/**
 * Retrieves data from sessionStorage
 * @param key - The key to retrieve data from
 * @returns Retrieved data or null if not found
 */
export function getSessionStorage(key: string): any {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      throw new Error("sessionStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    const value = sessionStorage.getItem(storageKey);
    
    if (value === null || value === undefined) {
      return null;
    }
    
    try {
      // Try to parse as JSON
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value;
    }
  } catch (error) {
    logError(error, "sessionStorage get error");
    return null;
  }
}

/**
 * Removes data from sessionStorage
 * @param key - The key to remove
 * @returns True if successful, false otherwise
 */
export function removeSessionStorage(key: string): boolean {
  try {
    if (!isStorageAvailable('sessionStorage')) {
      throw new Error("sessionStorage is not available");
    }
    
    const storageKey = getStorageKey(key);
    sessionStorage.removeItem(storageKey);
    return true;
  } catch (error) {
    logError(error, "sessionStorage remove error");
    return false;
  }
}

/**
 * Initializes the IndexedDB database with required object stores
 * @returns Promise resolving to the database instance
 */
export function initializeIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      
      // Create or upgrade database schema
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
          messagesStore.createIndex('conversation_id', 'conversation_id', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('memory_items')) {
          const memoryStore = db.createObjectStore('memory_items', { keyPath: 'id' });
          memoryStore.createIndex('category', 'category', { unique: false });
          memoryStore.createIndex('source_id', 'source_id', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('web_pages')) {
          db.createObjectStore('web_pages', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('vector_embeddings')) {
          db.createObjectStore('vector_embeddings', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('search_results')) {
          db.createObjectStore('search_results', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };
      
      request.onerror = (event: Event) => {
        reject(new Error(`Failed to open IndexedDB: ${(event.target as IDBOpenDBRequest).error?.message}`));
      };
    } catch (error) {
      logError(error, "IndexedDB initialization error");
      reject(new Error(formatErrorMessage(error, "Failed to initialize IndexedDB")));
    }
  });
}

/**
 * Retrieves data from IndexedDB by key
 * @param storeName - The name of the object store
 * @param key - The key to retrieve
 * @returns Promise resolving to the retrieved data or null
 */
export function getIndexedDB(storeName: string, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.get(key);
          
          request.onsuccess = () => {
            resolve(request.result || null);
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to get data from IndexedDB: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB get error");
      reject(new Error(formatErrorMessage(error, "Failed to get data from IndexedDB")));
    }
  });
}

/**
 * Retrieves all data from an IndexedDB store
 * @param storeName - The name of the object store
 * @returns Promise resolving to an array of all items in the store
 */
export function getAllIndexedDB(storeName: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const request = store.getAll();
          
          request.onsuccess = () => {
            resolve(request.result || []);
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to get all data from IndexedDB: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB getAll error");
      reject(new Error(formatErrorMessage(error, "Failed to get all data from IndexedDB")));
    }
  });
}

/**
 * Stores data in IndexedDB
 * @param storeName - The name of the object store
 * @param data - The data to store
 * @param key - The key to store under (optional, uses data.id if available)
 * @returns Promise resolving to true if successful
 */
export function setIndexedDB(storeName: string, data: any, key?: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          
          // Use provided key if data doesn't have an id
          if (key && !data.id) {
            data.id = key;
          }
          
          const request = store.put(data);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to save data to IndexedDB: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB set error");
      reject(new Error(formatErrorMessage(error, "Failed to save data to IndexedDB")));
    }
  });
}

/**
 * Removes data from IndexedDB by key
 * @param storeName - The name of the object store
 * @param key - The key to remove
 * @returns Promise resolving to true if successful
 */
export function removeIndexedDB(storeName: string, key: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.delete(key);
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to remove data from IndexedDB: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB remove error");
      reject(new Error(formatErrorMessage(error, "Failed to remove data from IndexedDB")));
    }
  });
}

/**
 * Clears all data from an IndexedDB store
 * @param storeName - The name of the object store to clear
 * @returns Promise resolving to true if successful
 */
export function clearIndexedDBStore(storeName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => {
            resolve(true);
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to clear IndexedDB store: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB clear error");
      reject(new Error(formatErrorMessage(error, "Failed to clear IndexedDB store")));
    }
  });
}

/**
 * Queries IndexedDB using an index
 * @param storeName - The name of the object store
 * @param indexName - The name of the index to query
 * @param query - The value to search for
 * @returns Promise resolving to an array of matching items
 */
export function queryIndexedDB(storeName: string, indexName: string, query: any): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      initializeIndexedDB()
        .then((db) => {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);
          const index = store.index(indexName);
          const request = index.openCursor(IDBKeyRange.only(query));
          
          const results: any[] = [];
          
          request.onsuccess = (event: Event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              results.push(cursor.value);
              cursor.continue();
            } else {
              resolve(results);
            }
          };
          
          request.onerror = () => {
            reject(new Error(`Failed to query IndexedDB: ${request.error?.message}`));
          };
          
          // Close the database when the transaction is complete
          transaction.oncomplete = () => db.close();
        })
        .catch(reject);
    } catch (error) {
      logError(error, "IndexedDB query error");
      reject(new Error(formatErrorMessage(error, "Failed to query IndexedDB")));
    }
  });
}