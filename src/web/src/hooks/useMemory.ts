import { useState, useEffect, useCallback, useRef } from 'react';
import useMemoryStore from '../store/memoryStore';
import useSettings from './useSettings';
import {
  MemoryItem,
  MemorySearchParams,
  MemorySearchResult,
  MemoryCategory,
  MemoryCreateInput,
  MemoryUpdateInput,
  ContextRetrievalParams,
  ContextRetrievalResult,
  MemoryStats,
  RelatedMemory
} from '../types/memory';

/**
 * Options for configuring the useMemory hook
 */
export interface UseMemoryOptions {
  /** Optional memory ID to load initially */
  memoryId?: string | null;
  /** Whether to automatically load data on mount */
  autoLoad?: boolean;
  /** Initial category to load if autoLoad is true */
  initialCategory?: MemoryCategory | null;
  /** Error handler function */
  onError?: (error: Error) => void;
}

/**
 * Return type for the useMemory hook
 */
export interface UseMemoryResult {
  // State
  memory: MemoryItem | null;
  memoryItems: Record<string, MemoryItem>;
  searchResults: MemorySearchResult | null;
  searchParams: MemorySearchParams;
  memoryStats: MemoryStats | null;
  relatedMemories: RelatedMemory[] | null;
  isLoading: boolean;
  error: Error | null;
  
  // Methods
  getMemory: (id: string) => Promise<MemoryItem>;
  searchMemory: (params: MemorySearchParams) => Promise<MemorySearchResult>;
  createMemory: (input: MemoryCreateInput) => Promise<MemoryItem>;
  updateMemory: (id: string, input: MemoryUpdateInput) => Promise<MemoryItem>;
  deleteMemory: (id: string) => Promise<boolean>;
  batchDeleteMemories: (ids: string[]) => Promise<boolean>;
  getMemoriesByCategory: (category: MemoryCategory, options?: Record<string, any>) => Promise<MemorySearchResult>;
  markAsImportant: (id: string, important: boolean) => Promise<MemoryItem>;
  getMemoryStats: () => Promise<MemoryStats>;
  getRelatedMemories: (id: string, options?: Record<string, any>) => Promise<RelatedMemory[]>;
  retrieveContext: (params: ContextRetrievalParams) => Promise<ContextRetrievalResult>;
  selectMemory: (id: string | null) => void;
  setSearchParams: (params: MemorySearchParams) => void;
  clearSearchResults: () => void;
  clearError: () => void;
}

/**
 * A custom React hook that provides a simplified interface for memory management
 * in the Personal AI Agent web application.
 * 
 * This hook wraps the underlying memory store and provides convenient methods
 * for searching, retrieving, creating, updating, and deleting memory items.
 * 
 * @param options Configuration options for the hook
 * @returns Object containing memory state and control functions
 */
