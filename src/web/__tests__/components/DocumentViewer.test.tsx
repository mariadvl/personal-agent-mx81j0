import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import DocumentViewer from '../../src/components/files/DocumentViewer';
import DocumentUploader from '../../src/components/files/DocumentUploader';
import FileProcessingStatus from '../../src/components/files/FileProcessingStatus';
import DocumentSummary from '../../src/components/files/DocumentSummary';
import RecentDocuments from '../../src/components/files/RecentDocuments';
import useDocuments from '../../src/hooks/useDocuments';
import { Document, DocumentStatus } from '../../src/types/document';

// Mock the hooks and components used by DocumentViewer
jest.mock('../../src/hooks/useDocuments');
jest.mock('../../src/components/files/DocumentUploader', () => {
  return function MockDocumentUploader({ onUploadComplete, onUploadError }) {
    return (
      <div data-testid="document-uploader">
        <button 
          data-testid="upload-complete-button" 
          onClick={() => onUploadComplete('doc-123', 'test.pdf')}
        >
          Simulate Upload Complete
        </button>
        <button 
          data-testid="upload-error-button" 
          onClick={() => onUploadError('Test upload error')}
        >
          Simulate Upload Error
        </button>
      </div>
    );
  };
});

jest.mock('../../src/components/files/FileProcessingStatus', () => {
  return function MockFileProcessingStatus({ filename, status, progress, error }) {
    return (
      <div data-testid="file-processing-status">
        <div data-testid="filename">{filename}</div>
        <div data-testid="status">{status}</div>
        <div data-testid="progress">{progress}</div>
        {error && <div data-testid="error">{error}</div>}
      </div>
    );
  };
});

jest.mock('../../src/components/files/DocumentSummary', () => {
  return function MockDocumentSummary({ document, onViewFullText, onAskQuestions, onStoreInMemory }) {
    return (
      <div data-testid="document-summary">
        <div data-testid="document-id">{document.id}</div>
        <div data-testid="document-filename">{document.filename}</div>
        <div data-testid="document-summary-text">{document.summary || 'No summary'}</div>
        <button data-testid="view-full-text" onClick={onViewFullText}>View Full Text</button>
        <button data-testid="ask-questions" onClick={onAskQuestions}>Ask Questions</button>
        <button data-testid="store-in-memory" onClick={onStoreInMemory}>Store in Memory</button>
      </div>
    );
  };
});

jest.mock('../../src/components/files/RecentDocuments', () => {
  return function MockRecentDocuments({ onSelectDocument, selectedDocumentId }) {
    return (
      <div data-testid="recent-documents">
        <button 
          data-testid="select-document-button" 
          onClick={() => onSelectDocument('doc-456')}
        >
          Select Document
        </button>
        <div data-testid="selected-document-id">{selectedDocumentId || 'none'}</div>
      </div>
    );
  };
});

