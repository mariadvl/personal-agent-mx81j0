import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { SearchIcon, XMarkIcon } from '@heroicons/react/24/outline';
import classNames from 'classnames';

import Input from '../ui/Input';
import Button from '../ui/Button';
import useMemoryStore from '../../store/memoryStore';
import { MemorySearchParams, MemoryCategory, MemorySearchResult } from '../../types/memory';
import useTheme from '../../hooks/useTheme';
import { SPACING } from '../../constants/uiConstants';
import useDebounce from '../../hooks/useDebounce';
import { ButtonVariant, InputType } from '../../types/ui';

/**
 * Props interface for the MemorySearch component
 */
export interface MemorySearchProps {
  /** Callback function when search results are retrieved */
  onSearch?: (results: MemorySearchResult) => void;
  /** Optional array of categories to filter search results */
  selectedCategories?: MemoryCategory[];
  /** Optional CSS class name */
  className?: string;
}

/**
 * A component that provides a search interface for memory items in the Personal AI Agent.
 * Allows users to search through their stored memories using text queries.
 */
const MemorySearch: React.FC<MemorySearchProps> = ({ 
  onSearch, 
  selectedCategories, 
  className 
}) => {
  const { theme } = useTheme();
  const { searchParams, setSearchParams, searchMemories, isLoading } = useMemoryStore();
  
  // Local state for the search query input
  const [query, setQuery] = useState('');
  
  // Debounce the search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 500);

  /**
   * Handle input changes in the search field
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  /**
   * Handle the search button click
   */
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    const params = buildSearchParams(query, selectedCategories);
    setSearchParams(params);
    
    try {
      const results = await searchMemories(params);
      if (onSearch) {
        onSearch(results);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    }
  };

  /**
   * Clear the search input and results
   */
  const handleClear = () => {
    setQuery('');
    setSearchParams({ ...searchParams, query: '' });
  };

  /**
   * Effect to perform search when debounced query changes
   */
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const params = buildSearchParams(debouncedQuery, selectedCategories);
      setSearchParams(params);
      searchMemories(params)
        .then(results => {
          if (onSearch) onSearch(results);
        })
        .catch(error => {
          console.error('Error searching memories:', error);
        });
    }
  }, [debouncedQuery, selectedCategories, setSearchParams, searchMemories, onSearch]);

  return (
    <SearchContainer className={className} theme={theme}>
      <SearchInput>
        <Input
          id="memory-search"
          type={InputType.TEXT}
          value={query}
          onChange={handleInputChange}
          placeholder="Search memories..."
          startIcon={
            <IconWrapper theme={theme}>
              <SearchIcon width={16} height={16} />
            </IconWrapper>
          }
        />
      </SearchInput>
      
      {query && (
        <Button
          variant={ButtonVariant.OUTLINED}
          onClick={handleClear}
          ariaLabel="Clear search"
          startIcon={<XMarkIcon width={16} height={16} />}
        >
          Clear
        </Button>
      )}
      
      <Button
        variant={ButtonVariant.PRIMARY}
        onClick={handleSearch}
        disabled={!query.trim() || isLoading}
        ariaLabel="Search memories"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </SearchContainer>
  );
};

/**
 * Builds search parameters from query and categories
 */
const buildSearchParams = (query: string, categories?: MemoryCategory[]): MemorySearchParams => {
  return {
    query,
    limit: 20,
    categories
  };
};

/**
 * Container for the search input and buttons
 */
const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.SM};
  width: 100%;
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${props => props.theme.borderRadius}px;
  border: 1px solid ${props => props.theme.colors.divider};
`;

/**
 * Styled wrapper for the search input
 */
const SearchInput = styled.div`
  flex: 1;
  position: relative;
`;

/**
 * Wrapper for search and clear icons
 */
const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: ${props => props.theme.colors.text.secondary};
`;

export default MemorySearch;