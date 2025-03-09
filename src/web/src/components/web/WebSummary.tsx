import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { WebReaderState, WebReaderStatus } from '../../types/web';
import { ButtonVariant } from '../../types/ui';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../../constants/uiConstants';
import { formatDate } from '../../utils/dateUtils';
import useTheme from '../../hooks/useTheme';

// Props interface for the WebSummary component
interface WebSummaryProps {
  webReaderState: WebReaderState;
  onStoreInMemory: () => void;
  onAskQuestions: () => void;
  onViewFullText: () => void;
  className?: string;
}

// Styled components
const SummaryContainer = styled.div`
  padding: ${SPACING.MD};
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

const SummaryTitle = styled.h2`
  font-size: ${props => props.theme.typography.h4.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  margin: 0 0 ${SPACING.SM} 0;
  color: ${props => props.theme.colors.text.primary};
  word-break: break-word;
`;

const SummaryText = styled.div`
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
  
  p {
    margin-bottom: ${SPACING.SM};
    line-height: ${props => props.theme.typography.body1.lineHeight};
  }
`;

const KeyPoints = styled.ul`
  padding-left: ${SPACING.LG};
  margin: ${SPACING.SM} 0;
`;

const KeyPoint = styled.li`
  margin-bottom: ${SPACING.XS};
  color: ${props => props.theme.colors.text.primary};
`;

const MetadataSection = styled.div`
  background-color: ${props => props.theme.colors.background.default};
  border-radius: ${BORDER_RADIUS.SMALL};
  padding: ${SPACING.SM};
  margin-top: ${SPACING.MD};
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
  display: flex;
  flex-wrap: wrap;
  gap: ${SPACING.SM} ${SPACING.MD};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${SPACING.SM};
  margin-top: ${SPACING.MD};
  flex-wrap: wrap;
`;

const SourceLink = styled.a`
  color: ${props => props.theme.colors.primary.main};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const PrivacyNote = styled.div`
  font-size: ${FONT_SIZE.XS};
  margin-top: ${SPACING.SM};
  color: ${props => props.theme.colors.privacy.external};
  font-style: italic;
`;

/**
 * Component that displays a summary of extracted web content with key points and metadata.
 * It provides action buttons for storing content in memory, asking questions about the content,
 * and viewing the full text.
 */
const WebSummary = ({
  webReaderState,
  onStoreInMemory,
  onAskQuestions,
  onViewFullText,
  className
}: WebSummaryProps): JSX.Element => {
  const { theme } = useTheme();
  const { summary, title, metadata, url, showExternalServiceWarning } = webReaderState;
  
  // Format publication date if available
  const formattedDate = metadata?.publishDate 
    ? formatDate(metadata.publishDate, 'MMMM d, yyyy')
    : '';
  
  // Extract key points if they're marked with bullets in the summary
  const keyPoints = summary
    .split('\n')
    .filter(line => /^(\- |\• |\* )/.test(line.trim()))
    .map(line => line.replace(/^(\- |\• |\* )/, '').trim());
  
  // Get regular paragraphs (excluding key points)
  const paragraphs = summary
    .split('\n')
    .filter(line => !/^(\- |\• |\* )/.test(line.trim()) && line.trim().length > 0);
  
  return (
    <Card className={classNames('web-summary', className)}>
      <SummaryContainer>
        <div>
          <SummaryTitle>{title || 'Web Content'}</SummaryTitle>
          
          <SummaryText>
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </SummaryText>
          
          {keyPoints.length > 0 && (
            <>
              <strong>Key Points:</strong>
              <KeyPoints>
                {keyPoints.map((point, index) => (
                  <KeyPoint key={index}>{point}</KeyPoint>
                ))}
              </KeyPoints>
            </>
          )}
          
          {metadata && (
            <MetadataSection aria-label="Web page metadata">
              {metadata.source && (
                <div>
                  <strong>Source:</strong>{' '}
                  <SourceLink href={url} target="_blank" rel="noopener noreferrer">
                    {metadata.source}
                  </SourceLink>
                </div>
              )}
              
              {formattedDate && (
                <div>
                  <strong>Published:</strong> {formattedDate}
                </div>
              )}
              
              {metadata.wordCount > 0 && (
                <div>
                  <strong>Words:</strong> {metadata.wordCount.toLocaleString()}
                </div>
              )}
              
              {metadata.author && (
                <div>
                  <strong>Author:</strong> {metadata.author}
                </div>
              )}
            </MetadataSection>
          )}
        </div>
        
        {showExternalServiceWarning && (
          <PrivacyNote>
            Note: External service was used to extract this content
          </PrivacyNote>
        )}
        
        <ActionButtons>
          <Button 
            onClick={onStoreInMemory} 
            variant={ButtonVariant.PRIMARY}
            aria-label="Store web content in memory"
          >
            Store in Memory
          </Button>
          
          <Button 
            onClick={onAskQuestions} 
            variant={ButtonVariant.SECONDARY}
            aria-label="Ask questions about this content"
          >
            Ask Questions
          </Button>
          
          <Button 
            onClick={onViewFullText} 
            variant={ButtonVariant.OUTLINED}
            aria-label="View full text content"
          >
            View Full Text
          </Button>
        </ActionButtons>
      </SummaryContainer>
    </Card>
  );
};

export default WebSummary;