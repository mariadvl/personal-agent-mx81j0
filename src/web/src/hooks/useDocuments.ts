import { useState, useEffect, useCallback, useRef } from 'react';
import useDocumentStore from '../store/documentStore';
import { 
  Document, 
  DocumentFilter, 
  DocumentStats, 
  DocumentProcessRequest, 
  AllowedFileType,
  DocumentStatus 
} from '../types/document';
import { validateFile, formatFileSize } from '../utils/fileUtils';
import { FILE_TYPE_ACCEPT_STRING } from '../constants/fileTypes';

/**
 * Options for configuring the useDocuments hook
 */
export interface UseDocumentsOptions {
  /** Specific document ID to load on initialization */
  documentId?: string | null;
  /** Whether to automatically load documents on mount */
  autoLoad?: boolean;
  /** Initial filter to apply for document fetching */
  filter?: Partial<DocumentFilter>;
  /** Optional error handler callback */
  onError?: (error: string) => void;
}

/**
 * Status tracking for document processing
 */
export interface DocumentProcessingStatus {
  /** ID of the document being processed */
  documentId: string;
  /** Current processing status */
  status: DocumentStatus;
  /** Processing progress (0-100) */
  progress: number;
  /** Error message if processing failed */
  error: string | null;
}

/**
 * Return type for the useDocuments hook
 */
export interface UseDocumentsResult {
  // State
  /** List of documents */
  documents: Document[];
  /** Total number of documents matching the current filter */
  totalDocuments: number;
  /** Currently selected document */
  selectedDocument: Document | null;
  /** Statistics about stored documents */
  documentStats: DocumentStats | null;
  /** List of supported file types */
  supportedFileTypes: AllowedFileType[];
  /** Whether documents are currently being loaded */
  isLoading: boolean;
  /** Whether a document is currently being uploaded */
  isUploading: boolean;
  /** Whether a document is currently being processed */
  isProcessing: boolean;
  /** Upload progress percentage (0-100) */
  uploadProgress: number;
  /** Current error message, if any */
  error: string | null;
  /** Current document filter criteria */
  filter: DocumentFilter;

  // Methods
  /** Upload a new document */
  uploadDocument: (file: File, metadata?: Record<string, any>, autoProcess?: boolean) => Promise<string | null>;
  /** Process an uploaded document */
  processDocument: (documentId: string, options?: Partial<DocumentProcessRequest>) => Promise<boolean>;
  /** Fetch documents with optional filter override */
  fetchDocuments: (filterOverride?: Partial<DocumentFilter>) => Promise<void>;
  /** Select a document by ID */
  selectDocument: (documentId: string) => Promise<Document | null>;
  /** Delete a document */
  deleteDocument: (documentId: string) => Promise<boolean>;
  /** Download a document */
  downloadDocument: (documentId: string, filename: string) => Promise<boolean>;
  /** Update the document filter */
  updateFilter: (filterUpdates: Partial<DocumentFilter>) => void;
  /** Clear any current error */
  clearError: () => void;
  /** Get the processing status of a document */
  getDocumentStatus: (documentId: string) => DocumentProcessingStatus | null;

  // Convenience properties
  /** Accepted file types string for file inputs */
  acceptedFileTypes: string;
}

/**
 * A hook that provides document management functionality for the Personal AI Agent.
 * Simplifies document upload, processing, retrieval, and management.
 *
 * @param options - Configuration options for the document hook
 * @returns Document state and operations
 */
