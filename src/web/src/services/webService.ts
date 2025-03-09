/**
 * Web Service for Personal AI Agent
 * 
 * This service handles web content extraction, processing, and storage.
 * It provides functions to extract content from URLs, validate URLs,
 * generate summaries, and store web content in memory, while respecting
 * user privacy settings.
 * 
 * @module webService
 */

import { API_ROUTES } from '../constants/apiRoutes';
import { get, post, delete as deleteRequest } from './api';
import {
  WebExtractionRequest,
  WebExtractionResponse,
  WebExtractionOptions,
  WebMemoryRequest,
  WebMemoryResponse,
  WebSummaryRequest,
  WebSummaryResponse,
  WebPage,
  MAX_URL_LENGTH
} from '../types/web';

// Regular expression for validating URLs
const URL_REGEX = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?([\/\w\.-]*)*\/?$/i;

/**
 * Validates a URL string to ensure it's properly formatted
 * 
 * @param url - The URL to validate
 * @returns True if URL is valid, false otherwise
 */
export function validateUrl(url: string): boolean {
  // Check if URL is empty or undefined
  if (!url || url.trim() === '') {
    return false;
  }
  
  // Check if URL exceeds maximum length
  if (url.length > MAX_URL_LENGTH) {
    return false;
  }
  
  // Test URL against regex pattern
  return URL_REGEX.test(url);
}

/**
 * Normalizes a URL by ensuring it has the correct protocol prefix
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL with proper protocol
 */
export function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/**
 * Extracts content from a web page URL
 * 
 * @param request - The extraction request containing URL and options
 * @returns Promise resolving to the extracted web content
 */
export async function extractWebContent(request: WebExtractionRequest): Promise<WebExtractionResponse> {
  // Validate the URL
  if (!validateUrl(request.url)) {
    throw new Error('Invalid URL format');
  }

  // Normalize the URL to ensure it has a proper protocol
  const normalizedUrl = normalizeUrl(request.url);

  // Prepare the extraction request with normalized URL
  const extractionRequest: WebExtractionRequest = {
    url: normalizedUrl,
    options: {
      ...request.options,
      // Set defaults if options are not provided
      includeImages: request.options?.includeImages ?? false,
      maxContentLength: request.options?.maxContentLength ?? 100000,
      generateSummary: request.options?.generateSummary ?? true,
      extractMetadata: request.options?.extractMetadata ?? true
    }
  };

  // Make the API request to extract web content
  const response = await post<WebExtractionResponse>(API_ROUTES.WEB.EXTRACT, extractionRequest);

  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to extract web content');
  }

  return response.data;
}

/**
 * Retrieves previously extracted web content by ID
 * 
 * @param id - The ID of the web content to retrieve
 * @returns Promise resolving to the web page data
 */
export async function getWebContent(id: string): Promise<WebPage> {
  // Replace the parameter placeholder in the URL
  const url = API_ROUTES.WEB.GET_BY_ID.replace('{id}', id);
  
  const response = await get<WebPage>(url);
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to retrieve web content');
  }
  
  return response.data;
}

/**
 * Deletes previously extracted web content by ID
 * 
 * @param id - The ID of the web content to delete
 * @returns Promise resolving to true if deletion was successful
 */
export async function deleteWebContent(id: string): Promise<boolean> {
  // Replace the parameter placeholder in the URL
  const url = API_ROUTES.WEB.DELETE.replace('{id}', id);
  
  const response = await deleteRequest<{ success: boolean }>(url);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete web content');
  }
  
  return true;
}

/**
 * Stores extracted web content in the memory system
 * 
 * @param request - The memory storage request containing web content data
 * @returns Promise resolving to the memory storage response
 */
export async function storeWebContentInMemory(request: WebMemoryRequest): Promise<WebMemoryResponse> {
  const response = await post<WebMemoryResponse>(API_ROUTES.MEMORY.BASE, {
    content: request.content,
    metadata: {
      url: request.url,
      title: request.title,
      summary: request.summary,
      ...request.metadata
    },
    category: request.category || 'web',
    source_type: 'web'
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to store web content in memory');
  }
  
  return response.data;
}

/**
 * Generates a summary of web content
 * 
 * @param request - The summary request containing web content
 * @returns Promise resolving to the summary response
 */
export async function generateWebContentSummary(request: WebSummaryRequest): Promise<WebSummaryResponse> {
  const response = await post<WebSummaryResponse>(`${API_ROUTES.WEB.BASE}/summarize`, {
    url: request.url,
    content: request.content,
    maxLength: request.maxLength || 200
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to generate web content summary');
  }
  
  return response.data;
}

/**
 * Searches for web content based on a query
 * 
 * @param query - The search query
 * @param limit - Maximum number of results to return
 * @returns Promise resolving to an array of matching web pages
 */
export async function searchWebContent(query: string, limit: number = 10): Promise<WebPage[]> {
  const response = await post<WebPage[]>(API_ROUTES.WEB.SEARCH, {
    query,
    limit
  });
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to search web content');
  }
  
  return response.data;
}

/**
 * Determines if a warning about external service usage is needed
 * based on privacy settings
 * 
 * @param privacySettings - Boolean indicating if local-only mode is enabled
 * @returns True if warning is needed, false otherwise
 */
export function isExternalServiceWarningNeeded(privacySettings: boolean): boolean {
  // If privacySettings is true, it means local-only mode is enabled
  // and external services should not be used without warning
  return privacySettings;
}