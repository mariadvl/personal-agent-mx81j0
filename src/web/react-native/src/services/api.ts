import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios'; // axios version ^1.3.0
import NetInfo from '@react-native-community/netinfo'; // v9.3.0
import * as FileSystem from 'react-native-fs'; // v2.20.0
import { Platform } from 'react-native'; // v0.72.0

// Internal imports
import { API_ROUTES } from '../../src/constants/apiRoutes';
import { 
  ApiResponse, 
  ApiErrorResponse, 
  ApiRequestOptions, 
  FileUploadOptions,
  ApiErrorCode 
} from '../../src/types/api';
import { formatErrorMessage, createErrorWithCode } from '../../src/utils/errorHandlers';
import { retrieveData, storeData } from './storageService';

// Constants
const DEFAULT_TIMEOUT = 45000; // 45 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const AUTH_TOKEN_KEY = "auth_token";
const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';

/**
 * Creates and configures an Axios instance with default settings for React Native
 */
const createAxiosInstance = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: DEFAULT_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
  
  // Request interceptor for authentication
  instance.interceptors.request.use(async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });
  
  // Request interceptor for network connectivity check
  instance.interceptors.request.use(async (config) => {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw createErrorWithCode(
        'No network connection available.',
        ApiErrorCode.NETWORK_ERROR
      );
    }
    return config;
  });
  
  // Response interceptor for standardizing responses
  instance.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(handleRequestError(error))
  );
  
  return instance;
};

/**
 * Retrieves the authentication token from device storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  return retrieveData(AUTH_TOKEN_KEY);
};

/**
 * Stores the authentication token in device storage
 */
export const setAuthToken = async (token: string): Promise<boolean> => {
  return storeData(AUTH_TOKEN_KEY, token);
};

/**
 * Removes the authentication token from device storage
 */
export const clearAuthToken = async (): Promise<boolean> => {
  return storeData(AUTH_TOKEN_KEY, null);
};

/**
 * Type guard to check if an error is an API error response
 */
export const isApiError = (error: unknown): error is ApiErrorResponse => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as ApiErrorResponse).success === false &&
    'error' in error &&
    'status_code' in error
  );
};

/**
 * Processes an API response to ensure consistent format
 */
const processResponse = <T>(response: AxiosResponse): ApiResponse<T> => {
  // Check if response is already in ApiResponse format
  if (
    response.data &&
    typeof response.data === 'object' &&
    'success' in response.data &&
    'data' in response.data
  ) {
    return response.data as ApiResponse<T>;
  }
  
  // If not, wrap it in ApiResponse format
  return {
    success: true,
    data: response.data,
    error: null,
    metadata: null
  };
};

/**
 * Handles API request errors and standardizes error format
 */
const handleRequestError = (error: Error | AxiosError): ApiErrorResponse => {
  // Axios error with response from server
  if (axios.isAxiosError(error) && error.response) {
    // Try to extract error details from response
    const responseData = error.response.data;
    const errorMessage = typeof responseData === 'object' && responseData !== null && 'error' in responseData
      ? responseData.error
      : error.message;
    
    return {
      success: false,
      error: errorMessage,
      status_code: error.response.status,
      detail: typeof responseData === 'object' && responseData !== null && 'detail' in responseData
        ? responseData.detail
        : null,
      path: error.config?.url || null,
      timestamp: new Date().toISOString()
    };
  }
  
  // Axios error without response (network error, timeout)
  if (axios.isAxiosError(error) && !error.response) {
    let errorCode = ApiErrorCode.UNKNOWN;
    let statusCode = 0;
    
    if (error.code === 'ECONNABORTED') {
      errorCode = ApiErrorCode.TIMEOUT;
      statusCode = 408; // Request Timeout
    } else if (error.message && (
      error.message.includes('Network Error') || 
      error.message.includes('network') ||
      error.message.includes('connection')
    )) {
      errorCode = ApiErrorCode.NETWORK_ERROR;
      statusCode = 0; // No HTTP status for network errors
    }
    
    return {
      success: false,
      error: formatErrorMessage(error),
      status_code: statusCode,
      detail: error.message || null,
      path: error.config?.url || null,
      timestamp: new Date().toISOString()
    };
  }
  
  // React Native specific network errors
  if (error instanceof Error && (
    error.message.includes('Network request failed') ||
    error.message.includes('timeout') ||
    error.message.includes('connection')
  )) {
    return {
      success: false,
      error: 'Network connection error',
      status_code: 0,
      detail: error.message,
      path: null,
      timestamp: new Date().toISOString()
    };
  }
  
  // Generic error
  return {
    success: false,
    error: formatErrorMessage(error),
    status_code: 500, // Default to internal server error
    detail: error instanceof Error ? error.message : 'Unknown error',
    path: null,
    timestamp: new Date().toISOString()
  };
};

