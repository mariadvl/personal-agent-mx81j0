import { AllowedFileType } from '../types/document';
import { SUPPORTED_FILE_TYPES, FILE_TYPE_EXTENSIONS, FILE_TYPE_MIME_TYPES } from '../constants/fileTypes';

/**
 * Default maximum file size for validation (50MB)
 */
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validates a file for upload based on type and size constraints
 * 
 * @param file - The file to validate
 * @param maxSizeBytes - Maximum allowed file size in bytes
 * @returns Validation result with error message if invalid
 */
export function validateFile(file: File, maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE): { valid: boolean; error?: string } {
  // Check if file is defined
  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Determine file type
  const fileType = getFileTypeFromFile(file);
  
  // Check if file type is supported
  if (!fileType) {
    const supportedExtensions = SUPPORTED_FILE_TYPES.flatMap(
      type => FILE_TYPE_EXTENSIONS[type]
    ).join(', ');
    
    return { 
      valid: false, 
      error: `Unsupported file type. Please upload ${supportedExtensions} files.` 
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `File size exceeds the maximum allowed size of ${formatFileSize(maxSizeBytes)}.` 
    };
  }

  return { valid: true };
}

/**
 * Determines the file type from a File object
 * 
 * @param file - The file to check
 * @returns The detected file type or null if not supported
 */
export function getFileTypeFromFile(file: File): AllowedFileType | null {
  // First try to determine from filename
  const fileType = getFileTypeFromFilename(file.name);
  
  // If unsuccessful, try to determine from MIME type
  if (!fileType && file.type) {
    return getFileTypeFromMimeType(file.type);
  }
  
  return fileType;
}

/**
 * Determines the file type from a filename by examining its extension
 * 
 * @param filename - The name of the file to check
 * @returns The detected file type or null if not supported
 */
export function getFileTypeFromFilename(filename: string): AllowedFileType | null {
  // Extract the file extension from the filename
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return null;
  
  // Convert the extension to lowercase for case-insensitive comparison
  const extension = filename.substring(lastDotIndex).toLowerCase();
  
  // Iterate through FILE_TYPE_EXTENSIONS to find a matching file type
  for (const [fileType, extensions] of Object.entries(FILE_TYPE_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return fileType as AllowedFileType;
    }
  }
  
  // Return null if no match is found
  return null;
}

/**
 * Determines the file type from a MIME type
 * 
 * @param mimeType - The MIME type to check
 * @returns The detected file type or null if not supported
 */
export function getFileTypeFromMimeType(mimeType: string): AllowedFileType | null {
  // Iterate through FILE_TYPE_MIME_TYPES to find a matching MIME type
  for (const [fileType, typeMime] of Object.entries(FILE_TYPE_MIME_TYPES)) {
    if (typeMime === mimeType) {
      return fileType as AllowedFileType;
    }
  }
  
  // Handle some special cases for MIME types that may vary
  if (mimeType === 'application/msword') {
    return 'docx';
  }
  
  if (mimeType === 'application/vnd.ms-excel') {
    return 'xlsx';
  }
  
  // Return null if no match is found
  return null;
}

/**
 * Formats a file size in bytes to a human-readable string
 * 
 * @param bytes - The file size in bytes
 * @returns Human-readable file size (e.g., '2.5 MB')
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  // Format with 1 decimal place and the appropriate unit
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Creates a File object from a Blob with a specified filename
 * 
 * @param blob - The Blob to convert to a File
 * @param filename - The filename to use for the new File
 * @returns A File object created from the Blob
 */
export function createFileFromBlob(blob: Blob, filename: string): File {
  // Create a new File object using the Blob data, filename, and appropriate options
  return new File([blob], filename, { 
    type: blob.type,
    lastModified: new Date().getTime()
  });
}

/**
 * Reads a File or Blob as text using FileReader
 * 
 * @param file - The File or Blob to read
 * @returns Promise resolving to the file contents as text
 */
export function readFileAsText(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file as text'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Reads a File or Blob as a data URL using FileReader
 * 
 * @param file - The File or Blob to read
 * @returns Promise resolving to the file contents as a data URL
 */
export function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file as data URL'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a File or Blob as an ArrayBuffer using FileReader
 * 
 * @param file - The File or Blob to read
 * @returns Promise resolving to the file contents as an ArrayBuffer
 */
export function readFileAsArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file as array buffer'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Triggers a download of a Blob or File with a specified filename
 * 
 * @param blob - The Blob or File to download
 * @param filename - The filename to use for the download
 */
export function downloadBlob(blob: Blob | File, filename: string): void {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create an anchor element
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  
  // Append the anchor to the document, trigger a click, and then remove it
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  
  // Revoke the blob URL to free up memory
  URL.revokeObjectURL(url);
}