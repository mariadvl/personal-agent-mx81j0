import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Button from '../ui/Button';
import useDocuments from '../../hooks/useDocuments';
import { Document } from '../../types/document';
import { formatRelativeTime } from '../../utils/dateUtils';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the RecentDocuments component
 */
interface RecentDocumentsProps {
  /** Callback function when a document is selected */
  onSelectDocument: (documentId: string) => void;
  /** ID of the currently selected document */
  selectedDocumentId: string | null;
  /** Optional CSS class name for styling */
  className?: string;
  /** Maximum number of documents to display initially */
  maxDocuments?: number;
}

// Styled components
const DocumentsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  max-height: 300px;
  overflow-y: auto;
`;

const DocumentItem = styled.div<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: ${props => props.isSelected ? props.theme.colors.primary.light : props.theme.colors.background.default};
  
  &:hover {
    background-color: ${props => props.isSelected ? props.theme.colors.primary.light : props.theme.colors.action.hover};
  }
`;

const DocumentInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const DocumentName = styled.div`
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
`;

const DocumentDate = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const DocumentStatus = styled.div<{ processed: boolean }>`
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background-color: ${props => props.processed ? props.theme.colors.success.light : props.theme.colors.warning.light};
  color: ${props => props.processed ? props.theme.colors.success.dark : props.theme.colors.warning.dark};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
`;

const ViewAllContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
`;

/**
 * Component that displays a list of recently uploaded documents
 * 
 * This component shows the most recent documents uploaded to the system,
 * allowing users to view and select them for processing or viewing. Documents
 * are sorted by creation date with the most recent first, and displays their
 * processing status. The component supports selecting a document, showing
 * loading states, and viewing all documents beyond the initial display limit.
 */
const RecentDocuments: React.FC<RecentDocumentsProps> = ({
  onSelectDocument,
  selectedDocumentId,
  className,
  maxDocuments = 5
}) => {
  const { theme } = useTheme();
  const { 
    documents, 
    isLoading, 
    fetchDocuments 
  } = useDocuments({ autoLoad: true });
  
  const [displayCount, setDisplayCount] = useState(maxDocuments);
  
  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);
  
  // Handle document selection
  const handleSelectDocument = useCallback((documentId: string) => {
    if (onSelectDocument) {
      onSelectDocument(documentId);
    }
  }, [onSelectDocument]);
  
  // Get the most recent documents
  const recentDocuments = documents
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, displayCount);
  
  // Handle view all button click
  const handleViewAll = useCallback(() => {
    setDisplayCount(documents.length);
  }, [documents.length]);
  
  return (
    <Card 
      title="Recent Documents" 
      className={className}
      aria-label="Recent Documents"
    >
      {isLoading ? (
        <LoadingContainer aria-live="polite" aria-busy="true">
          <span>Loading documents...</span>
        </LoadingContainer>
      ) : documents.length === 0 ? (
        <EmptyState aria-live="polite">
          No documents available. Upload a document to get started.
        </EmptyState>
      ) : (
        <>
          <DocumentsList role="list" aria-label="Recent documents list">
            {recentDocuments.map((document) => (
              <DocumentItem 
                key={document.id}
                isSelected={document.id === selectedDocumentId}
                onClick={() => handleSelectDocument(document.id)}
                role="listitem"
                aria-selected={document.id === selectedDocumentId}
              >
                <DocumentInfo>
                  <DocumentName title={document.filename}>{document.filename}</DocumentName>
                  <DocumentDate>{formatRelativeTime(document.created_at)}</DocumentDate>
                </DocumentInfo>
                <DocumentStatus 
                  processed={document.processed}
                  aria-label={document.processed ? "Processed" : "Pending processing"}
                >
                  {document.processed ? 'Processed' : 'Pending'}
                </DocumentStatus>
              </DocumentItem>
            ))}
          </DocumentsList>
          
          {documents.length > maxDocuments && displayCount < documents.length && (
            <ViewAllContainer>
              <Button 
                variant="text" 
                size="small" 
                onClick={handleViewAll}
                aria-label="View all documents"
              >
                View All
              </Button>
            </ViewAllContainer>
          )}
        </>
      )}
    </Card>
  );
};

export default RecentDocuments;