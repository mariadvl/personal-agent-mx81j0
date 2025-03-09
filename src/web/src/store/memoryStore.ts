/**
 * Memory Store
 * 
 * This Zustand store manages memory-related state for the Personal AI Agent.
 * It provides methods for interacting with the memory system, including creating,
 * retrieving, updating, and deleting memory items, searching for memories,
 * and retrieving context for conversations.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import {
  MemoryItem,
  MemoryCreateInput,
  MemoryUpdateInput,
  MemorySearchParams,
  MemorySearchResult,
  MemoryDeleteResult,
  ContextRetrievalParams,
  ContextRetrievalResult,
  MemoryCategory,
  MemoryStats,
  RelatedMemory,
  BatchDeleteResult
} from '../types/memory';

import {
  getMemoryById,
  createMemory,
  updateMemory,
  deleteMemory,
  searchMemory,
  retrieveContext,
  getMemoryByCategory,
  markMemoryImportant,
  getMemoryStats,
  getRelatedMemories,
  batchDeleteMemories
} from '../services/memoryService';

// Default search parameters
const DEFAULT_SEARCH_PARAMS: MemorySearchParams = {
  query: '',
  limit: 20,
  offset: 0,
  categories: undefined,
  filters: undefined
};

/**
 * Memory Store implementation using Zustand with immer middleware
 * for immutable state updates.
 */