/**
 * Determines if a failed request should be retried
 */
const shouldRetry = async (error: Error | AxiosError, retryCount: number): Promise<boolean> => {
  // Don't retry if we've reached max retries
  if (retryCount >= MAX_RETRIES) {
    return false;
  }
  
  // Check if error is retryable
  const isNetworkError = axios.isAxiosError(error) && !error.response;
  const isTimeout = axios.isAxiosError(error) && error.code === 'ECONNABORTED';
  const isServerError = axios.isAxiosError(error) && 
    error.response && error.response.status >= 500 && error.response.status < 600;
  
  // Only retry on network errors, timeouts, or server errors
  if (!(isNetworkError || isTimeout || isServerError)) {
    return false;
  }
  
  // Check network connectivity before retrying
  const netInfo = await NetInfo.fetch();
  return netInfo.isConnected === true;
};

/**
 * Makes a GET request to the specified URL
 */
export const get = async <T>(
  url: string,
  params: Record<string, any> = {},
  options: ApiRequestOptions = {} as ApiRequestOptions
): Promise<ApiResponse<T>> => {
  let retryCount = 0;
  const instance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    params,
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || undefined,
    responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 
                 options.responseType === 'blob' ? 'blob' : 
                 options.responseType === 'text' ? 'text' : 'json',
    withCredentials: options.withCredentials || false
  };
  
  // Network connectivity check
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return {
      success: false,
      data: null as any,
      error: 'No network connection available',
      metadata: null
    };
  }
  
  while (true) {
    try {
      const response = await instance.get(url, config);
      return processResponse<T>(response);
    } catch (error) {
      if (await shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount - 1)));
        continue;
      }
      
      return {
        success: false,
        data: null as any,
        error: formatErrorMessage(error),
        metadata: null
      };
    }
  }
};

/**
 * Makes a POST request to the specified URL
 */
export const post = async <T>(
  url: string,
  data: any = {},
  options: ApiRequestOptions = {} as ApiRequestOptions
): Promise<ApiResponse<T>> => {
  let retryCount = 0;
  const instance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || undefined,
    responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 
                 options.responseType === 'blob' ? 'blob' : 
                 options.responseType === 'text' ? 'text' : 'json',
    withCredentials: options.withCredentials || false
  };
  
  // Network connectivity check
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return {
      success: false,
      data: null as any,
      error: 'No network connection available',
      metadata: null
    };
  }
  
  while (true) {
    try {
      const response = await instance.post(url, data, config);
      return processResponse<T>(response);
    } catch (error) {
      if (await shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount - 1)));
        continue;
      }
      
      return {
        success: false,
        data: null as any,
        error: formatErrorMessage(error),
        metadata: null
      };
    }
  }
};

/**
 * Makes a PUT request to the specified URL
 */
export const put = async <T>(
  url: string,
  data: any = {},
  options: ApiRequestOptions = {} as ApiRequestOptions
): Promise<ApiResponse<T>> => {
  let retryCount = 0;
  const instance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || undefined,
    responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 
                 options.responseType === 'blob' ? 'blob' : 
                 options.responseType === 'text' ? 'text' : 'json',
    withCredentials: options.withCredentials || false
  };
  
  // Network connectivity check
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return {
      success: false,
      data: null as any,
      error: 'No network connection available',
      metadata: null
    };
  }
  
  while (true) {
    try {
      const response = await instance.put(url, data, config);
      return processResponse<T>(response);
    } catch (error) {
      if (await shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount - 1)));
        continue;
      }
      
      return {
        success: false,
        data: null as any,
        error: formatErrorMessage(error),
        metadata: null
      };
    }
  }
};

