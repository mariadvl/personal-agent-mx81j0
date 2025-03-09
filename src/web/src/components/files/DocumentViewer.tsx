import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import DocumentUploader from './DocumentUploader';
import FileProcessingStatus from './FileProcessingStatus';
import DocumentSummary from './DocumentSummary';
import RecentDocuments from './RecentDocuments';
import useDocuments from '../../hooks/useDocuments';
import { Document, DocumentStatus } from '../../types/document';

/**
 * Props interface for the DocumentViewer component
 */
interface DocumentViewerProps {
  /** Optional ID of document to display */
  documentId: string | null;
  /** Callback function when document processing is complete */
  onDocumentProcessed?: (document: Document) => void;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * Current view state of the document viewer
 */
type ViewState = 'upload' | 'processing' | 'summary';

/**
 * Interface for tracking document processing status
 */
interface ProcessingState {
  /** Current processing status of the document */
  status: DocumentStatus | null;
  /** Processing progress value (0-100) */
  progress: number;
  /** Error message if processing failed */
  error: string | null;
}

/**
 * Helper function to determine which view to display based on document state
 */
const handleViewChange = (document: Document | null, status: DocumentStatus | null): ViewState => {
  if (!document) {
    return 'upload';
  }
  
  if (status === 'processing' || status === 'pending') {
    return 'processing';
  }
  
  if (status === 'completed' || document.processed) {
    return 'summary';
  }
  
  if (status === 'failed') {
    return 'upload';
  }
  
  // Default to upload view for any other case
  return 'upload';
};

// Styled components
const ViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionContainer = styled.div`
  margin-bottom: 16px;
`;

const RecentDocumentsSection = styled.div`
  margin-top: 16px;
`;

/**
 * A comprehensive interface for uploading, viewing, and processing documents.
 * This component manages the document lifecycle from upload through processing
 * to displaying the processed document summary.
 */
const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId = null,
  onDocumentProcessed,
  className
}) => {
  // State for current view
  const [view, setView] = useState<ViewState>('upload');
  
  // State for processing status
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: null,
    progress: 0,
    error: null
  });
  
  // Get document management functionality from the useDocuments hook
  const {
    selectedDocument,
    error,
    getDocumentStatus,
    selectDocument
  } = useDocuments({
    documentId,
    autoLoad: true
  });
  
  // Callback for when document upload is complete
  const handleUploadComplete = useCallback((uploadedDocumentId: string, filename: string) => {
    selectDocument(uploadedDocumentId);
  }, [selectDocument]);
  
  // Callback for upload errors
  const handleUploadError = useCallback((error: string) => {
    setProcessingState(prev => ({
      ...prev,
      error
    }));
  }, []);
  
  // Callbacks for document summary actions
  const handleViewFullText = useCallback(() => {
    // Implementation for viewing the full document text would go here
    console.log('View full text of document:', selectedDocument?.filename);
  }, [selectedDocument]);
  
  const handleAskQuestions = useCallback(() => {
    // Implementation for asking questions about the document would go here
    console.log('Ask questions about document:', selectedDocument?.filename);
  }, [selectedDocument]);
  
  const handleStoreInMemory = useCallback(() => {
    // Implementation for storing document in memory would go here
    console.log('Store document in memory:', selectedDocument?.filename);
  }, [selectedDocument]);
  
  // Callback for selecting a document from the recent documents list
  const handleSelectDocument = useCallback((docId: string) => {
    selectDocument(docId);
  }, [selectDocument]);
  
  // Effect to update processing state when selected document changes
  useEffect(() => {
    if (selectedDocument) {
      const docStatus = getDocumentStatus(selectedDocument.id);
      
      if (docStatus) {
        setProcessingState({
          status: docStatus.status,
          progress: docStatus.progress || 0,
          error: docStatus.error
        });
      } else {
        // Set processed status based on document.processed flag if no explicit status
        setProcessingState({
          status: selectedDocument.processed ? 'completed' : null,
          progress: selectedDocument.processed ? 100 : 0,
          error: null
        });
      }
    } else {
      // Reset processing state when no document is selected
      setProcessingState({
        status: null,
        progress: 0,
        error: null
      });
    }
  }, [selectedDocument, getDocumentStatus]);
  
  // Effect to update view based on document and status
  useEffect(() => {
    const newView = handleViewChange(selectedDocument, processingState.status);
    
    if (newView !== view) {
      setView(newView);
      
      // If view changed to summary, notify parent
      if (newView === 'summary' && selectedDocument && onDocumentProcessed) {
        onDocumentProcessed(selectedDocument);
      }
    }
  }, [selectedDocument, processingState.status, onDocumentProcessed, view]);
  
  // Update error state from hook
  useEffect(() => {
    if (error) {
      setProcessingState(prev => ({
        ...prev,
        error
      }));
    }
  }, [error]);
  
  return (
    <ViewerContainer className={className}>
      {/* Render document uploader when in upload view */}
      {view === 'upload' && (
        <SectionContainer>
          <DocumentUploader
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            autoProcess={true}
          />
        </SectionContainer>
      )}
      
      {/* Render processing status when in processing view */}
      {view === 'processing' && selectedDocument && (
        <SectionContainer>
          <FileProcessingStatus
            filename={selectedDocument.filename}
            status={processingState.status}
            progress={processingState.progress}
            error={processingState.error}
          />
        </SectionContainer>
      )}
      
      {/* Render document summary when in summary view */}
      {view === 'summary' && selectedDocument && (
        <SectionContainer>
          <DocumentSummary
            document={selectedDocument}
            onViewFullText={handleViewFullText}
            onAskQuestions={handleAskQuestions}
            onStoreInMemory={handleStoreInMemory}
          />
        </SectionContainer>
      )}
      
      {/* Always show recent documents section */}
      <RecentDocumentsSection>
        <RecentDocuments
          onSelectDocument={handleSelectDocument}
          selectedDocumentId={selectedDocument?.id || null}
        />
      </RecentDocumentsSection>
    </ViewerContainer>
  );
};

export default DocumentViewer;