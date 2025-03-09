/**
 * Type definitions for search functionality in the Personal AI Agent
 * This file contains types for search requests, responses, results, history, and settings
 */

/**
 * Available search providers
 * @version SerpAPI 0.1.0+, DuckDuckGo API latest
 */
export type SearchProvider = 'serpapi' | 'duckduckgo' | 'custom';

/**
 * Search status values
 */
export type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Interface for search request parameters
 */
export interface SearchRequest {
  /** Search query string */
  query: string;
  /** Number of results to return */
  num_results: number;
  /** Search provider to use */
  provider: SearchProvider;
  /** Whether to include images in results */
  include_images: boolean;
  /** Additional filters for the search */
  filters: Record<string, any>;
}

/**
 * Interface for individual search result items
 */
export interface SearchResultItem {
  /** Result title */
  title: string;
  /** Result URL */
  url: string;
  /** Result snippet/description */
  snippet: string;
  /** Source name (website, etc.) */
  source: string;
  /** Published date of the content (if available) */
  published_date: string;
  /** URL to the image (if available) */
  image_url: string;
}

/**
 * Interface for search response data
 */
export interface SearchResponse {
  /** The original search query */
  query: string;
  /** Array of search result items */
  results: SearchResultItem[];
  /** Total number of results found */
  total_results: number;
  /** Provider that delivered the results */
  provider: SearchProvider;
}

/**
 * Interface for raw API response from search endpoint
 */
export interface SearchApiResponse {
  /** The original search query */
  query: string;
  /** Array of search result items */
  results: SearchResultItem[];
  /** Total number of results found */
  total_results: number;
  /** Provider that delivered the results */
  provider: SearchProvider;
}

/**
 * Interface for search summary request parameters
 */
export interface SearchSummaryRequest {
  /** The original search query */
  query: string;
  /** Search results to summarize */
  results: SearchResultItem[];
  /** Maximum length of the summary */
  max_length: number;
}

/**
 * Interface for search summary response data
 */
export interface SearchSummaryResponse {
  /** The original search query */
  query: string;
  /** Generated summary of search results */
  summary: string;
  /** Number of results used in summarization */
  num_results_used: number;
}

/**
 * Interface for storing search results in memory
 */
export interface SearchMemoryRequest {
  /** The original search query */
  query: string;
  /** Search results to store */
  results: SearchResultItem[];
  /** Summary of the search results */
  summary: string;
  /** Associated conversation ID (if any) */
  conversation_id: string;
  /** Importance level of this memory (1-5) */
  importance: number;
}

/**
 * Interface for response after storing search in memory
 */
export interface SearchMemoryResponse {
  /** ID of the created memory */
  memory_id: string;
  /** Whether the operation was successful */
  success: boolean;
}

/**
 * Interface for search history items
 */
export interface SearchHistoryItem {
  /** Unique ID for this search history item */
  id: string;
  /** The search query */
  query: string;
  /** When the search was performed */
  timestamp: string;
  /** Number of results returned */
  result_count: number;
  /** Provider used for the search */
  provider: SearchProvider;
}

/**
 * Interface for search settings
 */
export interface SearchSettings {
  /** Default search provider */
  default_provider: SearchProvider;
  /** Default number of results to return */
  default_num_results: number;
  /** Whether to include images in results by default */
  include_images: boolean;
  /** Whether safe search is enabled */
  safe_search: boolean;
  /** Whether to track search history */
  track_history: boolean;
  /** Maximum number of history items to keep */
  history_limit: number;
  /** Whether to automatically summarize search results */
  auto_summarize: boolean;
  /** Default summary length */
  summary_length: number;
}

/**
 * Interface for search state in the UI
 */
export interface SearchState {
  /** Current status of the search */
  status: SearchStatus;
  /** Current search query */
  query: string;
  /** Current search results */
  results: SearchResultItem[];
  /** Total number of results */
  total_results: number;
  /** Current search provider */
  provider: SearchProvider;
  /** Error message if any */
  error: string | null;
  /** Summary of search results if available */
  summary: string | null;
  /** When the search was performed */
  timestamp: string | null;
}