function useMemory(options: UseMemoryOptions = {}): UseMemoryResult {
  const {
    memoryId = null,
    autoLoad = false,
    initialCategory = null,
    onError
  } = options;

  // Get memory-related settings
  const { settings } = useSettings();

  // Extract everything from the memory store
  const {
    memoryItems,
    selectedMemoryId,
    searchResults,
    searchParams,
    memoryStats,
    relatedMemories,
    contextResults,
    isLoading,
    error,
    
    fetchMemoryById,
    searchMemories,
    createMemoryItem,
    updateMemoryItem,
    deleteMemoryItem,
    batchDeleteMemoryItems,
    getMemoriesByCategory: getMemoriesByCategoryStore,
    markAsImportant: markAsImportantStore,
    fetchMemoryStats,
    fetchRelatedMemories,
    retrieveMemoryContext,
    setSelectedMemoryId,
    setSearchParams: setStoreSearchParams,
    clearSearchResults,
    clearError: clearStoreError
  } = useMemoryStore();

  // Compute the currently selected memory
  const memory = selectedMemoryId ? memoryItems[selectedMemoryId] || null : null;
  
  // Compute the related memories for the selected memory
  const currentRelatedMemories = selectedMemoryId && relatedMemories[selectedMemoryId] 
    ? relatedMemories[selectedMemoryId] 
    : null;

  // Memoized function wrappers with error handling
  const getMemory = useCallback(
    async (id: string): Promise<MemoryItem> => {
      try {
        return await fetchMemoryById(id);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [fetchMemoryById, onError]
  );

  const searchMemory = useCallback(
    async (params: MemorySearchParams): Promise<MemorySearchResult> => {
      try {
        return await searchMemories(params);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [searchMemories, onError]
  );

  const createMemory = useCallback(
    async (input: MemoryCreateInput): Promise<MemoryItem> => {
      try {
        return await createMemoryItem(input);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [createMemoryItem, onError]
  );

  const updateMemory = useCallback(
    async (id: string, input: MemoryUpdateInput): Promise<MemoryItem> => {
      try {
        return await updateMemoryItem(id, input);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [updateMemoryItem, onError]
  );

  const deleteMemory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const result = await deleteMemoryItem(id);
        return result.success;
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [deleteMemoryItem, onError]
  );

  const batchDeleteMemories = useCallback(
    async (ids: string[]): Promise<boolean> => {
      try {
        const result = await batchDeleteMemoryItems(ids);
        return result.success;
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [batchDeleteMemoryItems, onError]
  );

  const getMemoriesByCategory = useCallback(
    async (category: MemoryCategory, options = {}): Promise<MemorySearchResult> => {
      try {
        return await getMemoriesByCategoryStore(category, options);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [getMemoriesByCategoryStore, onError]
  );

  const markAsImportant = useCallback(
    async (id: string, important: boolean): Promise<MemoryItem> => {
      try {
        return await markAsImportantStore(id, important);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [markAsImportantStore, onError]
  );

  const getMemoryStats = useCallback(
    async (): Promise<MemoryStats> => {
      try {
        return await fetchMemoryStats();
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [fetchMemoryStats, onError]
  );

  const getRelatedMemories = useCallback(
    async (id: string, options = {}): Promise<RelatedMemory[]> => {
      try {
        return await fetchRelatedMemories(id, options);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [fetchRelatedMemories, onError]
  );

  const retrieveContext = useCallback(
    async (params: ContextRetrievalParams): Promise<ContextRetrievalResult> => {
      try {
        return await retrieveMemoryContext(params);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [retrieveMemoryContext, onError]
  );

  const selectMemory = useCallback(
    (id: string | null): void => {
      setSelectedMemoryId(id);
      if (id && !memoryItems[id]) {
        // If ID is provided but not in the store, try to load it
        getMemory(id).catch(() => {});
      }
    },
    [setSelectedMemoryId, memoryItems, getMemory]
  );

  const setSearchParams = useCallback(
    (params: MemorySearchParams): void => {
      setStoreSearchParams(params);
    },
    [setStoreSearchParams]
  );

  const clearError = useCallback(() => {
    clearStoreError();
  }, [clearStoreError]);

  // Effects
  
  // Initialize data based on options
  useEffect(() => {
    if (autoLoad) {
      // Load memory stats
      getMemoryStats().catch(() => {});
      
      // Load memory if ID provided
      if (memoryId) {
        getMemory(memoryId).catch(() => {});
        selectMemory(memoryId);
      }
      
      // Load category if provided
      if (initialCategory) {
        getMemoriesByCategory(initialCategory).catch(() => {});
      }
    }
  }, [
    autoLoad, 
    memoryId, 
    initialCategory, 
    getMemory, 
    getMemoryStats, 
    getMemoriesByCategory, 
    selectMemory
  ]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Return the final interface
  return {
    // State
    memory,
    memoryItems,
    searchResults,
    searchParams,
    memoryStats,
    relatedMemories: currentRelatedMemories,
    isLoading,
    error,
    
    // Methods
    getMemory,
    searchMemory,
    createMemory,
    updateMemory,
    deleteMemory,
    batchDeleteMemories,
    getMemoriesByCategory,
    markAsImportant,
    getMemoryStats,
    getRelatedMemories,
    retrieveContext,
    selectMemory,
    setSearchParams,
    clearSearchResults,
    clearError
  };
}

export default useMemory;