import { useState, useEffect, useCallback, useRef } from 'react';
import { get, post, put, delete as delete_ } from '../services/api';
import { uploadFile } from '../services/api';
import { ApiResponse, ApiRequestOptions, ApiState, ApiStatus, FileUploadOptions } from '../types/api';
import { handleApiError } from '../utils/errorHandlers';
import useLocalStorage from './useLocalStorage';

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Creates the initial state for API requests
 */
function createInitialApiState<T = any>(): ApiState<T> {
  return {
    status: 'idle',
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    timestamp: null
  };
}

/**
 * Generates a cache key based on URL and parameters
 */
function getCacheKey(url: string, params: Record<string, any> = {}): string {
  // Sort params to ensure consistent cache keys
  const sortedParams = Object.keys(params).sort().reduce((result, key) => {
    result[key] = params[key];
    return result;
  }, {} as Record<string, any>);
  
  return `${url}?${JSON.stringify(sortedParams)}`;
}

/**
 * A hook for making API requests with state management
 */
export function useApi<T = any>(options: ApiHookOptions<T> = {}): ApiHookResult<T> {
  // Extract options with defaults
  const {
    initialData = null,
    cacheKey = null,
    cacheTTL = CACHE_TTL,
    onSuccess,
    onError,
    showErrorToast = true
  } = options;

  // Initialize state
  const [state, setState] = useState<ApiState<T>>(() => {
    return initialData
      ? {
          status: 'success',
          data: initialData,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
          timestamp: Date.now()
        }
      : createInitialApiState<T>();
  });

  // AbortController reference for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cache key reference for tracking current cache key
  const currentCacheKeyRef = useRef<string | null>(cacheKey);

  // Local storage for caching if cacheKey is provided
  const [cache, setCache] = useLocalStorage<Record<string, { data: T; timestamp: number }>>(
    'api_cache',
    {},
    false
  );

  // Initialize from cache if available
  useEffect(() => {
    if (cacheKey && cache && cache[cacheKey]) {
      const { data, timestamp } = cache[cacheKey];
      // Check if cache is still valid
      if (Date.now() - timestamp < cacheTTL) {
        setState({
          status: 'success',
          data,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false,
          timestamp
        });
      }
    }
  }, [cacheKey, cache, cacheTTL]);

  // Update currentCacheKeyRef when cacheKey changes
  useEffect(() => {
    currentCacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  // Function to abort any in-progress request
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Reset state to initial
  const reset = useCallback(() => {
    setState(createInitialApiState<T>());
  }, []);

  // Generic request function
  const request = useCallback(
    async (
      method: 'get' | 'post' | 'put' | 'delete' | 'upload',
      url: string,
      data?: any,
      options?: ApiRequestOptions | FileUploadOptions
    ): Promise<ApiResponse<T>> => {
      // Abort any existing request
      abort();

      // Create new AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Set loading state
      setState(prev => ({
        ...prev,
        status: 'loading',
        isLoading: true,
        isSuccess: false,
        isError: false
      }));

      try {
        let response: ApiResponse<T>;
        const requestOptions: ApiRequestOptions = options 
          ? { ...options as ApiRequestOptions, signal: abortController.signal }
          : { signal: abortController.signal } as ApiRequestOptions;

        // Execute the appropriate request method
        switch (method) {
          case 'get':
            response = await get<T>(url, data, requestOptions);
            break;
          case 'post':
            response = await post<T>(url, data, requestOptions);
            break;
          case 'put':
            response = await put<T>(url, data, requestOptions);
            break;
          case 'delete':
            response = await delete_<T>(url, requestOptions);
            break;
          case 'upload':
            response = await uploadFile<T>(url, data, options as FileUploadOptions);
            break;
          default:
            throw new Error(`Unsupported method: ${method}`);
        }

        // Check if the request was successful
        if (response.success) {
          // Update state with success data
          setState({
            status: 'success',
            data: response.data,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
            timestamp: Date.now()
          });

          // If this was a GET request and caching is enabled, update cache
          if (method === 'get' && currentCacheKeyRef.current) {
            const key = currentCacheKeyRef.current;
            setCache(prev => ({
              ...prev,
              [key]: {
                data: response.data,
                timestamp: Date.now()
              }
            }));
          }

          // Call onSuccess callback if provided
          if (onSuccess) {
            onSuccess(response.data);
          }
        } else {
          // Update state with error
          setState({
            status: 'error',
            data: null,
            error: response.error || 'An unknown error occurred',
            isLoading: false,
            isSuccess: false,
            isError: true,
            timestamp: Date.now()
          });

          // Call onError callback if provided
          if (onError) {
            onError(response.error || 'An unknown error occurred');
          }

          // Show error toast if enabled
          if (showErrorToast) {
            handleApiError(response.error || 'An unknown error occurred', { showToast: true });
          }
        }

        return response;
      } catch (error) {
        // Handle errors, including aborted requests
        if (
          error instanceof DOMException && 
          (error.name === 'AbortError' || error.code === 20)
        ) {
          // Request was aborted, update state accordingly
          setState(prev => ({
            ...prev,
            status: 'idle',
            isLoading: false,
            isSuccess: false,
            isError: false
          }));
        } else {
          // Other errors
          const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
          
          setState({
            status: 'error',
            data: null,
            error: errorMessage,
            isLoading: false,
            isSuccess: false,
            isError: true,
            timestamp: Date.now()
          });

          // Call onError callback if provided
          if (onError) {
            onError(errorMessage);
          }

          // Show error toast if enabled
          if (showErrorToast) {
            handleApiError(error, { showToast: true });
          }
        }

        // Return a fallback error response
        return {
          success: false,
          data: null as unknown as T,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          metadata: null
        };
      } finally {
        // Clean up AbortController reference
        abortControllerRef.current = null;
      }
    },
    [abort, onSuccess, onError, showErrorToast, setCache]
  );

  // Request method wrappers
  const get_ = useCallback(
    (url: string, params: Record<string, any> = {}, options?: ApiRequestOptions) => {
      return request('get', url, params, options);
    },
    [request]
  );

  const post_ = useCallback(
    (url: string, data: any = {}, options?: ApiRequestOptions) => {
      return request('post', url, data, options);
    },
    [request]
  );

  const put_ = useCallback(
    (url: string, data: any = {}, options?: ApiRequestOptions) => {
      return request('put', url, data, options);
    },
    [request]
  );

  const delete__ = useCallback(
    (url: string, options?: ApiRequestOptions) => {
      return request('delete', url, undefined, options);
    },
    [request]
  );

  const upload = useCallback(
    (url: string, file: File | Blob, options?: FileUploadOptions) => {
      return request('upload', url, file, options);
    },
    [request]
  );

  return {
    state,
    get: get_,
    post: post_,
    put: put_,
    delete: delete__,
    upload,
    abort,
    reset
  };
}

/**
 * A hook for making a single API request with automatic execution
 */
export function useApiRequest<T = any>(
  url: string,
  options: {
    method?: 'get' | 'post' | 'put' | 'delete';
    params?: Record<string, any>;
    data?: any;
    requestOptions?: ApiRequestOptions;
    apiOptions?: ApiHookOptions<T>;
    dependencies?: any[];
    skip?: boolean;
  } = {}
): ApiRequestHookResult<T> {
  const {
    method = 'get',
    params = {},
    data = {},
    requestOptions = {},
    apiOptions = {},
    dependencies = [],
    skip = false
  } = options;

  const api = useApi<T>(apiOptions);
  const { state, abort } = api;

  // Function to execute the request
  const execute = useCallback(async () => {
    if (method === 'get') {
      return api.get(url, params, requestOptions);
    } else if (method === 'post') {
      return api.post(url, data, requestOptions);
    } else if (method === 'put') {
      return api.put(url, data, requestOptions);
    } else if (method === 'delete') {
      return api.delete(url, requestOptions);
    }
    throw new Error(`Unsupported method: ${method}`);
  }, [api, method, url, params, data, requestOptions]);

  // Memoized refetch function
  const refetch = useCallback(async () => {
    return execute();
  }, [execute]);

  // Execute request when dependencies change or on mount
  useEffect(() => {
    if (!skip) {
      execute();
    }
    
    // Cleanup function to abort request on unmount or dependencies change
    return () => {
      abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execute, abort, skip, ...dependencies]);

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    refetch,
    abort
  };
}

/**
 * A hook for making API requests on demand (not automatically executed)
 */
export function useLazyApiRequest<T = any>(
  options: {
    method?: 'get' | 'post' | 'put' | 'delete';
    apiOptions?: ApiHookOptions<T>;
  } = {}
): LazyApiRequestHookResult<T> {
  const { method = 'get', apiOptions = {} } = options;
  const api = useApi<T>(apiOptions);
  const { state, abort } = api;

  // Function to execute the request
  const execute = useCallback(
    async (
      url: string,
      dataOrParams?: any,
      options?: ApiRequestOptions
    ): Promise<ApiResponse<T>> => {
      if (method === 'get') {
        return api.get(url, dataOrParams, options);
      } else if (method === 'post') {
        return api.post(url, dataOrParams, options);
      } else if (method === 'put') {
        return api.put(url, dataOrParams, options);
      } else if (method === 'delete') {
        return api.delete(url, options);
      }
      throw new Error(`Unsupported method: ${method}`);
    },
    [api, method]
  );

  return {
    data: state.data,
    error: state.error,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    execute,
    abort
  };
}

/**
 * Interface for API hook options
 */
export interface ApiHookOptions<T = any> {
  initialData?: T | null;
  cacheKey?: string | null;
  cacheTTL?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  showErrorToast?: boolean;
}

/**
 * Interface for API hook result
 */
export interface ApiHookResult<T = any> {
  state: ApiState<T>;
  get: (url: string, params?: Record<string, any>, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  post: (url: string, data?: any, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  put: (url: string, data?: any, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  delete: (url: string, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  upload: (url: string, file: File | Blob, options?: FileUploadOptions) => Promise<ApiResponse<T>>;
  abort: () => void;
  reset: () => void;
}

/**
 * Interface for API request hook result
 */
export interface ApiRequestHookResult<T = any> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  refetch: () => Promise<ApiResponse<T>>;
  abort: () => void;
}

/**
 * Interface for lazy API request hook result
 */
export interface LazyApiRequestHookResult<T = any> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (url: string, data?: any, options?: ApiRequestOptions) => Promise<ApiResponse<T>>;
  abort: () => void;
}