import { AllowedFileType } from '../types/document';

/**
 * List of all file types supported by the application for document processing
 */
export const SUPPORTED_FILE_TYPES: AllowedFileType[] = [
  'pdf',
  'docx',
  'txt',
  'md',
  'csv',
  'xlsx'
];

/**
 * Mapping of file types to their corresponding file extensions
 * Includes multiple extensions where appropriate (e.g., both .doc and .docx)
 */
export const FILE_TYPE_EXTENSIONS: Record<AllowedFileType, string[]> = {
  pdf: ['.pdf'],
  docx: ['.docx', '.doc'],
  txt: ['.txt'],
  md: ['.md', '.markdown'],
  csv: ['.csv'],
  xlsx: ['.xlsx', '.xls']
};

/**
 * Mapping of file types to their corresponding MIME types
 * Used for content-type validation and file type detection
 */
export const FILE_TYPE_MIME_TYPES: Record<AllowedFileType, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

/**
 * Comma-separated string of all supported file extensions
 * Used for the 'accept' attribute in file input elements
 */
export const FILE_TYPE_ACCEPT_STRING: string = '.pdf,.docx,.doc,.txt,.md,.markdown,.csv,.xlsx,.xls';

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
 * Returns all valid file extensions for a specific file type
 * 
 * @param fileType - The file type to get extensions for
 * @returns Array of file extensions for the specified file type
 */
export function getFileExtensionsForType(fileType: AllowedFileType): string[] {
  return FILE_TYPE_EXTENSIONS[fileType];
}

/**
 * Returns a human-readable label for a file type
 * 
 * @param fileType - The file type to get a label for
 * @returns Human-readable label for the file type
 */
export function getFileTypeLabel(fileType: AllowedFileType): string {
  return fileType.toUpperCase();
}