function useDocuments(options: UseDocumentsOptions = {}): UseDocumentsResult {
  const {
    documentId = null,
    autoLoad = true,
    filter: initialFilter = {},
    onError
  } = options;

  // Get document store state and actions
  const {
    documents,
    totalDocuments,
    selectedDocument,
    documentStats,
    supportedFileTypes,
    isLoading,
    isUploading,
    isProcessing,
    uploadProgress,
    error,
    filter,
    setSelectedDocument,
    setFilter,
    uploadDocument: storeUploadDocument,
    processDocument: storeProcessDocument,
    fetchDocuments: storeFetchDocuments,
    fetchDocumentById,
    deleteDocument: storeDeleteDocument,
    downloadDocument: storeDownloadDocument,
    fetchDocumentStatus,
    fetchDocumentStats,
    setError,
    clearError: storeClearError
  } = useDocumentStore();

  // Local state for tracking document processing status
  const [processingDocuments, setProcessingDocuments] = useState<Map<string, DocumentProcessingStatus>>(new Map());
  
  // Reference to store the polling interval
  const pollingIntervalRef = useRef<number | null>(null);

  // Upload a document with validation
  const uploadDocument = useCallback(async (
    file: File, 
    metadata: Record<string, any> = {}, 
    autoProcess: boolean = true
  ): Promise<string | null> => {
    // Validate file before uploading
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return null;
    }

    // Upload the document
    const response = await storeUploadDocument(file, metadata, autoProcess);
    
    // Return document ID if successful
    if (response) {
      return response.document_id;
    }
    
    return null;
  }, [storeUploadDocument, setError]);

  // Function to start polling document status
  const startPollingDocumentStatus = useCallback(() => {
    // Clear existing interval if any
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Start new polling interval
    pollingIntervalRef.current = window.setInterval(async () => {
      // Get IDs of all documents being processed
      const processingIds = Array.from(processingDocuments.keys());
      
      if (processingIds.length === 0) {
        // Stop polling if no documents are being processed
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        return;
      }
      
      // Check status of each processing document
      for (const id of processingIds) {
        try {
          const statusResponse = await fetchDocumentStatus(id);
          
          if (statusResponse) {
            const { status, progress, error } = statusResponse;
            
            setProcessingDocuments(prev => {
              const newMap = new Map(prev);
              newMap.set(id, {
                documentId: id,
                status,
                progress: progress || 0,
                error
              });
              
              // Remove completed or failed documents from tracking after a delay
              if (status === 'completed' || status === 'failed') {
                setTimeout(() => {
                  setProcessingDocuments(current => {
                    const updatedMap = new Map(current);
                    updatedMap.delete(id);
                    return updatedMap;
                  });
                }, 5000);
              }
              
              return newMap;
            });
          }
        } catch (err) {
          console.error(`Error checking status for document ${id}:`, err);
        }
      }
    }, 2000); // Poll every 2 seconds
  }, [fetchDocumentStatus, processingDocuments]);

  // Effect to handle polling when processingDocuments changes
  useEffect(() => {
    // Start polling if there are documents being processed
    if (processingDocuments.size > 0 && !pollingIntervalRef.current) {
      startPollingDocumentStatus();
    }
    
    // Clean up on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [processingDocuments, startPollingDocumentStatus]);

  // Process a document with default options
  const processDocument = useCallback(async (
    documentId: string,
    options?: Partial<DocumentProcessRequest>
  ): Promise<boolean> => {
    // Create default processing request
    const processRequest: DocumentProcessRequest = {
      document_id: documentId,
      store_in_memory: true,
      generate_summary: true,
      processing_options: {},
      ...options
    };

    // Process the document
    const response = await storeProcessDocument(documentId, processRequest);
    
    // If processing started successfully, track its status
    if (response) {
      setProcessingDocuments(prev => {
        const newMap = new Map(prev);
        newMap.set(documentId, {
          documentId,
          status: 'processing',
          progress: 0,
          error: null
        });
        return newMap;
      });
      
      return true;
    }
    
    return false;
  }, [storeProcessDocument]);

  // Fetch documents with optional filter override
  const fetchDocuments = useCallback(async (
    filterOverride?: Partial<DocumentFilter>
  ): Promise<void> => {
    await storeFetchDocuments(filterOverride);
  }, [storeFetchDocuments]);

  // Select a document by ID
  const selectDocument = useCallback(async (
    documentId: string
  ): Promise<Document | null> => {
    const doc = await fetchDocumentById(documentId);
    return doc;
  }, [fetchDocumentById]);

  // Delete a document
  const deleteDocument = useCallback(async (
    documentId: string
  ): Promise<boolean> => {
    // Remove from processing documents if being processed
    if (processingDocuments.has(documentId)) {
      setProcessingDocuments(prev => {
        const newMap = new Map(prev);
        newMap.delete(documentId);
        return newMap;
      });
    }
    
    return await storeDeleteDocument(documentId);
  }, [storeDeleteDocument, processingDocuments]);

  // Download a document
  const downloadDocument = useCallback(async (
    documentId: string,
    filename: string
  ): Promise<boolean> => {
    return await storeDownloadDocument(documentId, filename);
  }, [storeDownloadDocument]);

  // Update filter and trigger reload
  const updateFilter = useCallback((
    filterUpdates: Partial<DocumentFilter>
  ): void => {
    setFilter(filterUpdates);
  }, [setFilter]);

  // Clear error
  const clearError = useCallback((): void => {
    storeClearError();
  }, [storeClearError]);

  // Get document processing status
  const getDocumentStatus = useCallback((
    documentId: string
  ): DocumentProcessingStatus | null => {
    return processingDocuments.get(documentId) || null;
  }, [processingDocuments]);

  // Load documents when the component mounts or filter changes
  useEffect(() => {
    if (autoLoad) {
      // Apply initial filter if provided
      if (Object.keys(initialFilter).length > 0) {
        setFilter(initialFilter);
      }
      
      // Fetch documents
      fetchDocuments();
    }
  }, [autoLoad, fetchDocuments, initialFilter, setFilter]);

  // Load specific document if documentId is provided
  useEffect(() => {
    if (documentId && autoLoad) {
      selectDocument(documentId);
    }
  }, [documentId, autoLoad, selectDocument]);

  // Load document stats
  useEffect(() => {
    if (autoLoad) {
      fetchDocumentStats();
    }
  }, [autoLoad, fetchDocumentStats]);

  // Forward errors to the onError handler if provided
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Return state and methods
  return {
    // State
    documents,
    totalDocuments,
    selectedDocument,
    documentStats,
    supportedFileTypes,
    isLoading,
    isUploading,
    isProcessing,
    uploadProgress,
    error,
    filter,
    
    // Methods
    uploadDocument,
    processDocument,
    fetchDocuments,
    selectDocument,
    deleteDocument,
    downloadDocument,
    updateFilter,
    clearError,
    getDocumentStatus,
    
    // Convenience properties
    acceptedFileTypes: FILE_TYPE_ACCEPT_STRING
  };
}

export default useDocuments;