const useMemoryStore = create()(
  immer((set, get) => ({
    // Initial state
    memoryItems: {},
    selectedMemoryId: null,
    searchResults: null,
    searchParams: { ...DEFAULT_SEARCH_PARAMS },
    memoryStats: null,
    relatedMemories: {},
    contextResults: null,
    isLoading: false,
    error: null,
    
    /**
     * Fetch a memory item by its ID
     * @param id - The unique identifier of the memory item
     * @returns Promise resolving to the memory item
     */
    fetchMemoryById: async (id) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to get the memory item
        const memory = await getMemoryById(id);
        
        // Update the state with the retrieved memory
        set(state => {
          state.memoryItems[id] = memory;
          state.isLoading = false;
        });
        
        return memory;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Search for memory items based on provided parameters
     * @param params - The search parameters
     * @returns Promise resolving to the search results
     */
    searchMemories: async (params) => {
      try {
        // Set loading state, clear errors, and update search params
        set(state => {
          state.isLoading = true;
          state.error = null;
          state.searchParams = params;
        });
        
        // Call the API to search for memories
        const results = await searchMemory(params);
        
        // Update the state with the search results
        set(state => {
          state.searchResults = results;
          
          // Add the memory items to the memoryItems record
          results.results.forEach(item => {
            state.memoryItems[item.id] = item;
          });
          
          state.isLoading = false;
        });
        
        return results;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Create a new memory item
     * @param input - The memory item data to create
     * @returns Promise resolving to the created memory item
     */
    createMemoryItem: async (input) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to create the memory item
        const memory = await createMemory(input);
        
        // Update the state with the new memory item
        set(state => {
          state.memoryItems[memory.id] = memory;
          state.isLoading = false;
        });
        
        return memory;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Update an existing memory item
     * @param id - The unique identifier of the memory item to update
     * @param input - The memory data to update
     * @returns Promise resolving to the updated memory item
     */
    updateMemoryItem: async (id, input) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to update the memory item
        const memory = await updateMemory(id, input);
        
        // Update the state with the updated memory item
        set(state => {
          state.memoryItems[id] = memory;
          state.isLoading = false;
        });
        
        return memory;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Delete a memory item
     * @param id - The unique identifier of the memory item to delete
     * @returns Promise resolving to the deletion result
     */
    deleteMemoryItem: async (id) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to delete the memory item
        const result = await deleteMemory(id);
        
        // Update the state by removing the deleted memory item
        set(state => {
          // Remove the memory item from the state
          delete state.memoryItems[id];
          
          // If the deleted memory was selected, clear the selection
          if (state.selectedMemoryId === id) {
            state.selectedMemoryId = null;
          }
          
          state.isLoading = false;
        });
        
        return result;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Delete multiple memory items in a single request
     * @param ids - Array of memory item IDs to delete
     * @returns Promise resolving to the batch deletion result
     */
    batchDeleteMemoryItems: async (ids) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to delete multiple memory items
        const result = await batchDeleteMemories(ids);
        
        // Update the state by removing the deleted memory items
        set(state => {
          // Remove the memory items from the state
          ids.forEach(id => {
            delete state.memoryItems[id];
          });
          
          // If the selected memory was deleted, clear the selection
          if (state.selectedMemoryId && ids.includes(state.selectedMemoryId)) {
            state.selectedMemoryId = null;
          }
          
          state.isLoading = false;
        });
        
        return result;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Retrieve memory items by category
     * @param category - The category to filter by
     * @param options - Additional options like limit and offset
     * @returns Promise resolving to the search results
     */
    getMemoriesByCategory: async (category, options = {}) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to get memories by category
        const results = await getMemoryByCategory(category, options);
        
        // Update the state with the search results
        set(state => {
          state.searchResults = results;
          
          // Add the memory items to the memoryItems record
          results.results.forEach(item => {
            state.memoryItems[item.id] = item;
          });
          
          state.isLoading = false;
        });
        
        return results;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Mark a memory item as important
     * @param id - The unique identifier of the memory item
     * @param important - Whether to mark the memory as important (true) or not (false)
     * @returns Promise resolving to the updated memory item
     */
    markAsImportant: async (id, important) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to mark the memory as important
        const memory = await markMemoryImportant(id, important);
        
        // Update the state with the updated memory item
        set(state => {
          state.memoryItems[id] = memory;
          state.isLoading = false;
        });
        
        return memory;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Fetch statistics about the memory system
     * @returns Promise resolving to the memory statistics
     */
    fetchMemoryStats: async () => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to get memory statistics
        const stats = await getMemoryStats();
        
        // Update the state with the statistics
        set(state => {
          state.memoryStats = stats;
          state.isLoading = false;
        });
        
        return stats;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Fetch memories related to a specific memory item
     * @param id - The unique identifier of the memory item
     * @param options - Options like limit and similarity threshold
     * @returns Promise resolving to an array of related memories
     */
    fetchRelatedMemories: async (id, options = {}) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to get related memories
        const related = await getRelatedMemories(id, options);
        
        // Update the state with the related memories
        set(state => {
          state.relatedMemories[id] = related;
          
          // Add the memory items to the memoryItems record
          related.forEach(item => {
            state.memoryItems[item.memory.id] = item.memory;
          });
          
          state.isLoading = false;
        });
        
        return related;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Retrieve relevant context based on a query
     * @param params - The context retrieval parameters
     * @returns Promise resolving to the context retrieval results
     */
    retrieveMemoryContext: async (params) => {
      try {
        // Set loading state and clear any errors
        set(state => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Call the API to retrieve context
        const results = await retrieveContext(params);
        
        // Update the state with the context results
        set(state => {
          state.contextResults = results;
          
          // Add the memory items to the memoryItems record
          results.items.forEach(item => {
            state.memoryItems[item.id] = item;
          });
          
          state.isLoading = false;
        });
        
        return results;
      } catch (error) {
        // Handle errors
        set(state => {
          state.error = error instanceof Error ? error : new Error(String(error));
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    /**
     * Set the selected memory ID
     * @param id - The memory ID to select, or null to clear selection
     */
    setSelectedMemoryId: (id) => {
      set(state => {
        state.selectedMemoryId = id;
      });
    },
    
    /**
     * Update the search parameters
     * @param params - The new search parameters
     */
    setSearchParams: (params) => {
      set(state => {
        state.searchParams = params;
      });
    },
    
    /**
     * Clear the current search results
     */
    clearSearchResults: () => {
      set(state => {
        state.searchResults = null;
      });
    },
    
    /**
     * Clear the current error state
     */
    clearError: () => {
      set(state => {
        state.error = null;
      });
    },
    
    /**
     * Reset the store to its initial state
     */
    resetState: () => {
      set(() => ({
        memoryItems: {},
        selectedMemoryId: null,
        searchResults: null,
        searchParams: { ...DEFAULT_SEARCH_PARAMS },
        memoryStats: null,
        relatedMemories: {},
        contextResults: null,
        isLoading: false,
        error: null
      }));
    }
  }))
);

export default useMemoryStore;