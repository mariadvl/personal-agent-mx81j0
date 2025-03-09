/**
 * Search Service for Personal AI Agent
 * 
 * This service handles web search functionality, providing methods to execute searches,
 * manage search history, summarize results, and store search information in memory.
 * It prioritizes user privacy while delivering relevant information from the web.
 */

import { API_ROUTES } from '../constants/apiRoutes';
import { get, post } from './api';
import {
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchHistoryItem,
  SearchSettings,
  SearchSummaryRequest,
  SearchSummaryResponse,
  SearchMemoryRequest,
  SearchMemoryResponse,
  SearchProvider
} from '../types/search';
import { DEFAULT_SEARCH_SETTINGS } from '../constants/defaultSettings';
import { useSettingsStore } from '../store/settingsStore';

// Constants
const SEARCH_CACHE_KEY = "search_cache";
const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_ITEMS = 50;

/**
 * Executes a web search with the provided parameters
 * @param request Search parameters including query, provider, and filters
 * @returns Promise resolving to search results
 */
export async function executeSearch(request: SearchRequest): Promise<SearchResponse> {
  // Get search settings from settings store
  const searchSettings = getSearchSettings();
  
  // Apply default settings for any missing parameters
  const finalRequest: SearchRequest = {
    query: request.query,
    num_results: request.num_results || searchSettings.default_num_results,
    provider: request.provider || searchSettings.default_provider,
    include_images: request.include_images !== undefined ? request.include_images : searchSettings.include_images,
    filters: request.filters || {}
  };
  
  // Check if search is enabled in settings
  if (!searchSettings.enabled) {
    return {
      query: finalRequest.query,
      results: [],
      total_results: 0,
      provider: finalRequest.provider,
    };
  }
  
  // Check cache if caching is enabled
  if (searchSettings.cache_results) {
    const cachedResults = getCachedSearchResults(finalRequest.query, finalRequest.provider);
    if (cachedResults) {
      return cachedResults;
    }
  }
  
  // Execute search via API
  const response = await post<SearchResponse>(
    API_ROUTES.SEARCH.EXECUTE,
    finalRequest
  );
  
  if (response.success && response.data) {
    // Cache results if enabled
    if (searchSettings.cache_results) {
      cacheSearchResults(finalRequest.query, finalRequest.provider, response.data);
    }
    
    // Add to search history if enabled
    await addToSearchHistory(finalRequest, response.data);
    
    return response.data;
  }
  
  // Return empty response if API call failed
  return {
    query: finalRequest.query,
    results: [],
    total_results: 0,
    provider: finalRequest.provider,
  };
}

/**
 * Retrieves the user's search history
 * @returns Promise resolving to search history items
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  // Get search settings from settings store
  const searchSettings = getSearchSettings();
  
  // If history tracking is disabled, return empty array
  if (!searchSettings.track_history) {
    return [];
  }
  
  try {
    // Try to retrieve history from local storage
    const historyData = localStorage.getItem(SEARCH_HISTORY_KEY);
    
    if (!historyData) {
      return [];
    }
    
    // Parse and return the history items
    return JSON.parse(historyData) as SearchHistoryItem[];
  } catch (error) {
    console.error('Error retrieving search history:', error);
    return [];
  }
}

/**
 * Clears the user's search history
 * @returns Promise resolving to success status
 */
export async function clearSearchHistory(): Promise<boolean> {
  try {
    // Remove search history from local storage
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    
    // Make POST request to clear history API endpoint
    const response = await post(API_ROUTES.SEARCH.CLEAR_HISTORY, {});
    
    return response.success;
  } catch (error) {
    console.error('Error clearing search history:', error);
    return false;
  }
}

/**
 * Removes a specific search from the history
 * @param id ID of the history item to remove
 * @returns Promise resolving to success status
 */
export async function removeFromSearchHistory(id: string): Promise<boolean> {
  try {
    // Get current search history from local storage
    const history = await getSearchHistory();
    
    // Filter out the item with the matching id
    const updatedHistory = history.filter(item => item.id !== id);
    
    // Save updated history back to local storage
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    // Make DELETE request to history item API endpoint
    const response = await post(`${API_ROUTES.SEARCH.HISTORY}/delete`, { id });
    
    return true;
  } catch (error) {
    console.error('Error removing search from history:', error);
    return false;
  }
}

/**
 * Adds a search to the history
 * @param request Search request parameters
 * @param response Search response data
 * @returns Promise resolving to success status
 */
