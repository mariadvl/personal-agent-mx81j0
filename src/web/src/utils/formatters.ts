/**
 * Utility functions for formatting various data types in the Personal AI Agent.
 * These functions ensure consistent presentation across the application UI.
 */

import { formatDistanceToNow } from 'date-fns'; // ^2.30.0
import { MemoryCategory } from '../types/memory';
import { AllowedFileType } from '../types/document';

/**
 * Truncates text to a specified length and adds ellipsis if needed.
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if truncated
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text) {
    return '';
  }
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formats a memory category for display in the UI.
 * @param category The memory category to format
 * @returns Human-readable category name
 */
export const formatMemoryCategory = (category: MemoryCategory): string => {
  // Convert to lowercase, replace underscores with spaces, capitalize first letter
  const formatted = category.toLowerCase().replace(/_/g, ' ');
  return capitalizeFirstLetter(formatted);
};

/**
 * Formats a file type for display in the UI.
 * @param fileType The file type to format
 * @returns Human-readable file type
 */
export const formatFileType = (fileType: AllowedFileType): string => {
  // Convert to uppercase
  return fileType.toUpperCase();
};

/**
 * Formats a number with thousand separators and optional decimal places.
 * @param value The number to format
 * @param decimalPlaces Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export const formatNumber = (value: number, decimalPlaces: number = 0): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '';
  }
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(value);
};

/**
 * Formats a number as a percentage with optional decimal places.
 * @param value The number to format (0.1 = 10%)
 * @param decimalPlaces Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimalPlaces: number = 0): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '';
  }
  
  // Convert to percentage (multiply by 100)
  const percentage = value * 100;
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(percentage) + '%';
};

/**
 * Formats a number as currency with specified currency code.
 * @param value The number to format
 * @param currencyCode The ISO currency code (default: 'USD')
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, currencyCode: string = 'USD'): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode
  }).format(value);
};

/**
 * Formats a date as a relative time string (e.g., '5 minutes ago').
 * @param date The date to format
 * @returns Relative time string
 */
export const formatTimeAgo = (date: Date | string | number): string => {
  if (!date) {
    return '';
  }
  
  // Convert string date to Date object if needed
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

/**
 * Capitalizes the first letter of a string.
 * @param text The string to capitalize
 * @returns String with first letter capitalized
 */
export const capitalizeFirstLetter = (text: string): string => {
  if (!text) {
    return '';
  }
  
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Formats an importance level (1-5) as a descriptive string.
 * @param level The importance level
 * @returns Descriptive importance level
 */
export const formatImportanceLevel = (level: number): string => {
  switch (level) {
    case 1:
      return 'Low';
    case 2:
      return 'Medium-Low';
    case 3:
      return 'Medium';
    case 4:
      return 'Medium-High';
    case 5:
      return 'High';
    default:
      return 'Normal';
  }
};

/**
 * Formats a byte size into a human-readable format (KB, MB, GB).
 * @param bytes The size in bytes
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted byte size string
 */
export const formatByteSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Formats an array of strings into a comma-separated list with optional conjunction.
 * @param items The array of strings to format
 * @param conjunction The conjunction to use (default: 'and')
 * @returns Formatted list string
 */
export const formatListToString = (items: string[], conjunction: string = 'and'): string => {
  if (!items || items.length === 0) {
    return '';
  }
  
  if (items.length === 1) {
    return items[0];
  }
  
  if (items.length === 2) {
    return `${items[0]} ${conjunction} ${items[1]}`;
  }
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};