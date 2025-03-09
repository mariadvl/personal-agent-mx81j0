/**
 * API Types for Personal AI Agent
 * 
 * This file defines the common interfaces and types used for API communication
 * throughout the application to ensure type safety and consistency. The Personal AI
 * Agent uses a local-first architecture with optional cloud components, and these
 * types facilitate communication between the frontend and backend services.
 */

/**
 * Generic interface for all API responses
 * @template T The type of data contained in the response
 */
export interface ApiResponse<T = any> {
  /** Indicates if the request was successful */
  success: boolean;
  /** The data payload returned by the API */
  data: T;
  /** Error message in case of failure, null otherwise */
  error: string | null;
  /** Additional metadata related to the response */
  metadata: Record<string, any> | null;
}

/**
 * Interface for API error responses with detailed error information
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: boolean;
  /** Short error message */
  error: string;
  /** HTTP status code */
  status_code: number;
  /** Detailed error description */
  detail: string | null;
  /** The API path that generated the error */
  path: string | null;
  /** When the error occurred */
  timestamp: string | null;
}

/**
 * Interface for configuring API request options
 */
export interface ApiRequestOptions {
  /** Request timeout in milliseconds */
  timeout: number | null;
  /** Custom request headers */
  headers: Record<string, string> | null;
  /** AbortSignal to cancel the request */
  signal: AbortSignal | null;
  /** Whether to include credentials */
  withCredentials: boolean | null;
  /** Expected response type */
  responseType: 'json' | 'text' | 'blob' | 'arraybuffer';
}

/**
 * Generic interface for paginated API responses
 * @template T The type of items in the paginated response
 */
export interface PaginatedResponse<T = any> {
  /** The items for the current page */
  items: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  page_size: number;
  /** Total number of pages */
  total_pages: number;
}

/**
 * Interface for pagination parameters in API requests
 */
export interface PaginationParams {
  /** Page number to retrieve (1-based) */
  page: number;
  /** Number of items per page */
  page_size: number;
  /** Field to sort results by */
  sort_by: string | null;
  /** Sort direction */
  sort_order: 'asc' | 'desc' | null;
}

/**
 * Type representing the possible states of an API request
 */
export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Generic interface for tracking the state of API requests
 * @template T The type of data expected from the API
 */
export interface ApiState<T = any> {
  /** Current status of the request */
  status: ApiStatus;
  /** Data returned by the API if successful */
  data: T | null;
  /** Error message if request failed */
  error: string | null;
  /** Whether the request is currently loading */
  isLoading: boolean;
  /** Whether the request completed successfully */
  isSuccess: boolean;
  /** Whether the request resulted in an error */
  isError: boolean;
  /** Timestamp of the last state change */
  timestamp: number | null;
}

/**
 * Interface for file upload options with progress tracking
 */
export interface FileUploadOptions {
  /** Callback for tracking upload progress */
  onProgress: (progress: number) => void;
  /** Additional data to include with the file upload */
  additionalData: Record<string, any> | null;
  /** Upload timeout in milliseconds */
  timeout: number | null;
  /** AbortSignal to cancel the upload */
  signal: AbortSignal | null;
}

/**
 * Interface for tracking upload/download progress events
 */
export interface ProgressEvent {
  /** Bytes loaded so far */
  loaded: number;
  /** Total bytes to transfer */
  total: number;
  /** Progress percentage (0-100) */
  progress: number;
  /** Transferred bytes */
  bytes: number;
  /** Transfer rate in bytes per second */
  rate: number;
  /** Estimated time remaining in milliseconds */
  estimated: number;
}

/**
 * Enum for standardized API error codes
 */
export enum ApiErrorCode {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  PERMISSION_ERROR = 'permission_error',
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown_error'
}

/**
 * Type representing HTTP methods used in API requests
 */
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Interface for common API request headers
 */
export interface ApiHeaders {
  /** Authorization header, typically for Bearer tokens */
  Authorization: string | null;
  /** Content type of the request */
  'Content-Type': string;
  /** Expected response format */
  Accept: string;
  /** Request ID for tracing */
  'X-Request-ID': string | null;
}

/**
 * Interface for API client configuration
 */
export interface ApiConfig {
  /** Base URL for API requests */
  baseURL: string;
  /** Default timeout in milliseconds */
  timeout: number;
  /** Default headers to include with requests */
  headers: ApiHeaders;
  /** Whether to include credentials by default */
  withCredentials: boolean;
  /** Configuration for retry behavior */
  retryConfig: {
    /** Maximum number of retry attempts */
    maxRetries: number;
    /** Delay between retries in milliseconds */
    retryDelay: number;
  };
}