import { useState, useCallback, useEffect } from 'react';
import { useLazyApiRequest } from './useApi';
import { useSettingsStore } from '../store/settingsStore';
import { API_ROUTES } from '../constants/apiRoutes';
import {
  executeSearch,
  getSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  summarizeSearchResults,
  storeSearchInMemory,
  getSearchSettings
} from '../services/searchService';
import {
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchHistoryItem,
  SearchState,
  SearchSummaryRequest,
  SearchSummaryResponse,
  SearchMemoryRequest,
  SearchMemoryResponse
} from '../types/search';

/**
 * Interface for the return value of the useSearch hook
 */
export interface UseSearchResult {
  /** Current search state */
  state: SearchState;
  /** Function to perform a web search */
  search: (query: string, options?: Partial<SearchRequest>) => Promise<SearchResponse>;
  /** Function to get search history */
  getHistory: () => Promise<SearchHistoryItem[]>;
  /** Function to clear all search history */
  clearHistory: () => Promise<boolean>;
  /** Function to remove a specific item from search history */
  removeFromHistory: (id: string) => Promise<boolean>;
  /** Function to summarize search results */
  summarizeResults: (options?: Partial<SearchSummaryRequest>) => Promise<SearchSummaryResponse>;
  /** Function to store search results in memory */
  storeInMemory: (options?: Partial<SearchMemoryRequest>) => Promise<SearchMemoryResponse>;
  /** Function to reset search state */
  reset: () => void;
  /** Whether a search operation is in progress */
  isLoading: boolean;
  /** Whether the last search operation resulted in an error */
  isError: boolean;
}

/**
 * A hook that provides search functionality and state management
 * 
 * This hook encapsulates web search operations, history management, and result processing
 * while respecting user privacy settings and preferences.
 * 
 * @param initialState - Optional initial state for the search
 * @returns Object containing search state and functions for managing searches
 */
const useSearch = (initialState?: Partial<SearchState>): UseSearchResult => {
  // Initialize search state with default values or provided initialState
  const [state, setState] = useState<SearchState>({
    status: 'idle',
    query: '',
    results: [],
    total_results: 0,
    provider: 'duckduckgo',
    error: null,
    summary: null,
    timestamp: null,
    ...initialState
  });

  // Get search settings from settings store
  const { settings } = useSettingsStore();
  const searchSettings = settings.search_settings;

  // Set up API request hooks for search operations
  const { execute: executeSearchApi, isLoading: isSearchLoading, isError: isSearchError } = 
    useLazyApiRequest<SearchResponse>({ method: 'post' });
  
  const { execute: executeSummaryApi, isLoading: isSummaryLoading, isError: isSummaryError } = 
    useLazyApiRequest<SearchSummaryResponse>({ method: 'post' });
  
  const { execute: executeMemoryApi, isLoading: isMemoryLoading, isError: isMemoryError } = 
    useLazyApiRequest<SearchMemoryResponse>({ method: 'post' });

  // Create memoized search function that executes a web search
  const search = useCallback(async (query: string, options?: Partial<SearchRequest>): Promise<SearchResponse> => {
    // Set state to loading
    setState(prev => ({ 
      ...prev, 
      status: 'loading',
      query,
      error: null
    }));

    try {
      // Get the latest search settings
      const currentSettings = getSearchSettings();
      
      // Prepare search request with defaults from settings
      const searchRequest: SearchRequest = {
        query,
        num_results: options?.num_results || currentSettings.default_num_results || 5,
        provider: options?.provider || currentSettings.default_provider || 'duckduckgo',
        include_images: options?.include_images !== undefined 
          ? options.include_images 
          : currentSettings.include_images,
        filters: options?.filters || {}
      };

      // Execute search through the service
      const searchResponse = await executeSearch(searchRequest);

      // Update state with results
      setState(prev => ({
        ...prev,
        status: 'success',
        results: searchResponse.results,
        total_results: searchResponse.total_results,
        provider: searchResponse.provider,
        timestamp: new Date().toISOString(),
        error: null,
        summary: null  // Reset summary when new search is performed
      }));

      return searchResponse;
    } catch (error) {
      // Update state with error
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'An error occurred during search'
      }));

      // Return empty response on error
      return {
        query,
        results: [],
        total_results: 0,
        provider: searchSettings.default_provider || 'duckduckgo'
      };
    }
  }, [searchSettings]);

  // Create memoized function to fetch search history
  const getHistory = useCallback(async (): Promise<SearchHistoryItem[]> => {
    try {
      return await getSearchHistory();
    } catch (error) {
      console.error('Error fetching search history:', error);
      return [];
    }
  }, []);

  // Create memoized function to clear search history
  const clearHistory = useCallback(async (): Promise<boolean> => {
    try {
      return await clearSearchHistory();
    } catch (error) {
      console.error('Error clearing search history:', error);
      return false;
    }
  }, []);

  // Create memoized function to remove item from search history
  const removeFromHistory = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await removeFromSearchHistory(id);
    } catch (error) {
      console.error('Error removing item from search history:', error);
      return false;
    }
  }, []);

  // Create memoized function to summarize search results
  const summarizeResults = useCallback(async (options?: Partial<SearchSummaryRequest>): Promise<SearchSummaryResponse> => {
    try {
      if (!state.results.length) {
        throw new Error('No search results available to summarize');
      }

      // Get the latest search settings
      const currentSettings = getSearchSettings();
      
      // Prepare summary request
      const summaryRequest: SearchSummaryRequest = {
        query: state.query,
        results: state.results,
        max_length: options?.max_length || currentSettings.summary_length || 200
      };

      // Get summary
      const summaryResponse = await summarizeSearchResults(summaryRequest);

      // Update state with summary
      setState(prev => ({
        ...prev,
        summary: summaryResponse.summary
      }));

      return summaryResponse;
    } catch (error) {
      console.error('Error summarizing search results:', error);
      throw error;
    }
  }, [state.query, state.results]);

  // Create memoized function to store search results in memory
  const storeInMemory = useCallback(async (options?: Partial<SearchMemoryRequest>): Promise<SearchMemoryResponse> => {
    try {
      if (!state.results.length) {
        throw new Error('No search results available to store in memory');
      }

      // If no summary is available, generate one first
      let summary = state.summary;
      if (!summary) {
        const summaryResponse = await summarizeResults();
        summary = summaryResponse.summary;
      }

      // Prepare memory request
      const memoryRequest: SearchMemoryRequest = {
        query: state.query,
        results: state.results,
        summary: summary || '',
        conversation_id: options?.conversation_id || '',
        importance: options?.importance || 3
      };

      // Store in memory
      return await storeSearchInMemory(memoryRequest);
    } catch (error) {
      console.error('Error storing search results in memory:', error);
      throw error;
    }
  }, [state.query, state.results, state.summary, summarizeResults]);

  // Create memoized function to reset search state
  const reset = useCallback(() => {
    const currentSettings = getSearchSettings();
    setState({
      status: 'idle',
      query: '',
      results: [],
      total_results: 0,
      provider: currentSettings.default_provider || 'duckduckgo',
      error: null,
      summary: null,
      timestamp: null
    });
  }, []);

  // Derived loading and error states
  const isLoading = state.status === 'loading' || isSearchLoading || isSummaryLoading || isMemoryLoading;
  const isError = state.status === 'error' || isSearchError || isSummaryError || isMemoryError;

  // Return search state and functions
  return {
    state,
    search,
    getHistory,
    clearHistory,
    removeFromHistory,
    summarizeResults,
    storeInMemory,
    reset,
    isLoading,
    isError
  };
};

export default useSearch;