/**
 * TypeScript type definitions for document-related operations in the Personal AI Agent
 * These types support document upload, processing, extraction, and retrieval functionality
 */

/**
 * Allowed file types for document processing
 */
export type AllowedFileType = 'pdf' | 'docx' | 'txt' | 'md' | 'csv' | 'xlsx';

/**
 * Document processing status states
 */
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Interface for document data structure
 */
export interface Document {
  /** Unique identifier for the document */
  id: string;
  /** Original filename */
  filename: string;
  /** Document file type */
  file_type: AllowedFileType;
  /** Path where the document is stored */
  storage_path: string;
  /** Document creation/upload timestamp */
  created_at: string;
  /** Whether the document has been processed */
  processed: boolean;
  /** Document summary (if processed) */
  summary: string | null;
  /** Additional metadata about the document */
  metadata: Record<string, any> | null;
  /** Document file size in bytes */
  size_bytes: number | null;
}

/**
 * Interface for document upload request parameters
 */
export interface DocumentUploadRequest {
  /** File object to upload */
  file: File;
  /** Whether to automatically process the document after upload */
  auto_process: boolean;
  /** Additional metadata to store with the document */
  metadata: Record<string, any>;
}

/**
 * Interface for document upload response data
 */
export interface DocumentUploadResponse {
  /** ID of the uploaded document */
  document_id: string;
  /** Name of the uploaded file */
  filename: string;
  /** Whether upload was successful */
  success: boolean;
  /** Error message if upload failed */
  error: string | null;
}

/**
 * Interface for document processing request parameters
 */
export interface DocumentProcessRequest {
  /** ID of the document to process */
  document_id: string;
  /** Whether to store document content in memory system */
  store_in_memory: boolean;
  /** Whether to generate a document summary */
  generate_summary: boolean;
  /** Additional processing options */
  processing_options: Record<string, any>;
}

/**
 * Interface for document processing response data
 */
export interface DocumentProcessResponse {
  /** ID of the processed document */
  document_id: string;
  /** Whether processing was successful */
  success: boolean;
  /** Generated document summary */
  summary: string | null;
  /** IDs of memory items created from the document */
  memory_items: string[] | null;
  /** Error message if processing failed */
  error: string | null;
}

/**
 * Interface for document processing status response
 */
export interface DocumentStatusResponse {
  /** ID of the document */
  document_id: string;
  /** Current processing status */
  status: DocumentStatus;
  /** Processing progress (0-100) */
  progress: number | null;
  /** Error message if processing failed */
  error: string | null;
}

/**
 * Interface for document list response data
 */
export interface DocumentListResponse {
  /** List of documents */
  documents: Document[];
  /** Total number of documents matching filter */
  total: number;
  /** Current page number */
  page: number;
  /** Number of documents per page */
  page_size: number;
}

/**
 * Interface for document list filtering and pagination parameters
 */
export interface DocumentFilter {
  /** Filter by file type */
  file_type: AllowedFileType | AllowedFileType[] | null;
  /** Filter by processing status */
  processed: boolean | null;
  /** Search term for document content/filename */
  search: string | null;
  /** Filter documents created after this date */
  date_from: string | null;
  /** Filter documents created before this date */
  date_to: string | null;
  /** Page number for pagination */
  page: number;
  /** Number of documents per page */
  page_size: number;
  /** Field to sort by */
  sort_by: string;
  /** Sort direction */
  sort_order: 'asc' | 'desc';
}

/**
 * Interface for document deletion response data
 */
export interface DocumentDeleteResponse {
  /** Whether deletion was successful */
  success: boolean;
  /** ID of the deleted document */
  document_id: string;
  /** Error message if deletion failed */
  error: string | null;
}

/**
 * Interface for document content chunks
 */
export interface DocumentChunk {
  /** ID of the parent document */
  document_id: string;
  /** Index of this chunk within the document */
  chunk_index: number;
  /** Text content of this chunk */
  content: string;
  /** Page number this chunk is from (if applicable) */
  page_number: number | null;
  /** Additional metadata for this chunk */
  metadata: Record<string, any> | null;
}

/**
 * Interface for document storage statistics
 */
export interface DocumentStats {
  /** Total number of documents stored */
  total_documents: number;
  /** Number of documents that have been processed */
  processed_documents: number;
  /** Total storage size of all documents in bytes */
  total_size_bytes: number;
  /** Count of documents by file type */
  by_file_type: Record<AllowedFileType, number>;
  /** Number of memory items generated from documents */
  memory_items_generated: number;
}