/**
 * Document Service
 * 
 * This service provides functions for interacting with the document processing API endpoints.
 * It handles document upload, processing, retrieval, deletion, and other document-related
 * operations for the Personal AI Agent.
 */

import { API_ROUTES } from '../constants/apiRoutes';
import { 
  get, 
  post, 
  put, 
  delete as deleteRequest, 
  uploadFile, 
  downloadFile 
} from '../services/api';
import { 
  Document, 
  DocumentUploadResponse, 
  DocumentProcessRequest,
  DocumentProcessResponse,
  DocumentListResponse,
  DocumentFilter,
  DocumentStatusResponse,
  DocumentDeleteResponse,
  DocumentStats,
  AllowedFileType
} from '../types/document';
import { ApiResponse, FileUploadOptions } from '../types/api';

// Maximum allowed file size (50MB)
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

// Supported file types
export const ALLOWED_FILE_TYPES: AllowedFileType[] = [
  'pdf', 
  'docx', 
  'txt', 
  'md', 
  'csv', 
  'xlsx'
];

// String for file input accept attribute
export const FILE_TYPE_ACCEPT_STRING = '.pdf,.docx,.txt,.md,.csv,.xlsx';

/**
 * Uploads a document file to the server
 * @param file - The file to upload
 * @param options - Optional upload options including progress tracking
 * @returns Promise resolving to the upload response
 */
export async function uploadDocument(
  file: File,
  options: FileUploadOptions = { onProgress: () => {}, additionalData: null }
): Promise<ApiResponse<DocumentUploadResponse>> {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add additional data if provided
  if (options.additionalData) {
    Object.entries(options.additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    });
  }
  
  return uploadFile<DocumentUploadResponse>(API_ROUTES.DOCUMENT.UPLOAD, file, options);
}

/**
 * Sends a request to process an uploaded document
 * @param documentId - ID of the document to process
 * @param processOptions - Options for document processing
 * @returns Promise resolving to the processing response
 */
export async function processDocument(
  documentId: string,
  processOptions: DocumentProcessRequest
): Promise<ApiResponse<DocumentProcessResponse>> {
  const url = API_ROUTES.DOCUMENT.PROCESS.replace('{id}', documentId);
  return post<DocumentProcessResponse>(url, processOptions);
}

/**
 * Retrieves a document by its ID
 * @param documentId - ID of the document to retrieve
 * @returns Promise resolving to the document data
 */
export async function getDocumentById(
  documentId: string
): Promise<ApiResponse<Document>> {
  const url = API_ROUTES.DOCUMENT.GET_BY_ID.replace('{id}', documentId);
  return get<Document>(url);
}

/**
 * Retrieves a list of documents with optional filtering
 * @param filter - Filtering and pagination options
 * @returns Promise resolving to the document list
 */
export async function getDocuments(
  filter: DocumentFilter
): Promise<ApiResponse<DocumentListResponse>> {
  return get<DocumentListResponse>(API_ROUTES.DOCUMENT.BASE, filter);
}

/**
 * Checks the processing status of a document
 * @param documentId - ID of the document to check
 * @returns Promise resolving to the document status
 */
export async function getDocumentStatus(
  documentId: string
): Promise<ApiResponse<DocumentStatusResponse>> {
  const url = API_ROUTES.DOCUMENT.STATUS.replace('{id}', documentId);
  return get<DocumentStatusResponse>(url);
}

/**
 * Deletes a document by its ID
 * @param documentId - ID of the document to delete
 * @returns Promise resolving to the deletion response
 */
export async function deleteDocument(
  documentId: string
): Promise<ApiResponse<DocumentDeleteResponse>> {
  const url = API_ROUTES.DOCUMENT.DELETE.replace('{id}', documentId);
  return deleteRequest<DocumentDeleteResponse>(url);
}

/**
 * Downloads a document file
 * @param documentId - ID of the document to download
 * @param filename - Name to save the file as
 * @returns Promise resolving to true if download was successful
 */
export async function downloadDocument(
  documentId: string,
  filename: string
): Promise<boolean> {
  const url = API_ROUTES.DOCUMENT.DOWNLOAD.replace('{id}', documentId);
  return downloadFile(url, filename);
}

/**
 * Retrieves statistics about stored documents
 * @returns Promise resolving to document statistics
 */
export async function getDocumentStats(): Promise<ApiResponse<DocumentStats>> {
  return get<DocumentStats>(API_ROUTES.DOCUMENT.STATS);
}

/**
 * Returns the list of supported file types for document upload
 * @returns Array of supported file types
 */
export function getSupportedFileTypes(): AllowedFileType[] {
  return ALLOWED_FILE_TYPES;
}

/**
 * Validates if a file type is supported for upload
 * @param fileType - File type or extension to validate
 * @returns True if the file type is supported, false otherwise
 */
export function validateFileType(fileType: string): boolean {
  // Extract extension if it includes a period
  const extension = fileType.includes('.') ? fileType.split('.').pop()?.toLowerCase() : fileType.toLowerCase();
  return ALLOWED_FILE_TYPES.includes(extension as AllowedFileType);
}

/**
 * Validates if a file size is within the allowed limit
 * @param sizeBytes - File size in bytes
 * @returns True if the file size is within limits, false otherwise
 */
export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., '2.5 MB')
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  
  while (bytes >= 1024 && unitIndex < units.length - 1) {
    bytes /= 1024;
    unitIndex++;
  }
  
  return `${bytes.toFixed(2)} ${units[unitIndex]}`;
}