async function addToSearchHistory(
  request: SearchRequest,
  response: SearchResponse
): Promise<boolean> {
  // Get search settings from settings store
  const searchSettings = getSearchSettings();
  
  // If history tracking is disabled, return false
  if (!searchSettings.track_history) {
    return false;
  }
  
  try {
    // Get current search history from local storage
    const history = await getSearchHistory();
    
    // Create new history item with unique ID
    const newItem: SearchHistoryItem = {
      id: `search-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      query: request.query,
      timestamp: new Date().toISOString(),
      result_count: response.results.length,
      provider: response.provider
    };
    
    // Add new item to the beginning of history array
    const updatedHistory = [newItem, ...history];
    
    // Trim history to maximum allowed items
    if (updatedHistory.length > MAX_HISTORY_ITEMS) {
      updatedHistory.splice(MAX_HISTORY_ITEMS);
    }
    
    // Save updated history to local storage
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    
    return true;
  } catch (error) {
    console.error('Error adding search to history:', error);
    return false;
  }
}

/**
 * Generates a summary of search results
 * @param request Search summary request parameters
 * @returns Promise resolving to search summary
 */
export async function summarizeSearchResults(
  request: SearchSummaryRequest
): Promise<SearchSummaryResponse> {
  // Validate input parameters
  if (!request.query || !request.results || request.results.length === 0) {
    throw new Error('Invalid search summary request: Missing required parameters');
  }
  
  // Make POST request to search summary API endpoint
  const response = await post<SearchSummaryResponse>(
    `${API_ROUTES.SEARCH.BASE}/summarize`,
    request
  );
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error('Failed to generate search results summary');
}

/**
 * Stores search results in the agent's memory
 * @param request Search memory storage request
 * @returns Promise resolving to memory storage response
 */
export async function storeSearchInMemory(
  request: SearchMemoryRequest
): Promise<SearchMemoryResponse> {
  // Validate input parameters
  if (!request.query || !request.results || request.results.length === 0) {
    throw new Error('Invalid memory storage request: Missing required parameters');
  }
  
  // Make POST request to store search in memory API endpoint
  const response = await post<SearchMemoryResponse>(
    `${API_ROUTES.MEMORY.BASE}/search`,
    request
  );
  
  if (response.success && response.data) {
    return response.data;
  }
  
  throw new Error('Failed to store search results in memory');
}

/**
 * Retrieves the current search settings
 * @returns Current search settings
 */
export function getSearchSettings(): SearchSettings {
  const settings = useSettingsStore.getState().settings;
  return settings.search_settings || DEFAULT_SEARCH_SETTINGS;
}

/**
 * Updates the search settings
 * @param settings New search settings
 * @returns Promise resolving to updated settings
 */
export async function updateSearchSettings(
  settings: SearchSettings
): Promise<SearchSettings> {
  const { updateSearchSettings } = useSettingsStore.getState();
  return await updateSearchSettings(settings);
}

/**
 * Retrieves cached search results if available
 * @param query Search query
 * @param provider Search provider
 * @returns Cached search results or null if not found
 */
function getCachedSearchResults(
  query: string,
  provider: SearchProvider
): SearchResponse | null {
  // Get search settings to check if caching is enabled
  const searchSettings = getSearchSettings();
  
  if (!searchSettings.cache_results) {
    return null;
  }
  
  try {
    // Try to retrieve cache from local storage
    const cacheData = localStorage.getItem(SEARCH_CACHE_KEY);
    
    if (!cacheData) {
      return null;
    }
    
    // Parse cache data
    const cache = JSON.parse(cacheData);
    
    // Find matching cache entry for query and provider
    const cacheKey = `${query}:${provider}`;
    const cacheEntry = cache[cacheKey];
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if cache entry has expired based on settings
    const now = Date.now();
    const expiryTime = searchSettings.cache_expiry_hours * 60 * 60 * 1000; // Convert hours to ms
    
    if (now - cacheEntry.timestamp > expiryTime) {
      return null; // Cache expired
    }
    
    // Return cached search results
    return cacheEntry.data;
  } catch (error) {
    console.error('Error retrieving cached search results:', error);
    return null;
  }
}

/**
 * Caches search results for future use
 * @param query Search query
 * @param provider Search provider
 * @param response Search response to cache
 * @returns Success status
 */
function cacheSearchResults(
  query: string,
  provider: SearchProvider,
  response: SearchResponse
): boolean {
  // Get search settings to check if caching is enabled
  const searchSettings = getSearchSettings();
  
  if (!searchSettings.cache_results) {
    return false;
  }
  
  try {
    // Try to retrieve existing cache from local storage
    const cacheData = localStorage.getItem(SEARCH_CACHE_KEY);
    const cache = cacheData ? JSON.parse(cacheData) : {};
    
    // Create new cache entry with timestamp
    const cacheKey = `${query}:${provider}`;
    cache[cacheKey] = {
      timestamp: Date.now(),
      data: response
    };
    
    // Limit cache size to prevent excessive storage usage
    const cacheKeys = Object.keys(cache);
    if (cacheKeys.length > 100) { // Limit to 100 cached searches
      // Sort by timestamp (oldest first)
      cacheKeys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
      
      // Remove oldest entries
      const keysToRemove = cacheKeys.slice(0, cacheKeys.length - 100);
      keysToRemove.forEach(key => delete cache[key]);
    }
    
    // Save updated cache to local storage
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(cache));
    
    return true;
  } catch (error) {
    console.error('Error caching search results:', error);
    return false;
  }
}

/**
 * Clears the search results cache
 * @returns Success status
 */
export function clearSearchCache(): boolean {
  try {
    localStorage.removeItem(SEARCH_CACHE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing search cache:', error);
    return false;
  }
}