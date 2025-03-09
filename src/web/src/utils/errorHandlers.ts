import { ApiErrorCode, ApiErrorResponse } from '../types/api';
import { AlertType } from '../types/ui';
import { useUIStore } from '../store/uiStore';
import axios from 'axios'; // axios version ^1.3.0

/**
 * Type guard to check if an error is an API error response
 */
export function isApiError(error: unknown): error is ApiErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status_code' in error &&
    'error' in error
  );
}

/**
 * Type guard to check if an error is an Axios error
 */
export function isAxiosError(error: unknown): error is axios.AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as any).isAxiosError === true
  );
}

/**
 * Determines the appropriate error code based on the error type and status
 */
export function getErrorCode(error: Error | ApiErrorResponse): ApiErrorCode {
  // If it's our API error type, use the error code directly
  if (isApiError(error)) {
    // Map HTTP status codes to ApiErrorCode
    switch (error.status_code) {
      case 400:
        return ApiErrorCode.VALIDATION_ERROR;
      case 401:
        return ApiErrorCode.AUTHENTICATION_ERROR;
      case 403:
        return ApiErrorCode.PERMISSION_ERROR;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 422:
        return ApiErrorCode.VALIDATION_ERROR;
      case 429:
        return ApiErrorCode.RATE_LIMIT;
      default:
        return error.status_code >= 500 
          ? ApiErrorCode.SERVER_ERROR 
          : ApiErrorCode.UNKNOWN;
    }
  }
  
  // Handle Axios errors
  if (isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED' 
        ? ApiErrorCode.TIMEOUT 
        : ApiErrorCode.NETWORK_ERROR;
    }
    
    // Map Axios response status codes to ApiErrorCode
    switch (error.response.status) {
      case 401:
        return ApiErrorCode.AUTHENTICATION_ERROR;
      case 403:
        return ApiErrorCode.PERMISSION_ERROR;
      case 404:
        return ApiErrorCode.NOT_FOUND;
      case 400:
      case 422:
        return ApiErrorCode.VALIDATION_ERROR;
      case 429:
        return ApiErrorCode.RATE_LIMIT;
      default:
        return error.response.status >= 500 
          ? ApiErrorCode.SERVER_ERROR 
          : ApiErrorCode.UNKNOWN;
    }
  }
  
  // Handle network-related errors
  if (error.message?.includes('network') || error.message?.includes('connection')) {
    return ApiErrorCode.NETWORK_ERROR;
  }
  
  if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
    return ApiErrorCode.TIMEOUT;
  }
  
  // If we couldn't determine a specific error code, return UNKNOWN
  return ApiErrorCode.UNKNOWN;
}

/**
 * Formats an error into a user-friendly message
 */
export function formatErrorMessage(
  error: Error | ApiErrorResponse | unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again later.'
): string {
  // If no error, return fallback message
  if (error === null || error === undefined) {
    return fallbackMessage;
  }
  
  // If error is just a string, return it directly
  if (typeof error === 'string') {
    return error;
  }
  
  // If it's our API error type
  if (isApiError(error)) {
    return error.detail || error.error || fallbackMessage;
  }
  
  // If it's an Axios error
  if (isAxiosError(error)) {
    // Try to get error from response data
    const responseData = error.response?.data;
    if (responseData) {
      if (typeof responseData === 'string') {
        return responseData;
      }
      if (typeof responseData === 'object' && responseData !== null) {
        if ('detail' in responseData) return responseData.detail as string;
        if ('error' in responseData) return responseData.error as string;
        if ('message' in responseData) return responseData.message as string;
      }
    }
    
    // If we couldn't extract from response data, use error message
    return error.message || fallbackMessage;
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }
  
  // For unknown error types, return fallback message
  return fallbackMessage;
}

/**
 * Handles API errors with appropriate user feedback and logging
 */
export function handleApiError(
  error: Error | ApiErrorResponse | unknown,
  options: {
    showToast?: boolean;
    logError?: boolean;
    fallbackMessage?: string;
  } = {}
): void {
  const { 
    showToast = true, 
    logError = true,
    fallbackMessage = 'An unexpected error occurred. Please try again later.'
  } = options;
  
  const errorCode = error instanceof Error || isApiError(error) 
    ? getErrorCode(error) 
    : ApiErrorCode.UNKNOWN;
    
  const message = formatErrorMessage(error, fallbackMessage);
  
  // Log the error if requested
  if (logError) {
    logError(error, 'API Error');
  }
  
  // Show toast notification if requested
  if (showToast) {
    let alertType: AlertType;
    
    // Determine alert type based on error code
    switch (errorCode) {
      case ApiErrorCode.AUTHENTICATION_ERROR:
      case ApiErrorCode.PERMISSION_ERROR:
      case ApiErrorCode.SERVER_ERROR:
        alertType = AlertType.ERROR;
        break;
      case ApiErrorCode.RATE_LIMIT:
      case ApiErrorCode.VALIDATION_ERROR:
        alertType = AlertType.WARNING;
        break;
      case ApiErrorCode.NOT_FOUND:
        alertType = AlertType.INFO;
        break;
      default:
        alertType = AlertType.ERROR;
    }
    
    // Add alert to UI store
    useUIStore.getState().addAlert({
      type: alertType,
      message,
      autoClose: true,
    });
  }
}

/**
 * Creates a standardized error object with an error code
 */
export function createErrorWithCode(
  message: string,
  code: ApiErrorCode
): Error {
  const error = new Error(message);
  (error as any).code = code;
  return error;
}

/**
 * Logs an error with appropriate severity level
 */
export function logError(
  error: Error | ApiErrorResponse | unknown,
  context: string
): void {
  const message = formatErrorMessage(error);
  const errorCode = error instanceof Error || isApiError(error) 
    ? getErrorCode(error) 
    : ApiErrorCode.UNKNOWN;
  
  // Determine log level based on error code
  switch (errorCode) {
    case ApiErrorCode.SERVER_ERROR:
    case ApiErrorCode.AUTHENTICATION_ERROR:
    case ApiErrorCode.PERMISSION_ERROR:
      console.error(`[${context}] ${message}`, error);
      break;
    case ApiErrorCode.VALIDATION_ERROR:
    case ApiErrorCode.RATE_LIMIT:
      console.warn(`[${context}] ${message}`, error);
      break;
    default:
      console.error(`[${context}] ${message}`, error);
  }
  
  // Log stack trace in development for debugging
  if (process.env.NODE_ENV === 'development' && error instanceof Error) {
    console.debug(`Stack trace for [${context}]:`, error.stack);
  }
}