import React from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Document, AllowedFileType } from '../../types/document';
import { formatFileSize } from '../../utils/fileUtils';
import { formatDate } from '../../utils/dateUtils';
import { SPACING } from '../../constants/uiConstants';
import { ButtonVariant } from '../../types/ui';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the DocumentSummary component
 */
interface DocumentSummaryProps {
  /** Document object containing summary and metadata */
  document: Document;
  /** Callback function when View Full Text button is clicked */
  onViewFullText: () => void;
  /** Callback function when Ask Questions button is clicked */
  onAskQuestions: () => void;
  /** Callback function when Store in Memory button is clicked */
  onStoreInMemory: () => void;
}

// Styled components for the document summary
const SummaryContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

const SummaryTitle = styled.h3`
  font-size: ${props => props.theme.typography.h5.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  margin: 0;
  color: ${props => props.theme.colors.text.primary};
`;

const SummaryText = styled.div`
  font-size: ${props => props.theme.typography.body1.fontSize};
  line-height: 1.5;
  color: ${props => props.theme.colors.text.primary};
  white-space: pre-wrap;
`;

const MetadataContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${SPACING.SM};
  margin-bottom: ${SPACING.MD};
`;

const MetadataItem = styled.div`
  font-size: ${props => props.theme.typography.caption.fontSize};
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  
  &:not(:last-child)::after {
    content: '•';
    margin-left: ${SPACING.SM};
    margin-right: ${SPACING.SM};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.LG};
`;

const NoSummaryMessage = styled.div`
  font-size: ${props => props.theme.typography.body1.fontSize};
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;
  padding: ${SPACING.MD} 0;
`;

/**
 * Component for displaying a document summary with metadata and action buttons
 * Shows the AI-generated summary of the document along with file type, size, and creation date
 * Provides buttons for viewing full text, asking questions about the document, and storing in memory
 */
const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  document,
  onViewFullText,
  onAskQuestions,
  onStoreInMemory
}) => {
  const { theme } = useTheme();
  
  // Check if document exists
  if (!document) {
    return (
      <Card title="Document Summary">
        <NoSummaryMessage>No document selected.</NoSummaryMessage>
      </Card>
    );
  }
  
  // Extract relevant data from the document
  const { filename, file_type, summary, created_at, size_bytes, metadata } = document;
  
  // Format metadata for display
  const fileSize = size_bytes ? formatFileSize(size_bytes) : 
                  (metadata?.size ? formatFileSize(metadata.size) : 'Unknown size');
  
  // Format the date using a standard format string
  const creationDate = created_at ? formatDate(created_at, 'MMM d, yyyy') : 
                     (metadata?.created_at ? formatDate(metadata.created_at, 'MMM d, yyyy') : 'Unknown date');
  
  return (
    <Card title={`Document: ${filename || 'Untitled'}`}>
      <SummaryContainer>
        <MetadataContainer>
          {file_type && <MetadataItem>{file_type.toUpperCase()}</MetadataItem>}
          <MetadataItem>{fileSize}</MetadataItem>
          <MetadataItem>{creationDate}</MetadataItem>
        </MetadataContainer>
        
        <SummaryTitle>Summary:</SummaryTitle>
        {summary ? (
          <SummaryText>{summary}</SummaryText>
        ) : (
          <NoSummaryMessage>
            No summary available for this document yet.
          </NoSummaryMessage>
        )}
        
        <ActionButtons>
          <Button 
            variant={ButtonVariant.PRIMARY} 
            onClick={onViewFullText}
          >
            View Full Text
          </Button>
          <Button 
            variant={ButtonVariant.SECONDARY} 
            onClick={onAskQuestions}
          >
            Ask Questions
          </Button>
          <Button 
            variant={ButtonVariant.OUTLINED} 
            onClick={onStoreInMemory}
          >
            Store in Memory
          </Button>
        </ActionButtons>
      </SummaryContainer>
    </Card>
  );
};

export default DocumentSummary;