/**
 * API Service for Personal AI Agent
 * 
 * This service provides a standardized interface for making HTTP requests to the backend API.
 * It handles request formatting, error handling, authentication, and response processing,
 * serving as the foundation for all frontend-to-backend communication.
 */

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'; // axios version ^1.3.0
import { API_ROUTES } from '../constants/apiRoutes';
import { 
  ApiResponse, 
  ApiErrorResponse, 
  ApiRequestOptions,
  FileUploadOptions,
  ApiErrorCode 
} from '../types/api';
import { 
  handleApiError, 
  formatErrorMessage, 
  createErrorWithCode 
} from '../utils/errorHandlers';
import { 
  getLocalStorage, 
  setLocalStorage 
} from '../utils/storage';

// Constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const AUTH_TOKEN_KEY = 'auth_token';

/**
 * Creates and configures an Axios instance with default settings
 */
function createAxiosInstance() {
  const instance = axios.create({
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Request interceptor for adding authentication
  instance.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for standardizing responses
  instance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );

  return instance;
}

/**
 * Retrieves the authentication token from local storage
 */
export function getAuthToken(): string | null {
  return getLocalStorage(AUTH_TOKEN_KEY);
}

/**
 * Stores the authentication token in local storage
 */
export function setAuthToken(token: string): boolean {
  return setLocalStorage(AUTH_TOKEN_KEY, token);
}

/**
 * Removes the authentication token from local storage
 */
export function clearAuthToken(): boolean {
  return setLocalStorage(AUTH_TOKEN_KEY, null);
}

/**
 * Type guard to check if an error is an API error response
 */
export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as any).success === false &&
    'error' in error &&
    'status_code' in error
  );
}

/**
 * Processes an API response to ensure consistent format
 */
function processResponse<T>(response: AxiosResponse): ApiResponse<T> {
  // If the response is already in our format, return it
  if (response.data && 'success' in response.data) {
    return response.data as ApiResponse<T>;
  }

  // Otherwise, wrap it in our format
  return {
    success: true,
    data: response.data as T,
    error: null,
    metadata: null
  };
}

/**
 * Handles API request errors and standardizes error format
 */
function handleRequestError(error: Error | AxiosError): ApiErrorResponse {
  let errorMessage = 'An unexpected error occurred';
  let statusCode = 500;
  let errorDetail = null;
  let errorPath = null;

  if (axios.isAxiosError(error)) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      statusCode = error.response.status;
      errorPath = error.response.config.url || null;
      
      if (error.response.data && typeof error.response.data === 'object') {
        errorMessage = error.response.data.error || 
                      error.response.data.message || 
                      error.response.data.detail || 
                      error.message;
        errorDetail = error.response.data.detail || error.message;
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else {
        errorMessage = error.message;
      }
    } else if (error.request) {
      // The request was made but no response was received
      statusCode = 0;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
        statusCode = 408;
      } else {
        errorMessage = 'Network error. Please check your connection.';
        statusCode = 0;
      }
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return {
    success: false,
    error: errorMessage,
    status_code: statusCode,
    detail: errorDetail || error.message,
    path: errorPath,
    timestamp: new Date().toISOString()
  };
}

/**
 * Determines if a failed request should be retried
 */
function shouldRetry(error: Error | AxiosError, retryCount: number): boolean {
  // Don't retry if we've reached the max retries
  if (retryCount >= MAX_RETRIES) {
    return false;
  }

  // Retry network errors
  if (axios.isAxiosError(error)) {
    // No response = network error
    if (!error.response) {
      return true;
    }
    
    // Retry server errors (5xx)
    if (error.response.status >= 500 && error.response.status < 600) {
      return true;
    }
    
    // Retry rate limiting (429)
    if (error.response.status === 429) {
      return true;
    }
  }
  
  return false;
}

/**
 * Makes a GET request to the specified URL
 */
export async function get<T = any>(
  url: string,
  params: Record<string, any> = {},
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  let retryCount = 0;
  const axiosInstance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    params,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || null,
    withCredentials: options.withCredentials || false,
    responseType: options.responseType as any || 'json'
  };
  
  while (true) {
    try {
      const response = await axiosInstance.get<T>(url, config);
      return processResponse<T>(response);
    } catch (error) {
      if (shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff with jitter
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorResponse = handleRequestError(error as Error);
        // Convert to ApiResponse format for consistent return type
        return {
          success: false,
          data: null as unknown as T,
          error: errorResponse.error,
          metadata: {
            status_code: errorResponse.status_code,
            detail: errorResponse.detail,
            path: errorResponse.path,
            timestamp: errorResponse.timestamp
          }
        };
      }
    }
  }
}

