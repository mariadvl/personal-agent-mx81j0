import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  Document,
  DocumentFilter,
  DocumentStats,
  DocumentUploadResponse,
  DocumentProcessResponse,
  DocumentStatusResponse,
  DocumentDeleteResponse,
  AllowedFileType,
  DocumentProcessRequest
} from '../types/document';
import {
  uploadDocument as apiUploadDocument,
  processDocument as apiProcessDocument,
  getDocumentById,
  getDocuments,
  getDocumentStatus,
  deleteDocument as apiDeleteDocument,
  downloadDocument as apiDownloadDocument,
  getDocumentStats,
  getSupportedFileTypes,
  validateFileType,
  validateFileSize,
  FILE_TYPE_ACCEPT_STRING
} from '../services/documentService';

/**
 * Interface for the document store state and actions
 */
export interface DocumentStore {
  // State
  documents: Document[];
  totalDocuments: number;
  selectedDocument: Document | null;
  documentStats: DocumentStats | null;
  supportedFileTypes: AllowedFileType[];
  isLoading: boolean;
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  error: string | null;
  filter: DocumentFilter;

  // Actions
  setSelectedDocument: (document: Document | null) => void;
  setFilter: (filterUpdates: Partial<DocumentFilter>) => void;
  uploadDocument: (
    file: File, 
    metadata?: Record<string, any>, 
    autoProcess?: boolean,
    onProgress?: (progress: number) => void
  ) => Promise<DocumentUploadResponse | null>;
  processDocument: (
    documentId: string, 
    options: DocumentProcessRequest
  ) => Promise<DocumentProcessResponse | null>;
  fetchDocuments: (
    filterOverride?: Partial<DocumentFilter>
  ) => Promise<void>;
  fetchDocumentById: (
    documentId: string
  ) => Promise<Document | null>;
  deleteDocument: (
    documentId: string
  ) => Promise<boolean>;
  downloadDocument: (
    documentId: string, 
    filename: string
  ) => Promise<boolean>;
  fetchDocumentStatus: (
    documentId: string
  ) => Promise<DocumentStatusResponse | null>;
  fetchDocumentStats: () => Promise<DocumentStats | null>;
  setError: (errorMessage: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

// Initial state for the document filter
const defaultFilter: DocumentFilter = {
  file_type: null,
  processed: null,
  search: null,
  date_from: null,
  date_to: null,
  page: 1,
  page_size: 10,
  sort_by: 'created_at',
  sort_order: 'desc'
};

/**
 * Zustand store for managing document state in the Personal AI Agent.
 * Handles document data, processing status, and interactions with document API endpoints.
 */
const useDocumentStore = create<DocumentStore>()(
  immer((set, get) => ({
    // Initial state
    documents: [],
    totalDocuments: 0,
    selectedDocument: null,
    documentStats: null,
    supportedFileTypes: getSupportedFileTypes(),
    isLoading: false,
    isUploading: false,
    isProcessing: false,
    uploadProgress: 0,
    error: null,
    filter: defaultFilter,

    // Actions
    setSelectedDocument: (document) => {
      set((state) => {
        state.selectedDocument = document;
      });
    },

    setFilter: (filterUpdates) => {
      set((state) => {
        state.filter = { ...state.filter, ...filterUpdates };
      });
    },

    uploadDocument: async (file, metadata = {}, autoProcess = false, onProgress) => {
      set((state) => {
        state.isUploading = true;
        state.error = null;
        state.uploadProgress = 0;
      });

      try {
        // Define the progress callback that updates the store state
        const handleProgress = (progress: number) => {
          set((state) => {
            state.uploadProgress = progress;
          });
          // Also call the external progress handler if provided
          if (onProgress) {
            onProgress(progress);
          }
        };

        // Upload options with metadata and progress tracking
        const options = {
          additionalData: metadata,
          onProgress: handleProgress
        };

        // Call the API to upload the document
        const response = await apiUploadDocument(file, options);

        if (response.success && response.data) {
          // If upload was successful, update documents list
          const newDocument: Document = {
            id: response.data.document_id,
            filename: response.data.filename,
            file_type: file.name.split('.').pop()?.toLowerCase() as AllowedFileType,
            storage_path: '', // Will be filled in when processed
            created_at: new Date().toISOString(),
            processed: false,
            summary: null,
            metadata: metadata,
            size_bytes: file.size
          };

          set((state) => {
            state.documents = [newDocument, ...state.documents];
            state.totalDocuments = state.totalDocuments + 1;
          });

          // If autoProcess is true, automatically process the document
          if (autoProcess) {
            get().processDocument(response.data.document_id, {
              document_id: response.data.document_id,
              store_in_memory: true,
              generate_summary: true,
              processing_options: {}
            });
          }

          set((state) => {
            state.isUploading = false;
          });

          return response.data;
        } else {
          // If there was an error, set error message
          set((state) => {
            state.isUploading = false;
            state.error = response.error || 'Failed to upload document';
          });
          return null;
        }
      } catch (error) {
        set((state) => {
          state.isUploading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return null;
      }
    },

    processDocument: async (documentId, options) => {
      set((state) => {
        state.isProcessing = true;
        state.error = null;
      });

      try {
        const response = await apiProcessDocument(documentId, options);

        if (response.success && response.data) {
          // Update the document in the store with processed status
          set((state) => {
            const documentIndex = state.documents.findIndex(doc => doc.id === documentId);
            if (documentIndex !== -1) {
              state.documents[documentIndex].processed = true;
              state.documents[documentIndex].summary = response.data.summary;
            }
            
            // If this is the selected document, update it too
            if (state.selectedDocument?.id === documentId) {
              state.selectedDocument.processed = true;
              state.selectedDocument.summary = response.data.summary;
            }

            state.isProcessing = false;
          });

          return response.data;
        } else {
          set((state) => {
            state.isProcessing = false;
            state.error = response.error || 'Failed to process document';
          });
          return null;
        }
      } catch (error) {
        set((state) => {
          state.isProcessing = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return null;
      }
    },

    fetchDocuments: async (filterOverride) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Merge the current filter with any overrides
        const filter = filterOverride 
          ? { ...get().filter, ...filterOverride }
          : get().filter;
        
        const response = await getDocuments(filter);

        if (response.success && response.data) {
          set((state) => {
            state.documents = response.data.documents;
            state.totalDocuments = response.data.total;
            state.isLoading = false;
          });
        } else {
          set((state) => {
            state.isLoading = false;
            state.error = response.error || 'Failed to fetch documents';
          });
        }
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
      }
    },

    fetchDocumentById: async (documentId) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await getDocumentById(documentId);

        if (response.success && response.data) {
          // Update the document in the store
          set((state) => {
            // Find and update the document in the documents array
            const documentIndex = state.documents.findIndex(doc => doc.id === documentId);
            if (documentIndex !== -1) {
              state.documents[documentIndex] = response.data;
            } else {
              // If it's not in the array, add it
              state.documents = [response.data, ...state.documents];
            }
            
            // Set as selected document
            state.selectedDocument = response.data;
            state.isLoading = false;
          });

          return response.data;
        } else {
          set((state) => {
            state.isLoading = false;
            state.error = response.error || `Failed to fetch document with ID: ${documentId}`;
          });
          return null;
        }
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return null;
      }
    },

    deleteDocument: async (documentId) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await apiDeleteDocument(documentId);

        if (response.success && response.data.success) {
          set((state) => {
            // Remove the document from the documents array
            state.documents = state.documents.filter(doc => doc.id !== documentId);
            
            // If this was the selected document, clear the selection
            if (state.selectedDocument?.id === documentId) {
              state.selectedDocument = null;
            }
            
            // Decrement total count
            state.totalDocuments -= 1;
            state.isLoading = false;
          });
          return true;
        } else {
          set((state) => {
            state.isLoading = false;
            state.error = response.error || `Failed to delete document with ID: ${documentId}`;
          });
          return false;
        }
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return false;
      }
    },

    downloadDocument: async (documentId, filename) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const success = await apiDownloadDocument(documentId, filename);
        
        set((state) => {
          state.isLoading = false;
          if (!success) {
            state.error = `Failed to download document: ${filename}`;
          }
        });
        
        return success;
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return false;
      }
    },

    fetchDocumentStatus: async (documentId) => {
      try {
        const response = await getDocumentStatus(documentId);

        if (response.success && response.data) {
          // If the document is now processed, update its status
          if (response.data.status === 'completed') {
            set((state) => {
              const documentIndex = state.documents.findIndex(doc => doc.id === documentId);
              if (documentIndex !== -1) {
                state.documents[documentIndex].processed = true;
              }
              
              // Also update selected document if relevant
              if (state.selectedDocument?.id === documentId) {
                state.selectedDocument.processed = true;
              }
            });
          }
          
          return response.data;
        } else {
          set((state) => {
            state.error = response.error || `Failed to fetch status for document with ID: ${documentId}`;
          });
          return null;
        }
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return null;
      }
    },

    fetchDocumentStats: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await getDocumentStats();

        if (response.success && response.data) {
          set((state) => {
            state.documentStats = response.data;
            state.isLoading = false;
          });
          return response.data;
        } else {
          set((state) => {
            state.isLoading = false;
            state.error = response.error || 'Failed to fetch document statistics';
          });
          return null;
        }
      } catch (error) {
        set((state) => {
          state.isLoading = false;
          state.error = error instanceof Error ? error.message : 'An unknown error occurred';
        });
        return null;
      }
    },

    setError: (errorMessage) => {
      set((state) => {
        state.error = errorMessage;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    resetState: () => {
      set((state) => {
        state.documents = [];
        state.totalDocuments = 0;
        state.selectedDocument = null;
        state.documentStats = null;
        state.isLoading = false;
        state.isUploading = false;
        state.isProcessing = false;
        state.uploadProgress = 0;
        state.error = null;
        state.filter = defaultFilter;
      });
    }
  }))
);

export default useDocumentStore;