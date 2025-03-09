/**
 * Constants for storage keys used throughout the Personal AI Agent application.
 * This file provides a centralized location for all storage key names to ensure
 * consistency when accessing data in localStorage, sessionStorage, and IndexedDB.
 */

/**
 * Prefix for all storage keys to avoid collisions with other applications
 */
export const STORAGE_PREFIX = "personal_ai_agent_";

/**
 * Generates a prefixed storage key to avoid collisions with other applications
 * @param key - The base key to prefix
 * @returns Prefixed storage key
 */
export const getStorageKey = (key: string): string => {
  return `${STORAGE_PREFIX}${key}`;
};

/**
 * Constants for localStorage and sessionStorage keys
 */
export const STORAGE_KEYS = {
  /**
   * User settings (master object containing all settings)
   */
  USER_SETTINGS: getStorageKey("user_settings"),

  /**
   * Voice settings (voice selection, input/output enabled)
   */
  VOICE_SETTINGS: getStorageKey("voice_settings"),

  /**
   * Personality settings (name, style, formality, verbosity)
   */
  PERSONALITY_SETTINGS: getStorageKey("personality_settings"),

  /**
   * Privacy settings (local storage only, analytics, error reporting)
   */
  PRIVACY_SETTINGS: getStorageKey("privacy_settings"),

  /**
   * Storage settings (paths, backup configuration)
   */
  STORAGE_SETTINGS: getStorageKey("storage_settings"),

  /**
   * LLM settings (provider, model, temperature, context window)
   */
  LLM_SETTINGS: getStorageKey("llm_settings"),

  /**
   * Search settings (enabled, provider, result count)
   */
  SEARCH_SETTINGS: getStorageKey("search_settings"),

  /**
   * Memory settings (vector DB configuration, context retrieval)
   */
  MEMORY_SETTINGS: getStorageKey("memory_settings"),

  /**
   * ID of the currently active conversation
   */
  ACTIVE_CONVERSATION: getStorageKey("active_conversation"),

  /**
   * Collection of all conversation metadata
   */
  CONVERSATIONS: getStorageKey("conversations"),

  /**
   * List of recent conversation IDs for quick access
   */
  RECENT_CONVERSATIONS: getStorageKey("recent_conversations"),

  /**
   * User interface theme setting
   */
  THEME: getStorageKey("theme"),

  /**
   * Authentication token (if applicable)
   */
  AUTH_TOKEN: getStorageKey("auth_token"),

  /**
   * API keys for external services (encrypted)
   */
  API_KEYS: getStorageKey("api_keys"),

  /**
   * List of recently accessed documents
   */
  RECENT_DOCUMENTS: getStorageKey("recent_documents"),

  /**
   * Search query history
   */
  SEARCH_HISTORY: getStorageKey("search_history"),

  /**
   * Important memory items highlighted for the user
   */
  MEMORY_HIGHLIGHTS: getStorageKey("memory_highlights"),
};

/**
 * Constants for IndexedDB object store names
 */
export const INDEXED_DB_STORES = {
  /**
   * Store for conversation metadata
   */
  CONVERSATIONS: "conversations",

  /**
   * Store for individual messages
   */
  MESSAGES: "messages",

  /**
   * Store for memory items (vector embeddings metadata)
   */
  MEMORY_ITEMS: "memory_items",

  /**
   * Store for document metadata
   */
  DOCUMENTS: "documents",

  /**
   * Store for processed web pages
   */
  WEB_PAGES: "web_pages",

  /**
   * Store for search results
   */
  SEARCH_RESULTS: "search_results",

  /**
   * Store for vector embeddings
   */
  VECTOR_EMBEDDINGS: "vector_embeddings",
};

/**
 * Constants for sessionStorage keys (temporary state)
 */
export const SESSION_STORAGE_KEYS = {
  /**
   * Current application route/path
   */
  CURRENT_ROUTE: getStorageKey("current_route"),

  /**
   * Temporary UI state
   */
  UI_STATE: getStorageKey("ui_state"),

  /**
   * Temporary document being processed
   */
  TEMP_DOCUMENT: getStorageKey("temp_document"),

  /**
   * Temporary conversation data
   */
  TEMP_CONVERSATION: getStorageKey("temp_conversation"),
};