/**
 * Makes a POST request to the specified URL
 */
export async function post<T = any>(
  url: string,
  data: any = {},
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  let retryCount = 0;
  const axiosInstance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || null,
    withCredentials: options.withCredentials || false,
    responseType: options.responseType as any || 'json'
  };
  
  while (true) {
    try {
      const response = await axiosInstance.post<T>(url, data, config);
      return processResponse<T>(response);
    } catch (error) {
      if (shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff with jitter
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorResponse = handleRequestError(error as Error);
        return {
          success: false,
          data: null as unknown as T,
          error: errorResponse.error,
          metadata: {
            status_code: errorResponse.status_code,
            detail: errorResponse.detail,
            path: errorResponse.path,
            timestamp: errorResponse.timestamp
          }
        };
      }
    }
  }
}

/**
 * Makes a PUT request to the specified URL
 */
export async function put<T = any>(
  url: string,
  data: any = {},
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  let retryCount = 0;
  const axiosInstance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || null,
    withCredentials: options.withCredentials || false,
    responseType: options.responseType as any || 'json'
  };
  
  while (true) {
    try {
      const response = await axiosInstance.put<T>(url, data, config);
      return processResponse<T>(response);
    } catch (error) {
      if (shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff with jitter
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorResponse = handleRequestError(error as Error);
        return {
          success: false,
          data: null as unknown as T,
          error: errorResponse.error,
          metadata: {
            status_code: errorResponse.status_code,
            detail: errorResponse.detail,
            path: errorResponse.path,
            timestamp: errorResponse.timestamp
          }
        };
      }
    }
  }
}

/**
 * Makes a DELETE request to the specified URL
 */
export async function delete_<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  let retryCount = 0;
  const axiosInstance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || null,
    withCredentials: options.withCredentials || false,
    responseType: options.responseType as any || 'json'
  };
  
  while (true) {
    try {
      const response = await axiosInstance.delete<T>(url, config);
      return processResponse<T>(response);
    } catch (error) {
      if (shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff with jitter
        const delay = RETRY_DELAY * Math.pow(2, retryCount - 1) + Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        const errorResponse = handleRequestError(error as Error);
        return {
          success: false,
          data: null as unknown as T,
          error: errorResponse.error,
          metadata: {
            status_code: errorResponse.status_code,
            detail: errorResponse.detail,
            path: errorResponse.path,
            timestamp: errorResponse.timestamp
          }
        };
      }
    }
  }
}

/**
 * Uploads a file to the specified URL with progress tracking
 */
export async function uploadFile<T = any>(
  url: string,
  file: File | Blob,
  options: FileUploadOptions = { onProgress: () => {}, additionalData: null }
): Promise<ApiResponse<T>> {
  const axiosInstance = createAxiosInstance();
  
  const formData = new FormData();
  formData.append('file', file);
  
  // Add any additional data
  if (options.additionalData) {
    Object.entries(options.additionalData).forEach(([key, value]) => {
      formData.append(key, value instanceof Blob ? value : String(value));
    });
  }
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT * 2, // Longer timeout for uploads
    signal: options.signal || null,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (options.onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        options.onProgress(progress);
      }
    }
  };
  
  try {
    const response = await axiosInstance.post<T>(url, formData, config);
    return processResponse<T>(response);
  } catch (error) {
    const errorResponse = handleRequestError(error as Error);
    return {
      success: false,
      data: null as unknown as T,
      error: errorResponse.error,
      metadata: {
        status_code: errorResponse.status_code,
        detail: errorResponse.detail,
        path: errorResponse.path,
        timestamp: errorResponse.timestamp
      }
    };
  }
}

/**
 * Downloads a file from the specified URL
 */
export async function downloadFile(
  url: string,
  filename: string,
  options: ApiRequestOptions = {}
): Promise<boolean> {
  const axiosInstance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT * 2, // Longer timeout for downloads
    responseType: 'blob',
    headers: options.headers || {},
    signal: options.signal || null,
    withCredentials: options.withCredentials || false
  };
  
  try {
    const response = await axiosInstance.get(url, config);
    const blob = new Blob([response.data]);
    const objectUrl = URL.createObjectURL(blob);
    
    // Create an anchor element and trigger download
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 100);
    
    return true;
  } catch (error) {
    handleApiError(error, { 
      showToast: true, 
      fallbackMessage: `Failed to download ${filename}` 
    });
    return false;
  }
}

// Export aliases for better naming
export { delete_ as delete };