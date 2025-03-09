import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaSearch, FaHistory, FaCog } from 'react-icons/fa';

import Input from '../ui/Input';
import Button from '../ui/Button';
import SearchResults from './SearchResults';
import useSearch from '../../hooks/useSearch';
import { useSettingsStore } from '../../store/settingsStore';
import useTheme from '../../hooks/useTheme';
import { SPACING, BORDER_RADIUS } from '../../constants/uiConstants';
import { SearchProvider, SearchResultItem } from '../../types/search';

// Styled components for the search interface
const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: ${SPACING.MD};
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${BORDER_RADIUS.MEDIUM};
`;

const SearchInputContainer = styled.div`
  display: flex;
  width: 100%;
  gap: ${SPACING.MD};
  align-items: center;
`;

const SearchOptionsContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.MD};
`;

const SearchResultsContainer = styled.div`
  width: 100%;
  margin-top: ${SPACING.MD};
`;

const HistoryPanel = styled.div`
  width: 100%;
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.default};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  margin-bottom: ${SPACING.MD};
  max-height: 300px;
  overflow-y: auto;
`;

const HistoryItem = styled.div`
  padding: ${SPACING.MD};
  cursor: pointer;
  border-radius: ${BORDER_RADIUS.MEDIUM};
  margin-bottom: ${SPACING.MD};
  display: flex;
  justify-content: space-between;
  align-items: center;
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

const PrivacyIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.MD};
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: ${SPACING.MD};
  padding-top: ${SPACING.MD};
  border-top: 1px solid ${props => props.theme.colors.divider};
`;

// Interface definitions
interface SearchInterfaceProps {
  className?: string;
  onResultSelect?: (result: SearchResultItem) => void;
  onSaveToMemory?: (result: SearchResultItem) => void;
  initialQuery?: string;
}

interface SearchHistoryPanelProps {
  history: SearchHistoryItem[];
  onSelect: (query: string, provider: SearchProvider) => void;
  onClear: () => void;
  theme: any;
}

interface SearchControlsProps {
  provider: SearchProvider;
  onProviderChange: (provider: SearchProvider) => void;
  onHistoryToggle: () => void;
  theme: any;
}

