import React from 'react';
import styled from 'styled-components';
import { FaExternalLinkAlt, FaBookmark } from 'react-icons/fa';

import Card from '../ui/Card';
import Button from '../ui/Button';
import { SearchResultItem } from '../../types/search';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

interface SearchResultsProps {
  results: SearchResultItem[];
  isLoading: boolean;
  error: string;
  onResultClick: (result: SearchResultItem) => void;
  onSaveToMemory: (result: SearchResultItem) => void;
  summary?: string;
  className?: string;
}

const ResultsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  width: 100%;
`;

const ResultItem = styled.div`
  width: 100%;
  transition: transform 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const ResultTitle = styled.h3`
  margin: 0 0 ${SPACING.SM} 0;
  font-size: ${props => props.theme.typography.h6.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.primary.main};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const ResultSnippet = styled.p`
  margin: 0 0 ${SPACING.SM} 0;
  font-size: ${props => props.theme.typography.body1.fontSize};
  color: ${props => props.theme.colors.text.primary};
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const ResultMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${SPACING.SM};
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
`;

const ResultSource = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
`;

const ResultDate = styled.span`
  white-space: nowrap;
`;

const ResultActions = styled.div`
  display: flex;
  gap: ${SPACING.SM};
  margin-top: ${SPACING.SM};
  justify-content: flex-end;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.MD};
  min-height: 200px;
  width: 100%;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.MD};
  min-height: 200px;
  width: 100%;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  color: ${props => props.theme.colors.error.main};
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${SPACING.MD};
  min-height: 200px;
  width: 100%;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  color: ${props => props.theme.colors.text.secondary};
`;

const SummaryContainer = styled.div`
  padding: ${SPACING.MD};
  margin-bottom: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  border-left: 4px solid ${props => props.theme.colors.primary.main};
`;

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    return '';
  }
};

const truncateUrl = (url: string, maxLength: number = 30): string => {
  // Remove protocol
  let formattedUrl = url.replace(/^https?:\/\//, '');
  
  // Remove trailing slashes
  formattedUrl = formattedUrl.replace(/\/$/, '');
  
  if (formattedUrl.length > maxLength) {
    return formattedUrl.substring(0, maxLength) + '...';
  }
  
  return formattedUrl;
};

const SearchResults = ({
  results,
  isLoading,
  error,
  onResultClick,
  onSaveToMemory,
  summary,
  className
}: SearchResultsProps): JSX.Element => {
  const { theme } = useTheme();
  
  if (isLoading) {
    return (
      <LoadingContainer className={className}>
        <p>Searching the web...</p>
      </LoadingContainer>
    );
  }
  
  if (error) {
    return (
      <ErrorContainer className={className}>
        <p>{error}</p>
      </ErrorContainer>
    );
  }
  
  if (!results || results.length === 0) {
    return (
      <EmptyContainer className={className}>
        <p>No search results found</p>
      </EmptyContainer>
    );
  }
  
  return (
    <ResultsContainer className={className}>
      {summary && (
        <SummaryContainer>
          <p>{summary}</p>
        </SummaryContainer>
      )}
      
      {results.map((result, index) => (
        <ResultItem key={`${result.url}-${index}`}>
          <Card>
            <ResultTitle>{result.title}</ResultTitle>
            <ResultSnippet>{result.snippet}</ResultSnippet>
            <ResultMeta>
              <ResultSource>{truncateUrl(result.url)}</ResultSource>
              {result.published_date && (
                <ResultDate>{formatDate(result.published_date)}</ResultDate>
              )}
            </ResultMeta>
            <ResultActions>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FaExternalLinkAlt />}
                onClick={() => onResultClick(result)}
                ariaLabel={`Open ${result.title}`}
              >
                Open
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<FaBookmark />}
                onClick={() => onSaveToMemory(result)}
                ariaLabel={`Save ${result.title} to memory`}
              >
                Save to Memory
              </Button>
            </ResultActions>
          </Card>
        </ResultItem>
      ))}
    </ResultsContainer>
  );
};

export default SearchResults;