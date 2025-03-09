/**
 * Validation utility functions for the Personal AI Agent
 * 
 * This file contains functions for validating various inputs including emails,
 * URLs, file types, passwords, and more. These functions help ensure data
 * integrity and security throughout the application.
 */

import { AllowedFileType } from '../types/document';
import { 
  SUPPORTED_FILE_TYPES,
  FILE_TYPE_EXTENSIONS,
  FILE_TYPE_MIME_TYPES
} from '../constants/fileTypes';
import { MAX_URL_LENGTH } from '../types/web';

// Regular expressions for validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^(https?:\/\/)?([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]*[a-z0-9])?(\/[^\s]*)?$/i;

// Maximum file size in MB
const MAX_FILE_SIZE_MB = 50;

/**
 * Validates if a string is a properly formatted email address
 * 
 * @param email - The email string to validate
 * @returns True if the email is valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email);
}

/**
 * Validates if a string is a properly formatted URL
 * 
 * @param url - The URL string to validate
 * @returns True if the URL is valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  if (url.length > MAX_URL_LENGTH) {
    return false;
  }
  
  return URL_REGEX.test(url);
}

/**
 * Validates if a file is of an allowed type based on extension and MIME type
 * 
 * @param file - The file to validate
 * @returns True if the file type is valid, false otherwise
 */
export function isValidFileType(file: File): boolean {
  if (!file) {
    return false;
  }
  
  // Extract file extension from filename
  const fileName = file.name.toLowerCase();
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return false;
  }
  
  const fileExtension = fileName.substring(lastDotIndex);
  
  // Check if extension matches any allowed file type
  let matchedFileType: AllowedFileType | undefined;
  for (const fileType of SUPPORTED_FILE_TYPES) {
    if (FILE_TYPE_EXTENSIONS[fileType].includes(fileExtension)) {
      matchedFileType = fileType;
      break;
    }
  }
  
  if (!matchedFileType) {
    return false;
  }
  
  // Verify MIME type matches expected type for this extension
  const expectedMimeType = FILE_TYPE_MIME_TYPES[matchedFileType];
  
  // Some browsers and systems may report slightly different MIME types,
  // so we do a more flexible check for certain file types
  if (matchedFileType === 'docx' && (
    file.type === FILE_TYPE_MIME_TYPES.docx ||
    file.type === 'application/msword' ||
    file.type.includes('word')
  )) {
    return true;
  }
  
  if (matchedFileType === 'xlsx' && (
    file.type === FILE_TYPE_MIME_TYPES.xlsx ||
    file.type === 'application/vnd.ms-excel' ||
    file.type.includes('excel') ||
    file.type.includes('spreadsheet')
  )) {
    return true;
  }
  
  // For text-based files, be a bit more lenient
  if ((matchedFileType === 'txt' || matchedFileType === 'md') && 
      file.type.startsWith('text/')) {
    return true;
  }
  
  // For PDF files, handle variations
  if (matchedFileType === 'pdf' && 
      (file.type === 'application/pdf' || file.type === 'application/x-pdf')) {
    return true;
  }
  
  // For CSV files
  if (matchedFileType === 'csv' && 
      (file.type === 'text/csv' || file.type === 'application/csv' || file.type === 'text/plain')) {
    return true;
  }
  
  return file.type === expectedMimeType;
}

/**
 * Validates if a file size is within the allowed limit
 * 
 * @param file - The file to validate
 * @param maxSizeMB - Maximum allowed size in megabytes (defaults to MAX_FILE_SIZE_MB)
 * @returns True if the file size is valid, false otherwise
 */
export function isValidFileSize(file: File, maxSizeMB?: number): boolean {
  if (!file) {
    return false;
  }
  
  const maxSize = maxSizeMB || MAX_FILE_SIZE_MB;
  const maxSizeBytes = maxSize * 1024 * 1024;
  
  return file.size <= maxSizeBytes;
}

/**
 * Validates if a password meets security requirements:
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 * 
 * @param password - The password to validate
 * @returns True if the password meets requirements, false otherwise
 */
export function isValidPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  // Check minimum length
  if (password.length < 8) {
    return false;
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    return false;
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }
  
  return true;
}

/**
 * Validates if a name contains only allowed characters
 * (letters, spaces, hyphens, and apostrophes)
 * 
 * @param name - The name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  return /^[A-Za-z\s'-]+$/.test(name);
}

/**
 * Sanitizes user input to prevent XSS and injection attacks
 * 
 * @param input - The user input string to sanitize
 * @returns Sanitized input string
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates user message input for the chat interface
 * 
 * @param message - The message to validate
 * @returns Validation result with error message if invalid
 */
export function validateMessageInput(message: string): { 
  isValid: boolean; 
  errorMessage: string | null 
} {
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'Message cannot be empty'
    };
  }
  
  if (message.length > 4000) {
    return {
      isValid: false,
      errorMessage: 'Message is too long (maximum 4000 characters)'
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Validates URL input for the web reader
 * 
 * @param url - The URL to validate
 * @returns Validation result with error message if invalid
 */
export function validateUrlInput(url: string): { 
  isValid: boolean; 
  errorMessage: string | null 
} {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return {
      isValid: false,
      errorMessage: 'URL cannot be empty'
    };
  }
  
  if (url.length > MAX_URL_LENGTH) {
    return {
      isValid: false,
      errorMessage: `URL is too long (maximum ${MAX_URL_LENGTH} characters)`
    };
  }
  
  if (!isValidUrl(url)) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid URL'
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Validates file upload for document processing
 * 
 * @param file - The file to validate
 * @returns Validation result with error message if invalid
 */
export function validateFileUpload(file: File): { 
  isValid: boolean; 
  errorMessage: string | null 
} {
  if (!file) {
    return {
      isValid: false,
      errorMessage: 'No file selected'
    };
  }
  
  if (!isValidFileType(file)) {
    return {
      isValid: false,
      errorMessage: `Unsupported file type. Please upload one of the following: ${SUPPORTED_FILE_TYPES.join(', ')}`
    };
  }
  
  if (!isValidFileSize(file)) {
    return {
      isValid: false,
      errorMessage: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB`
    };
  }
  
  return {
    isValid: true,
    errorMessage: null
  };
}

/**
 * Validates user settings input
 * 
 * @param settings - The settings object to validate
 * @param requiredFields - Array of field names that are required
 * @returns Validation result with error messages by field
 */
export function validateSettingsInput(
  settings: Record<string, any>,
  requiredFields: string[]
): { 
  isValid: boolean; 
  errorMessages: Record<string, string> 
} {
  const errorMessages: Record<string, string> = {};
  
  // Check required fields
  for (const field of requiredFields) {
    if (settings[field] === undefined || 
        settings[field] === null || 
        (typeof settings[field] === 'string' && settings[field].trim() === '')) {
      errorMessages[field] = `${field} is required`;
    }
  }
  
  // Validate specific fields based on their type
  if (settings.email !== undefined && settings.email !== null && !isValidEmail(settings.email)) {
    errorMessages.email = 'Please enter a valid email address';
  }
  
  if (settings.name !== undefined && settings.name !== null && !isValidName(settings.name)) {
    errorMessages.name = 'Name can only contain letters, spaces, hyphens, and apostrophes';
  }
  
  if (settings.password !== undefined && settings.password !== null && !isValidPassword(settings.password)) {
    errorMessages.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
  }
  
  if (settings.url !== undefined && settings.url !== null && !isValidUrl(settings.url)) {
    errorMessages.url = 'Please enter a valid URL';
  }
  
  return {
    isValid: Object.keys(errorMessages).length === 0,
    errorMessages
  };
}