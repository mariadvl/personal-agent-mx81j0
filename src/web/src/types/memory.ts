/**
 * Type definitions and interfaces for memory-related operations in the Personal AI Agent.
 * These types ensure type safety when working with memory items, search operations, and context retrieval.
 */

// Valid memory categories
export const MEMORY_CATEGORIES = ['conversation', 'document', 'web', 'important', 'user_defined'] as const;
export type MemoryCategory = typeof MEMORY_CATEGORIES[number];

/**
 * Represents a memory item stored in the system.
 * Memory items are the fundamental units of information stored in the vector database.
 */
export interface MemoryItem {
  /** Unique identifier for the memory item */
  id: string;
  
  /** Creation timestamp (ISO format) */
  created_at: string;
  
  /** The actual content of the memory */
  content: string;
  
  /** Category of the memory (conversation, document, web, etc.) */
  category: MemoryCategory;
  
  /** Type of source that generated this memory (null if direct input) */
  source_type: string | null;
  
  /** ID of the source that generated this memory (null if direct input) */
  source_id: string | null;
  
  /** Importance score (higher = more important, typically 1-5) */
  importance: number;
  
  /** Additional metadata associated with the memory */
  metadata: Record<string, any>;
}

/**
 * Input parameters for creating a new memory item.
 */
export interface MemoryCreateInput {
  /** The content of the memory */
  content: string;
  
  /** Category of the memory */
  category: MemoryCategory;
  
  /** Type of source (optional) */
  source_type: string | null;
  
  /** ID of the source (optional) */
  source_id: string | null;
  
  /** Importance score (default: 1) */
  importance: number;
  
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Input parameters for updating an existing memory item.
 * All fields are optional - only included fields will be updated.
 */
export interface MemoryUpdateInput {
  /** Updated content (optional) */
  content?: string;
  
  /** Updated category (optional) */
  category?: MemoryCategory;
  
  /** Updated importance score (optional) */
  importance?: number;
  
  /** Updated or additional metadata (optional) */
  metadata?: Record<string, any>;
}

/**
 * Parameters for searching memory items.
 */
export interface MemorySearchParams {
  /** Search query text (optional for listing all) */
  query?: string;
  
  /** Maximum number of results to return */
  limit?: number;
  
  /** Number of results to skip (for pagination) */
  offset?: number;
  
  /** Filter by specific categories */
  categories?: MemoryCategory[];
  
  /** Additional filters (key-value pairs) */
  filters?: Record<string, any>;
  
  /** Whether to include full metadata in results */
  include_metadata?: boolean;
}

/**
 * Results from a memory search operation.
 */
export interface MemorySearchResult {
  /** Array of memory items matching the search criteria */
  results: MemoryItem[];
  
  /** Total number of matching items (for pagination) */
  total: number;
  
  /** Limit used for the query */
  limit: number;
  
  /** Offset used for the query */
  offset: number;
  
  /** Additional metadata about the search */
  metadata?: Record<string, any>;
}

/**
 * Result of a memory deletion operation.
 */
export interface MemoryDeleteResult {
  /** Whether the deletion was successful */
  success: boolean;
  
  /** Optional message (especially for errors) */
  message?: string;
}

/**
 * Parameters for retrieving context for a conversation.
 */
export interface ContextRetrievalParams {
  /** The query text to find relevant context for */
  query: string;
  
  /** Maximum number of context items to retrieve */
  limit?: number;
  
  /** Filter by specific categories */
  categories?: MemoryCategory[];
  
  /** Additional filters (key-value pairs) */
  filters?: Record<string, any>;
  
  /** Conversation ID for context retrieval */
  conversation_id?: string;
  
  /** Format type for the returned context (e.g., 'text', 'markdown') */
  format_type?: string;
}

/**
 * Results from a context retrieval operation.
 */
export interface ContextRetrievalResult {
  /** Array of memory items that form the context */
  items: MemoryItem[];
  
  /** Formatted context string ready for use with LLM */
  formatted_context: string;
  
  /** Additional metadata about the context */
  metadata?: Record<string, any>;
}

/**
 * Statistics about the memory system.
 */
export interface MemoryStats {
  /** Total number of memory items */
  total_count: number;
  
  /** Count of memory items by category */
  category_counts: Record<MemoryCategory, number>;
  
  /** Total storage size used by memory items (in bytes) */
  storage_size: number;
  
  /** Timestamp of the oldest memory (ISO format) */
  oldest_memory: string;
  
  /** Timestamp of the newest memory (ISO format) */
  newest_memory: string;
}

/**
 * Represents a related memory item with similarity score.
 */
export interface RelatedMemory {
  /** ID of the related memory */
  memory_id: string;
  
  /** Similarity score (0-1, higher means more similar) */
  similarity_score: number;
  
  /** The full memory item */
  memory: MemoryItem;
}

/**
 * Result of a batch deletion operation.
 */
export interface BatchDeleteResult {
  /** Whether the batch deletion was successful overall */
  success: boolean;
  
  /** Number of items successfully deleted */
  deleted_count: number;
  
  /** Array of error messages for any failures */
  errors?: string[];
}