/**
 * Makes a DELETE request to the specified URL
 */
export const delete_ = async <T>(
  url: string,
  options: ApiRequestOptions = {} as ApiRequestOptions
): Promise<ApiResponse<T>> => {
  let retryCount = 0;
  const instance = createAxiosInstance();
  
  const config: AxiosRequestConfig = {
    timeout: options.timeout || DEFAULT_TIMEOUT,
    headers: options.headers || {},
    signal: options.signal || undefined,
    responseType: options.responseType === 'arraybuffer' ? 'arraybuffer' : 
                 options.responseType === 'blob' ? 'blob' : 
                 options.responseType === 'text' ? 'text' : 'json',
    withCredentials: options.withCredentials || false
  };
  
  // Network connectivity check
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return {
      success: false,
      data: null as any,
      error: 'No network connection available',
      metadata: null
    };
  }
  
  while (true) {
    try {
      const response = await instance.delete(url, config);
      return processResponse<T>(response);
    } catch (error) {
      if (await shouldRetry(error as Error, retryCount)) {
        retryCount++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, retryCount - 1)));
        continue;
      }
      
      return {
        success: false,
        data: null as any,
        error: formatErrorMessage(error),
        metadata: null
      };
    }
  }
};

// Export delete function with proper name
export { delete_ as delete };

/**
 * Uploads a file to the specified URL with progress tracking
 */
export const uploadFile = async <T>(
  url: string,
  filePath: string,
  options: FileUploadOptions = { onProgress: () => {}, additionalData: null }
): Promise<ApiResponse<T>> => {
  try {
    const instance = createAxiosInstance();
    
    // Create FormData for file upload
    const formData = new FormData();
    
    // Read file info (not content)
    const fileInfo = await FileSystem.stat(filePath);
    
    // Add file to FormData
    formData.append('file', {
      uri: Platform.OS === 'android' ? filePath : `file://${filePath}`,
      name: filePath.split('/').pop(),
      type: 'application/octet-stream', // Or determine MIME type based on extension
    } as any);
    
    // Add additional data if provided
    if (options.additionalData) {
      Object.entries(options.additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }
    
    // Set up upload progress tracking
    const onProgress = options.onProgress || (() => {});
    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
      signal: options.signal
    };
    
    // Network connectivity check
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return {
        success: false,
        data: null as any,
        error: 'No network connection available',
        metadata: null
      };
    }
    
    const response = await instance.post(url, formData, config);
    return processResponse<T>(response);
  } catch (error) {
    return {
      success: false,
      data: null as any,
      error: formatErrorMessage(error),
      metadata: null
    };
  }
};

/**
 * Downloads a file from the specified URL to the device's file system
 */
export const downloadFile = async (
  url: string,
  destinationPath: string,
  options: { onProgress?: (progress: number) => void, timeout?: number } = {}
): Promise<boolean> => {
  try {
    const instance = createAxiosInstance();
    
    // Network connectivity check
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw new Error('No network connection available');
    }
    
    // Ensure directory exists
    const dirname = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
    const exists = await FileSystem.exists(dirname);
    if (!exists) {
      await FileSystem.mkdir(dirname);
    }
    
    // Set up download options
    const downloadOptions = {
      fromUrl: url,
      toFile: destinationPath,
      background: false,
      progress: (res: { bytesWritten: number, contentLength: number }) => {
        if (res.contentLength > 0 && options.onProgress) {
          const progress = (res.bytesWritten / res.contentLength) * 100;
          options.onProgress(progress);
        }
      },
      headers: {
        // Add authorization if needed
        Authorization: await getAuthToken() ? `Bearer ${await getAuthToken()}` : ''
      }
    };
    
    const result = await FileSystem.downloadFile(downloadOptions).promise;
    
    return result.statusCode === 200;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
};

/**
 * Checks if the API server is reachable
 */
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    // First check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return false;
    }
    
    // Then check API server
    const instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 5000 // Short timeout for connection check
    });
    
    await instance.head('');
    return true;
  } catch (error) {
    return false;
  }
};

// Export API base URL for use in other parts of the application
export { API_BASE_URL };