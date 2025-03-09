import React, { useState, useEffect, useCallback } from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { useSearchParams, useRouter } from 'next/navigation'; // next/navigation version ^14.0.0

import DocumentViewer from '../../components/files/DocumentViewer';
import useDocuments from '../../hooks/useDocuments';
import useSettingsStore from '../../store/settingsStore';
import { Document } from '../../types/document';

// Styled components
const PageContainer = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 8px;
`;

const PageDescription = styled.p`
  color: #666;
  font-size: 1rem;
`;

const DocumentViewerContainer = styled.div`
  margin-top: 24px;
  /* Responsive styling */
  @media (max-width: 768px) {
    margin-top: 16px;
  }
`;

/**
 * Defines metadata for the files page including title and description
 * @returns {object} Metadata object with title and description
 */
export const metadata = {
  title: 'Documents - Personal AI Agent',
  description: 'Upload and manage your documents',
};

/**
 * Main page component for document management
 * @returns {JSX.Element} Rendered files page with DocumentViewer component
 */
const FilesPage: React.FC = () => {
  // Get search parameters from URL using useSearchParams
  const searchParams = useSearchParams();

  // Extract documentId from search parameters if present
  const documentIdFromParams = searchParams.get('documentId');

  // Initialize state for the selected document ID
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(documentIdFromParams);

  // Access document processing settings from useSettingsStore
  const { settings } = useSettingsStore();

  // Initialize useDocuments hook with appropriate options
  const {
    selectDocument,
    documents,
  } = useDocuments({
    documentId: selectedDocumentId,
    autoLoad: true,
  });

  // Next Router
  const router = useRouter();

  /**
   * Handles document selection and updates URL parameters
   * @param {string} documentId
   * @returns {void} No return value
   */
  const handleDocumentSelection = useCallback((documentId: string) => {
    selectDocument(documentId);
    setSelectedDocumentId(documentId);

    // Update URL search parameters with the selected document ID
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('documentId', documentId);
    router.push(`/files?${newParams.toString()}`, { scroll: false });
  }, [selectDocument, searchParams, router]);

  /**
   * Handles completion of document processing
   * @param {Document} document
   * @returns {void} No return value
   */
  const handleDocumentProcessed = useCallback((document: Document) => {
    // Log successful document processing if needed
    console.log(`Document ${document.filename} processed successfully`);
    // Perform any additional actions needed after processing completes
    // Could trigger notifications or updates to other parts of the application
  }, []);

  // Set up effect to update selected document ID when URL parameters change
  useEffect(() => {
    const documentIdFromParams = searchParams.get('documentId');
    if (documentIdFromParams && documentIdFromParams !== selectedDocumentId) {
      setSelectedDocumentId(documentIdFromParams);
    }
  }, [searchParams, selectedDocumentId]);

  // Set up effect to update URL when selected document changes
  useEffect(() => {
    if (selectedDocumentId !== documentIdFromParams) {
      const newParams = new URLSearchParams(searchParams.toString());
      if (selectedDocumentId) {
        newParams.set('documentId', selectedDocumentId);
      } else {
        newParams.delete('documentId');
      }
      router.push(`/files?${newParams.toString()}`, { scroll: false });
    }
  }, [selectedDocumentId, searchParams, router, documentIdFromParams]);

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Documents</PageTitle>
        <PageDescription>Upload and manage your documents</PageDescription>
      </PageHeader>
      <DocumentViewerContainer>
        <DocumentViewer
          documentId={selectedDocumentId}
          onDocumentProcessed={handleDocumentProcessed}
          onDocumentSelected={handleDocumentSelection}
        />
      </DocumentViewerContainer>
    </PageContainer>
  );
};

export default FilesPage;