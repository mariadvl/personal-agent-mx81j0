import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import { WebReaderState, WebReaderStatus } from '../../types/web';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../../constants/uiConstants';

// Interface for component props
interface WebContentProps {
  webReaderState: WebReaderState;
  className?: string;
}

// Styled components for content display
const ContentContainer = styled.div`
  padding: ${SPACING.MD};
  overflow-y: auto;
  font-family: ${props => props.theme.typography.fontFamily};
  color: ${props => props.theme.colors.text.primary};
`;

const ContentTitle = styled.h2`
  font-size: ${props => props.theme.typography.h3.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  margin-bottom: ${SPACING.MD};
  line-height: 1.4;
`;

const ContentBody = styled.div`
  font-size: ${props => props.theme.typography.body1.fontSize};
  line-height: 1.6;
  margin-bottom: ${SPACING.LG};
  
  p {
    margin-bottom: ${SPACING.MD};
  }
  
  a {
    color: ${props => props.theme.colors.primary.main};
    text-decoration: underline;
    
    &:hover {
      color: ${props => props.theme.colors.primary.dark};
    }
  }
  
  ul, ol {
    margin-left: ${SPACING.LG};
    margin-bottom: ${SPACING.MD};
  }
  
  img {
    max-width: 100%;
    height: auto;
    margin: ${SPACING.MD} 0;
    border-radius: ${BORDER_RADIUS.SMALL};
  }
  
  blockquote {
    border-left: 4px solid ${props => props.theme.colors.divider};
    padding-left: ${SPACING.MD};
    margin: ${SPACING.MD} 0;
    font-style: italic;
  }
  
  h1, h2, h3, h4, h5, h6 {
    margin-top: ${SPACING.LG};
    margin-bottom: ${SPACING.MD};
    font-weight: ${props => props.theme.typography.fontWeightMedium};
  }
`;

const MetadataSection = styled.div`
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
  background-color: ${props => props.theme.colors.background.default};
  padding: ${SPACING.MD};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  margin-bottom: ${SPACING.MD};
  
  div {
    margin-bottom: ${SPACING.XS};
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const LoadingContainer = styled.div`
  padding: ${SPACING.LG};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 200px;
  gap: ${SPACING.MD};
`;

const ErrorContainer = styled.div`
  padding: ${SPACING.LG};
  color: ${props => props.theme.colors.error.main};
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  
  h3 {
    margin-bottom: ${SPACING.MD};
    color: ${props => props.theme.colors.error.main};
  }
  
  p {
    max-width: 80%;
    margin: 0 auto;
  }
`;

/**
 * Component that displays extracted web content with formatting and loading states
 * 
 * @param props - Component props including webReaderState and optional className
 * @returns Rendered web content component
 */
const WebContent: React.FC<WebContentProps> = ({ 
  webReaderState, 
  className 
}) => {
  const { status, content, title, progress, error, metadata } = webReaderState;
  
  // Idle state
  if (status === WebReaderStatus.IDLE) {
    return (
      <Card className={classNames('web-content', 'idle', className)}>
        <LoadingContainer>
          <h3>Ready to extract web content</h3>
          <p>Enter a URL to begin extraction</p>
        </LoadingContainer>
      </Card>
    );
  }
  
  // Loading, extracting, processing, or summarizing states
  if (status === WebReaderStatus.LOADING || 
      status === WebReaderStatus.EXTRACTING || 
      status === WebReaderStatus.PROCESSING ||
      status === WebReaderStatus.SUMMARIZING) {
    
    // Determine appropriate loading message based on status
    let loadingMessage = 'Processing...';
    
    if (status === WebReaderStatus.LOADING) {
      loadingMessage = 'Loading page...';
    } else if (status === WebReaderStatus.EXTRACTING) {
      loadingMessage = 'Extracting content...';
    } else if (status === WebReaderStatus.PROCESSING) {
      loadingMessage = 'Processing content...';
    } else if (status === WebReaderStatus.SUMMARIZING) {
      loadingMessage = 'Generating summary...';
    }
    
    return (
      <Card className={classNames('web-content', status.toLowerCase(), className)}>
        <LoadingContainer>
          <h3>{loadingMessage}</h3>
          <ProgressBar 
            value={progress} 
            max={100} 
            showPercentage 
            aria-label="Content extraction progress"
          />
        </LoadingContainer>
      </Card>
    );
  }
  
  // Error state
  if (status === WebReaderStatus.ERROR) {
    return (
      <Card className={classNames('web-content', 'error', className)}>
        <ErrorContainer>
          <h3>Error extracting content</h3>
          <p>{error || 'An unknown error occurred while extracting the web content.'}</p>
        </ErrorContainer>
      </Card>
    );
  }
  
  // Complete state - show content
  return (
    <Card className={classNames('web-content', 'complete', className)}>
      <ContentContainer>
        <ContentTitle>{title}</ContentTitle>
        
        {metadata && (
          <MetadataSection>
            {metadata.source && <div>Source: {metadata.source}</div>}
            {metadata.publishDate && <div>Published: {metadata.publishDate}</div>}
            {metadata.author && <div>Author: {metadata.author}</div>}
            {metadata.wordCount > 0 && <div>Word count: {metadata.wordCount}</div>}
          </MetadataSection>
        )}
        
        <ContentBody 
          dangerouslySetInnerHTML={{ __html: content }} 
          aria-live="polite"
        />
      </ContentContainer>
    </Card>
  );
};

export default WebContent;