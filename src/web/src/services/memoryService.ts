/**
 * Memory Service
 * 
 * This service provides functions for interacting with the memory system API endpoints.
 * It handles creating, retrieving, updating, and deleting memory items, as well as
 * searching and retrieving context from the memory system.
 */

import { API_ROUTES } from '../constants/apiRoutes';
import { get, post, put, delete as httpDelete } from './api';
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

/**
 * Retrieves a specific memory item by its ID
 * @param id - The unique identifier of the memory item
 * @returns Promise resolving to the memory item
 */
export async function getMemoryById(id: string): Promise<MemoryItem> {
  const url = API_ROUTES.MEMORY.GET_BY_ID.replace('{id}', id);
  const response = await get<MemoryItem>(url);
  return response.data;
}

/**
 * Creates a new memory item
 * @param input - The memory item data to create
 * @returns Promise resolving to the created memory item
 */
export async function createMemory(input: MemoryCreateInput): Promise<MemoryItem> {
  const response = await post<MemoryItem>(API_ROUTES.MEMORY.BASE, input);
  return response.data;
}

/**
 * Updates an existing memory item
 * @param id - The unique identifier of the memory item to update
 * @param input - The memory data to update
 * @returns Promise resolving to the updated memory item
 */
export async function updateMemory(id: string, input: MemoryUpdateInput): Promise<MemoryItem> {
  const url = API_ROUTES.MEMORY.UPDATE.replace('{id}', id);
  const response = await put<MemoryItem>(url, input);
  return response.data;
}

/**
 * Deletes a memory item
 * @param id - The unique identifier of the memory item to delete
 * @returns Promise resolving to the deletion result
 */
export async function deleteMemory(id: string): Promise<MemoryDeleteResult> {
  const url = API_ROUTES.MEMORY.DELETE.replace('{id}', id);
  const response = await httpDelete<MemoryDeleteResult>(url);
  return response.data;
}

/**
 * Searches for memory items based on provided parameters
 * @param params - The search parameters
 * @returns Promise resolving to the search results
 */
export async function searchMemory(params: MemorySearchParams): Promise<MemorySearchResult> {
  const response = await post<MemorySearchResult>(API_ROUTES.MEMORY.SEARCH, params);
  return response.data;
}

/**
 * Retrieves relevant context based on a query
 * @param params - The context retrieval parameters
 * @returns Promise resolving to the context retrieval results
 */
export async function retrieveContext(params: ContextRetrievalParams): Promise<ContextRetrievalResult> {
  const response = await post<ContextRetrievalResult>(API_ROUTES.MEMORY.CONTEXT, params);
  return response.data;
}

/**
 * Retrieves memory items by category
 * @param category - The category to filter by
 * @param options - Additional options like limit and offset
 * @returns Promise resolving to the search results
 */
export async function getMemoryByCategory(
  category: MemoryCategory,
  options: { limit?: number; offset?: number } = {}
): Promise<MemorySearchResult> {
  const url = API_ROUTES.MEMORY.BY_CATEGORY.replace('{category}', category);
  const response = await get<MemorySearchResult>(url, options);
  return response.data;
}

/**
 * Marks a memory item as important
 * @param id - The unique identifier of the memory item
 * @param important - Whether to mark the memory as important (true) or not (false)
 * @returns Promise resolving to the updated memory item
 */
export async function markMemoryImportant(id: string, important: boolean): Promise<MemoryItem> {
  const url = API_ROUTES.MEMORY.MARK_IMPORTANT.replace('{id}', id);
  const response = await put<MemoryItem>(url, { important });
  return response.data;
}

/**
 * Retrieves statistics about the memory system
 * @returns Promise resolving to the memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats> {
  const response = await get<MemoryStats>(API_ROUTES.MEMORY.STATS);
  return response.data;
}

/**
 * Retrieves memories related to a specific memory item
 * @param id - The unique identifier of the memory item
 * @param options - Options like limit and similarity threshold
 * @returns Promise resolving to an array of related memories
 */
export async function getRelatedMemories(
  id: string,
  options: { limit?: number; threshold?: number } = {}
): Promise<RelatedMemory[]> {
  const url = `${API_ROUTES.MEMORY.GET_BY_ID.replace('{id}', id)}/related`;
  const response = await get<RelatedMemory[]>(url, options);
  return response.data;
}

/**
 * Deletes multiple memory items in a single request
 * @param ids - Array of memory item IDs to delete
 * @returns Promise resolving to the batch deletion result
 */
export async function batchDeleteMemories(ids: string[]): Promise<BatchDeleteResult> {
  const response = await post<BatchDeleteResult>(API_ROUTES.MEMORY.BATCH, { ids });
  return response.data;
}