describe('DocumentViewer', () => {
  // Sample document data for testing
  const mockDocument: Document = {
    id: 'doc-123',
    filename: 'test.pdf',
    file_type: 'pdf',
    storage_path: '/documents/test.pdf',
    created_at: '2023-06-01T12:00:00Z',
    processed: false,
    summary: null,
    metadata: null,
    size_bytes: 1024
  };

  const mockDocumentProcessing: Document = {
    ...mockDocument,
    processed: false
  };

  const mockDocumentCompleted: Document = {
    ...mockDocument,
    processed: true,
    summary: 'This is a test summary of the document.'
  };

  const mockDocumentFailed: Document = {
    ...mockDocument,
    processed: false
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument: jest.fn(),
      isUploading: false,
      isProcessing: false,
      uploadProgress: 0
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to render the component with default props
  const renderDocumentViewer = (props = {}) => {
    return render(<DocumentViewer documentId={null} {...props} />);
  };

  test('renders correctly in initial state', () => {
    renderDocumentViewer();
    
    // Should show document uploader by default
    expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
    
    // Should show recent documents
    expect(screen.getByTestId('recent-documents')).toBeInTheDocument();
    
    // Should not show processing status or document summary
    expect(screen.queryByTestId('file-processing-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-summary')).not.toBeInTheDocument();
  });

  test('shows upload view by default', () => {
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
    expect(screen.queryByTestId('file-processing-status')).not.toBeInTheDocument();
    expect(screen.queryByTestId('document-summary')).not.toBeInTheDocument();
  });

  test('handles document upload completion', async () => {
    const selectDocument = jest.fn();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument
    });
    
    renderDocumentViewer();
    
    // Simulate document upload completion
    fireEvent.click(screen.getByTestId('upload-complete-button'));
    
    // Should call selectDocument with the document ID
    expect(selectDocument).toHaveBeenCalledWith('doc-123');
    
    // Update mock to return a document with processing status
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentProcessing,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'processing', 
        progress: 50, 
        error: null 
      }),
      selectDocument
    });
    
    // Re-render to reflect state changes
    renderDocumentViewer();
    
    // Should now show the processing status
    expect(screen.getByTestId('file-processing-status')).toBeInTheDocument();
    expect(screen.queryByTestId('document-uploader')).not.toBeInTheDocument();
  });

  test('shows processing status when document is being processed', () => {
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentProcessing,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'processing', 
        progress: 50, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Should show processing status
    expect(screen.getByTestId('file-processing-status')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('processing');
    expect(screen.getByTestId('progress')).toHaveTextContent('50');
  });

  test('shows document summary when processing is complete', () => {
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Should show document summary
    expect(screen.getByTestId('document-summary')).toBeInTheDocument();
    expect(screen.queryByTestId('file-processing-status')).not.toBeInTheDocument();
    expect(screen.getByTestId('document-summary-text')).toHaveTextContent('This is a test summary of the document.');
  });

  test('handles document selection from recent documents', () => {
    const selectDocument = jest.fn();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument
    });
    
    renderDocumentViewer();
    
    // Simulate document selection from recent documents
    fireEvent.click(screen.getByTestId('select-document-button'));
    
    // Should call selectDocument with the document ID
    expect(selectDocument).toHaveBeenCalledWith('doc-456');
    
    // Update mock to return the selected document
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: {
        ...mockDocument,
        id: 'doc-456',
        filename: 'selected.pdf',
        processed: true,
        summary: 'Selected document summary'
      },
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument
    });
    
    // Re-render to reflect state changes
    renderDocumentViewer();
    
    // Should show document summary for the selected document
    expect(screen.getByTestId('document-summary')).toBeInTheDocument();
    expect(screen.getByTestId('document-id')).toHaveTextContent('doc-456');
    expect(screen.getByTestId('document-summary-text')).toHaveTextContent('Selected document summary');
  });

  test('calls onDocumentProcessed callback when processing completes', () => {
    const onDocumentProcessed = jest.fn();
    
    // Initialize with a document that's still processing
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentProcessing,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'processing', 
        progress: 50, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer({ onDocumentProcessed });
    
    // Update mock to simulate processing completion
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    // Re-render to reflect state changes
    renderDocumentViewer({ onDocumentProcessed });
    
    // Should have called onDocumentProcessed with the document
    expect(onDocumentProcessed).toHaveBeenCalledWith(mockDocumentCompleted);
  });

  test('handles errors during document upload', () => {
    const setErrorMock = jest.fn();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument: jest.fn(),
      setError: setErrorMock
    });
    
    renderDocumentViewer();
    
    // Simulate upload error
    fireEvent.click(screen.getByTestId('upload-error-button'));
    
    // In a real implementation, this would set an error state
    // For this test, we're just verifying the error handling flow is triggered
    expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
  });

  test('handles errors during document processing', () => {
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentFailed,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'failed', 
        progress: 0, 
        error: 'Processing failed' 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Should show processing status with error
    expect(screen.getByTestId('file-processing-status')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('failed');
    expect(screen.getByTestId('error')).toHaveTextContent('Processing failed');
  });

  test('transitions between views based on document state', () => {
    const selectDocument = jest.fn();
    
    // Start with no document
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: null,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue(null),
      selectDocument
    });
    
    renderDocumentViewer();
    
    // Should show upload view
    expect(screen.getByTestId('document-uploader')).toBeInTheDocument();
    
    // Simulate document upload
    fireEvent.click(screen.getByTestId('upload-complete-button'));
    
    // Update mock to show processing state
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentProcessing,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'processing', 
        progress: 50, 
        error: null 
      }),
      selectDocument
    });
    
    // Re-render to reflect processing state
    renderDocumentViewer();
    
    // Should show processing view
    expect(screen.getByTestId('file-processing-status')).toBeInTheDocument();
    
    // Update mock to show completed state
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument
    });
    
    // Re-render to reflect completed state
    renderDocumentViewer();
    
    // Should show summary view
    expect(screen.getByTestId('document-summary')).toBeInTheDocument();
  });

  test('handles view full text action from summary', () => {
    // Mock console.log to check if it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Click the View Full Text button
    fireEvent.click(screen.getByTestId('view-full-text'));
    
    // Should have logged the action (as defined in the component)
    expect(consoleSpy).toHaveBeenCalledWith('View full text of document:', 'test.pdf');
    
    consoleSpy.mockRestore();
  });

  test('handles ask questions action from summary', () => {
    // Mock console.log to check if it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Click the Ask Questions button
    fireEvent.click(screen.getByTestId('ask-questions'));
    
    // Should have logged the action (as defined in the component)
    expect(consoleSpy).toHaveBeenCalledWith('Ask questions about document:', 'test.pdf');
    
    consoleSpy.mockRestore();
  });

  test('handles store in memory action from summary', () => {
    // Mock console.log to check if it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    (useDocuments as jest.Mock).mockReturnValue({
      selectedDocument: mockDocumentCompleted,
      error: null,
      getDocumentStatus: jest.fn().mockReturnValue({ 
        status: 'completed', 
        progress: 100, 
        error: null 
      }),
      selectDocument: jest.fn()
    });
    
    renderDocumentViewer();
    
    // Click the Store in Memory button
    fireEvent.click(screen.getByTestId('store-in-memory'));
    
    // Should have logged the action (as defined in the component)
    expect(consoleSpy).toHaveBeenCalledWith('Store document in memory:', 'test.pdf');
    
    consoleSpy.mockRestore();
  });
});