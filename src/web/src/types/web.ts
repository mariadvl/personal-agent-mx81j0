/**
 * Type definitions for web content extraction and processing in the Personal AI Agent.
 * This file defines interfaces for web extraction requests/responses, web page data structures,
 * and web reader component state management.
 */

// Constants for web content limitations
export const MAX_CONTENT_LENGTH = 100000;
export const MAX_URL_LENGTH = 2048;
export const MAX_TITLE_LENGTH = 500;

/**
 * Interface for web page data structure
 */
export interface WebPage {
  id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  created_at: string;
  last_accessed: string;
  processed: boolean;
  metadata: WebPageMetadata;
}

/**
 * Interface for web page metadata
 */
export interface WebPageMetadata {
  author: string;
  publishDate: string;
  source: string;
  wordCount: number;
  imageCount: number;
  keywords: string[];
}

/**
 * Interface for web content extraction request
 */
export interface WebExtractionRequest {
  url: string;
  options: WebExtractionOptions;
}

/**
 * Interface for web extraction configuration options
 */
export interface WebExtractionOptions {
  includeImages: boolean;
  maxContentLength: number;
  generateSummary: boolean;
  extractMetadata: boolean;
}

/**
 * Interface for web content extraction response
 */
export interface WebExtractionResponse {
  id: string;
  url: string;
  title: string;
  content: string;
  summary: string;
  metadata: WebPageMetadata;
  status: string;
}

/**
 * Interface for storing web content in memory
 */
export interface WebMemoryRequest {
  url: string;
  title: string;
  content: string;
  summary: string;
  metadata: WebPageMetadata;
  category: string;
}

/**
 * Interface for web memory storage response
 */
export interface WebMemoryResponse {
  memoryId: string;
  success: boolean;
  message: string;
}

/**
 * Interface for web content summary request
 */
export interface WebSummaryRequest {
  url: string;
  content: string;
  maxLength: number;
}

/**
 * Interface for web content summary response
 */
export interface WebSummaryResponse {
  summary: string;
  keyPoints: string[];
}

/**
 * Enum for web reader processing status
 */
export enum WebReaderStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  EXTRACTING = 'extracting',
  PROCESSING = 'processing',
  SUMMARIZING = 'summarizing',
  COMPLETE = 'complete',
  ERROR = 'error'
}

/**
 * Interface for web reader component state
 */
export interface WebReaderState {
  url: string;
  status: WebReaderStatus;
  title: string;
  content: string;
  summary: string;
  metadata: WebPageMetadata;
  error: string;
  progress: number;
  showExternalServiceWarning: boolean;
  memoryId: string;
}

/**
 * Interface for web reader component options
 */
export interface WebReaderOptions {
  includeImages: boolean;
  maxContentLength: number;
  generateSummary: boolean;
  extractMetadata: boolean;
  autoStoreInMemory: boolean;
  showExternalServiceWarning: boolean;
}