// Main search interface component
const SearchInterface = ({
  className,
  onResultSelect,
  onSaveToMemory,
  initialQuery = ""
}: SearchInterfaceProps): JSX.Element => {
  // Initialize search hooks and settings
  const { state, search, getHistory, clearHistory, storeInMemory, isLoading, isError } = useSearch();
  const { settings } = useSettingsStore();
  const searchSettings = settings.search_settings;
  const { theme } = useTheme();
  
  // Local state
  const [query, setQuery] = useState(initialQuery);
  const [provider, setProvider] = useState<SearchProvider>(searchSettings.provider || 'duckduckgo');
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  
  // Load search history on component mount
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getHistory();
      setSearchHistory(history);
    };
    
    if (searchSettings.track_history) {
      loadHistory();
    }
  }, [getHistory, searchSettings.track_history]);
  
  // Execute initial search if initialQuery is provided
  useEffect(() => {
    if (initialQuery) {
      search(initialQuery, { provider });
    }
  }, []);
  
  // Execute search
  const handleSearch = useCallback(() => {
    if (query.trim()) {
      search(query, { provider });
      setShowHistory(false);
    }
  }, [query, provider, search]);
  
  // Handle Enter key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);
  
  // Handle result click
  const handleResultClick = useCallback((result: SearchResultItem) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    }
  }, [onResultSelect]);
  
  // Handle saving to memory
  const handleSaveToMemory = useCallback((result: SearchResultItem) => {
    if (onSaveToMemory) {
      onSaveToMemory(result);
    } else {
      storeInMemory({
        importance: 3,
        results: [result]
      });
    }
  }, [onSaveToMemory, storeInMemory]);
  
  // Clear search history
  const handleClearHistory = useCallback(async () => {
    await clearHistory();
    setSearchHistory([]);
  }, [clearHistory]);
  
  // Handle provider change
  const handleProviderChange = useCallback((newProvider: SearchProvider) => {
    setProvider(newProvider);
  }, []);
  
  // Handle history selection
  const handleHistorySelect = useCallback((historyQuery: string, historyProvider: SearchProvider) => {
    setQuery(historyQuery);
    setProvider(historyProvider);
    search(historyQuery, { provider: historyProvider });
    setShowHistory(false);
  }, [search]);
  
  // Toggle history visibility
  const toggleHistory = useCallback(() => {
    setShowHistory(prev => !prev);
  }, []);
  
  return (
    <SearchContainer className={className}>
      {/* Search history panel */}
      {showHistory && searchHistory.length > 0 && (
        <SearchHistoryPanel
          history={searchHistory}
          onSelect={handleHistorySelect}
          onClear={handleClearHistory}
          theme={theme}
        />
      )}
      
      {/* Search options */}
      <SearchOptionsContainer>
        <SearchControls
          provider={provider}
          onProviderChange={handleProviderChange}
          onHistoryToggle={toggleHistory}
          theme={theme}
        />
      </SearchOptionsContainer>
      
      {/* Search input */}
      <SearchInputContainer>
        <Input
          id="search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the web..."
          onKeyDown={handleKeyPress}
          startIcon={<FaSearch />}
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading}
          startIcon={<FaSearch />}
        >
          Search
        </Button>
      </SearchInputContainer>
      
      {/* Search results */}
      <SearchResultsContainer>
        <SearchResults
          results={state.results}
          isLoading={isLoading}
          error={state.error || ''}
          onResultClick={handleResultClick}
          onSaveToMemory={handleSaveToMemory}
          summary={state.summary || undefined}
        />
      </SearchResultsContainer>
      
      {/* Privacy indicator */}
      {state.results.length > 0 && (
        <PrivacyIndicator>
          <span>
            {state.provider === 'duckduckgo' 
              ? '🔒 Results provided by DuckDuckGo'
              : `⚠️ Results provided by external search service: ${state.provider}`}
          </span>
          {state.timestamp && (
            <span>Last updated: {new Date(state.timestamp).toLocaleTimeString()}</span>
          )}
        </PrivacyIndicator>
      )}
    </SearchContainer>
  );
};

// Search history panel component
const SearchHistoryPanel = ({
  history,
  onSelect,
  onClear,
  theme
}: SearchHistoryPanelProps): JSX.Element => {
  return (
    <HistoryPanel>
      <h3>Recent Searches</h3>
      {history.length === 0 ? (
        <div>No recent searches found</div>
      ) : (
        <>
          {history.map((item) => (
            <HistoryItem 
              key={item.id} 
              onClick={() => onSelect(item.query, item.provider)}
            >
              <span>{item.query}</span>
              <small>{new Date(item.timestamp).toLocaleString()}</small>
            </HistoryItem>
          ))}
          <Button 
            onClick={onClear} 
            variant="outlined" 
            size="small"
          >
            Clear History
          </Button>
        </>
      )}
    </HistoryPanel>
  );
};

// Search controls component
const SearchControls = ({
  provider,
  onProviderChange,
  onHistoryToggle,
  theme
}: SearchControlsProps): JSX.Element => {
  return (
    <div style={{ display: 'flex', gap: SPACING.MD, alignItems: 'center' }}>
      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value as SearchProvider)}
        style={{ 
          padding: SPACING.SM,
          borderRadius: BORDER_RADIUS.MEDIUM,
          border: `1px solid ${theme.colors.divider}`,
          backgroundColor: theme.colors.background.paper,
          color: theme.colors.text.primary
        }}
      >
        <option value="duckduckgo">DuckDuckGo</option>
        <option value="serpapi">SerpAPI</option>
        <option value="custom">Custom</option>
      </select>
      <Button
        onClick={onHistoryToggle}
        variant="text"
        startIcon={<FaHistory />}
        ariaLabel="Search History"
        size="small"
      >
        History
      </Button>
    </div>
  );
};

export default SearchInterface;