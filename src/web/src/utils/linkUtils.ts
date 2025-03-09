/**
 * Link utility functions for the Personal AI Agent web application
 * 
 * This file provides helper functions for URL manipulation, validation,
 * parsing, and formatting to support web content extraction and link
 * handling throughout the application.
 */

import { MAX_URL_LENGTH } from '../types/web';
import { isValidUrl, sanitizeInput } from '../utils/validators';

// Constants for internal domains and allowed URL protocols
const INTERNAL_DOMAINS = ["localhost", "127.0.0.1"];
const URL_PROTOCOLS = ["http:", "https:"];

/**
 * Normalizes a URL by ensuring it has a protocol and proper formatting
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL with protocol
 */
export function normalizeUrl(url: string): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Trim whitespace from the URL
  const trimmedUrl = url.trim();
  if (trimmedUrl === '') {
    return '';
  }
  
  // Check if URL already has a protocol (http:// or https://)
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  // If no protocol, prepend 'https://' to the URL
  return `https://${trimmedUrl}`;
}

/**
 * Extracts the domain from a URL
 * 
 * @param url - The URL to extract domain from
 * @returns Domain name without protocol or path
 */
export function getUrlDomain(url: string): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    // Normalize the URL using normalizeUrl function
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return '';
    }
    
    // Create a URL object from the normalized URL
    const urlObj = new URL(normalizedUrl);
    
    // Extract and return the hostname (domain) from the URL object
    return urlObj.hostname;
  } catch (error) {
    // Handle any exceptions and return empty string if parsing fails
    return '';
  }
}

/**
 * Checks if a URL points to an internal domain
 * 
 * @param url - The URL to check
 * @returns True if the URL is for an internal domain
 */
export function isInternalDomain(url: string): boolean {
  // Extract domain using getUrlDomain function
  const domain = getUrlDomain(url);
  if (!domain) {
    return false;
  }
  
  // Check if domain is in the INTERNAL_DOMAINS array
  return INTERNAL_DOMAINS.includes(domain);
}

/**
 * Checks if a URL points to an external domain
 * 
 * @param url - The URL to check
 * @returns True if the URL is for an external domain
 */
export function isExternalUrl(url: string): boolean {
  // Use isInternalDomain function to check if URL is internal
  return !isInternalDomain(url);
}

/**
 * Truncates a URL to a specified maximum length with ellipsis
 * 
 * @param url - The URL to truncate
 * @param maxLength - Maximum length (defaults to 50 if not specified)
 * @returns Truncated URL with ellipsis if needed
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // If URL length is less than or equal to maxLength, return the URL as is
  if (url.length <= maxLength) {
    return url;
  }
  
  // If URL length exceeds maxLength, truncate and add ellipsis
  return `${url.substring(0, maxLength - 3)}...`;
}

/**
 * Removes the protocol (http:// or https://) from a URL
 * 
 * @param url - The URL to process
 * @returns URL without the protocol
 */
export function getUrlWithoutProtocol(url: string): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Normalize the URL using normalizeUrl function
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) {
    return '';
  }
  
  // Replace 'http://' or 'https://' with empty string
  return normalizedUrl.replace(/^https?:\/\//, '');
}

/**
 * Extracts the path portion from a URL
 * 
 * @param url - The URL to process
 * @returns Path portion of the URL
 */
export function getUrlPath(url: string): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    // Normalize the URL using normalizeUrl function
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return '';
    }
    
    // Create a URL object from the normalized URL
    const urlObj = new URL(normalizedUrl);
    
    // Extract and return the pathname from the URL object
    return urlObj.pathname;
  } catch (error) {
    // Handle any exceptions and return empty string if parsing fails
    return '';
  }
}

/**
 * Extracts query parameters from a URL as an object
 * 
 * @param url - The URL to process
 * @returns Object containing query parameters
 */
export function getUrlQueryParams(url: string): Record<string, string> {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return {};
  }
  
  try {
    // Normalize the URL using normalizeUrl function
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return {};
    }
    
    // Create a URL object from the normalized URL
    const urlObj = new URL(normalizedUrl);
    
    // Get URLSearchParams from the URL object
    const params: Record<string, string> = {};
    
    // Convert URLSearchParams to a Record object
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    // Return the query parameters object
    return params;
  } catch (error) {
    // Handle any exceptions and return empty object if parsing fails
    return {};
  }
}

/**
 * Adds query parameters to a URL
 * 
 * @param url - The base URL
 * @param params - Object containing parameters to add
 * @returns URL with added query parameters
 */
export function addQueryParamsToUrl(url: string, params: Record<string, string>): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    // Normalize the URL using normalizeUrl function
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return '';
    }
    
    // Create a URL object from the normalized URL
    const urlObj = new URL(normalizedUrl);
    
    // Iterate through params and append each to the URL's searchParams
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.append(key, value);
    });
    
    // Return the URL with added parameters as a string
    return urlObj.toString();
  } catch (error) {
    // Handle any exceptions and return original URL if operation fails
    return url;
  }
}

/**
 * Checks if a URL has a valid and allowed protocol
 * 
 * @param url - The URL to check
 * @returns True if the URL has a valid protocol
 */
export function isValidProtocol(url: string): boolean {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    // Normalize the URL using normalizeUrl function
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      return false;
    }
    
    // Create a URL object from the normalized URL
    const urlObj = new URL(normalizedUrl);
    
    // Check if the URL's protocol is in the URL_PROTOCOLS array
    return URL_PROTOCOLS.includes(urlObj.protocol);
  } catch (error) {
    // Handle any exceptions and return false if parsing fails
    return false;
  }
}

/**
 * Sanitizes a URL to prevent security issues like XSS
 * 
 * @param url - The URL to sanitize
 * @returns Sanitized URL
 */
export function sanitizeUrl(url: string): string {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  // Use sanitizeInput function to sanitize the URL
  const sanitizedUrl = sanitizeInput(url);
  
  // Normalize the sanitized URL using normalizeUrl function
  const normalizedUrl = normalizeUrl(sanitizedUrl);
  
  // Validate the URL using isValidUrl function
  if (!isValidUrl(normalizedUrl)) {
    return '';
  }
  
  // Return the sanitized and normalized URL if valid
  return normalizedUrl;
}

/**
 * Creates a full URL from a relative path and base URL
 * 
 * @param path - The relative path
 * @param baseUrl - The base URL
 * @returns Full URL combining base and path
 */
export function createUrlFromPath(path: string, baseUrl: string): string {
  // Check if path is null, undefined, or empty
  if (!path || typeof path !== 'string') {
    return baseUrl;
  }
  
  // Normalize the baseUrl using normalizeUrl function
  const normalizedBaseUrl = normalizeUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return '';
  }
  
  // Ensure baseUrl ends with a slash if needed
  const baseWithSlash = normalizedBaseUrl.endsWith('/') 
    ? normalizedBaseUrl 
    : `${normalizedBaseUrl}/`;
  
  // Ensure path doesn't start with a slash if baseUrl ends with one
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Combine baseUrl and path
  return `${baseWithSlash}${cleanPath}`;
}

/**
 * Checks if a URL exceeds the maximum allowed length
 * 
 * @param url - The URL to check
 * @returns True if the URL exceeds maximum length
 */
export function isUrlTooLong(url: string): boolean {
  // Check if url is null, undefined, or empty
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Compare URL length with MAX_URL_LENGTH constant
  return url.length > MAX_URL_LENGTH;
}