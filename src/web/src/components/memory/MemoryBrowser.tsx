import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import styled from 'styled-components'; // styled-components v5.3.10
import classNames from 'classnames'; // classnames v2.3.2
import { TrashIcon } from '@heroicons/react/24/outline'; // @heroicons/react v2.0.18

import MemorySearch from './MemorySearch';
import MemoryCategoryFilter from './MemoryCategoryFilter';
import MemoryItem from './MemoryItem';
import MemoryDetail from './MemoryDetail';
import Button from '../ui/Button';
import {
  MemoryItem as MemoryItemType,
  MemoryCategory,
  MemorySearchResult,
} from '../../types/memory';
import useMemory, { UseMemoryResult } from '../../hooks/useMemory';
import useMemoryStore from '../../store/memoryStore';
import useTheme from '../../hooks/useTheme';
import { SPACING, ButtonVariant } from '../../constants/uiConstants';

/**
 * Props interface for the MemoryBrowser component
 */
export interface MemoryBrowserProps {
  /** Optional CSS class name */
  className?: string;
  /** Initial category to load */
  initialCategory?: MemoryCategory | 'all';
  /** Callback function when a memory item is selected */
  onMemorySelect?: (memory: MemoryItemType) => void;
  /** Callback function when a memory item is deleted */
  onMemoryDelete?: (id: string) => void;
}

/**
 * Component that provides a comprehensive interface for browsing and managing memory items
 */
const MemoryBrowser: React.FC<MemoryBrowserProps> = ({
  className,
  initialCategory = 'all',
  onMemorySelect,
  onMemoryDelete,
}) => {
  // Destructure props to get className and other optional props
  // Get the current theme using useTheme hook
  const { theme } = useTheme();

  // Initialize memory operations from useMemory hook
  const {
    searchMemory,
    deleteMemory,
    batchDeleteMemories,
    getMemoryStats,
  } = useMemory();

  // Access memory store state using useMemoryStore
  const {
    memoryItems,
    searchResults,
    selectedMemoryId,
    isLoading,
    setSelectedMemoryId,
  } = useMemoryStore();

  // Initialize state for selected category using useState
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>(initialCategory);

  // Initialize state for selected memory items using useState
  const [selectedMemoryItems, setSelectedMemoryItems] = useState<Set<string>>(new Set());

  // Initialize state for confirmation dialog using useState
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Create a memoized handleCategoryChange function using useCallback
  const handleCategoryChange = useCallback((category: MemoryCategory | 'all') => {
    setSelectedCategory(category);
  }, []);

  // Create a memoized handleSearch function using useCallback
  const handleSearch = useCallback(async (params: MemorySearchResult) => {
    // Handle search results here
  }, []);

  // Create a memoized handleMemoryClick function using useCallback
  const handleMemoryClick = useCallback((id: string) => {
    setSelectedMemoryId(id);
    if (onMemorySelect && memoryItems[id]) {
      onMemorySelect(memoryItems[id]);
    }
  }, [memoryItems, onMemorySelect, setSelectedMemoryId]);

  // Create a memoized handleMemorySelect function using useCallback
  const handleMemorySelect = useCallback((id: string, selected: boolean) => {
    setSelectedMemoryItems((prevSelected) => {
      const newSelected = new Set(prevSelected);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  }, []);

  // Create a memoized handleMemoryEdit function using useCallback
  const handleMemoryEdit = useCallback((memory: MemoryItemType) => {
    // Handle memory edit here
  }, []);

  // Create a memoized handleMemoryDelete function using useCallback
  const handleMemoryDelete = useCallback((id: string) => {
    if (onMemoryDelete) {
      onMemoryDelete(id);
    }
  }, [onMemoryDelete]);

  // Create a memoized handleBatchDelete function using useCallback
  const handleBatchDelete = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  // Create a memoized handleSelectAll function using useCallback
  const handleSelectAll = useCallback(() => {
    if (searchResults) {
      const allIds = searchResults.results.map((item) => item.id);
      setSelectedMemoryItems(new Set(allIds));
    }
  }, [searchResults]);

  // Create a memoized handleClearSelection function using useCallback
  const handleClearSelection = useCallback(() => {
    setSelectedMemoryItems(new Set());
  }, []);

  // Set up effect to load memory statistics on mount
  useEffect(() => {
    getMemoryStats();
  }, [getMemoryStats]);

  // Set up effect to clear selection when search results change
  useEffect(() => {
    setSelectedMemoryItems(new Set());
  }, [searchResults]);

  // Render the BrowserContainer with appropriate styling
  return (
    <BrowserContainer className={classNames('memory-browser', className)} theme={theme}>
      {/* Render the sidebar with search and category filter components */}
      <Sidebar theme={theme}>
        <MemorySearch onSearch={handleSearch} selectedCategories={selectedCategory === 'all' ? undefined : [selectedCategory]} />
        <MemoryCategoryFilter selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
      </Sidebar>

      {/* Render the main content area with memory list and detail view */}
      <MainContent>
        <MemoryListContainer theme={theme}>
          <MemoryListHeader theme={theme}>
            <MemoryListTitle theme={theme}>Memory Items</MemoryListTitle>
            <MemoryListActions>
              <Button variant={ButtonVariant.OUTLINED} onClick={handleSelectAll}>Select All</Button>
              <Button variant={ButtonVariant.OUTLINED} onClick={handleClearSelection}>Clear</Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                disabled={selectedMemoryItems.size === 0}
                onClick={handleBatchDelete}
                ariaLabel="Delete selected memories"
                startIcon={<TrashIcon width={16} height={16} />}
              >
                Delete
              </Button>
            </MemoryListActions>
          </MemoryListHeader>
          <MemoryList theme={theme}>
            {/* Show loading state when data is being fetched */}
            {isLoading && (
              <LoadingContainer>
                <p>Loading memories...</p>
              </LoadingContainer>
            )}

            {/* Display memory items from search results or filtered by category */}
            {searchResults && searchResults.results.length > 0 ? (
              searchResults.results.map((memory) => (
                <MemoryItemWrapper key={memory.id} theme={theme}>
                  <MemoryItem
                    memory={memory}
                    isSelected={selectedMemoryItems.has(memory.id)}
                    onSelect={handleMemorySelect}
                    onClick={handleMemoryClick}
                  />
                </MemoryItemWrapper>
              ))
            ) : (
              <EmptyState theme={theme}>
                <h2>No Memories Found</h2>
                <p>There are no memories matching the current criteria.</p>
              </EmptyState>
            )}
          </MemoryList>
        </MemoryListContainer>

        {/* Show memory detail view for the selected memory */}
        <DetailContainer theme={theme}>
          <MemoryDetail
            memoryId={selectedMemoryId}
            onEdit={handleMemoryEdit}
            onDelete={handleMemoryDelete}
          />
        </DetailContainer>
      </MainContent>

      {/* Show confirmation dialog when deleting memories */}
      {showConfirmation && (
        <ConfirmationDialog>
          <DialogContent theme={theme}>
            <p>Are you sure you want to delete the selected memories?</p>
            <DialogActions>
              <Button variant={ButtonVariant.SECONDARY} onClick={() => setShowConfirmation(false)}>Cancel</Button>
              <Button
                variant={ButtonVariant.PRIMARY}
                onClick={async () => {
                  await batchDeleteMemories(Array.from(selectedMemoryItems));
                  setSelectedMemoryItems(new Set());
                  setShowConfirmation(false);
                }}
              >
                Delete
              </Button>
            </DialogActions>
          </DialogContent>
        </ConfirmationDialog>
      )}
    </BrowserContainer>
  );
};

// Main container for the memory browser
const BrowserContainer = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
  background-color: ${(props) => props.theme.colors.background.default};
  border-radius: ${(props) => props.theme.borderRadius.medium};
  border: 1px solid ${(props) => props.theme.colors.border.main};
`;

// Sidebar container for search and filters
const Sidebar = styled.div`
  width: 300px;
  border-right: 1px solid ${(props) => props.theme.colors.border.main};
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.background.paper};
  overflow-y: auto;
`;

// Main content area for memory list and detail view
const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

// Container for the list of memory items
const MemoryListContainer = styled.div`
  width: 350px;
  border-right: 1px solid ${(props) => props.theme.colors.border.main};
  display: flex;
  flex-direction: column;
  background-color: ${(props) => props.theme.colors.background.paper};
  overflow: hidden;
`;

// Header for the memory list with actions
const MemoryListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${SPACING.MD};
  border-bottom: 1px solid ${(props) => props.theme.colors.border.main};
`;

// Title for the memory list section
const MemoryListTitle = styled.h2`
  font-size: ${(props) => props.theme.typography.h6.fontSize};
  font-weight: ${(props) => props.theme.typography.h6.fontWeight};
  color: ${(props) => props.theme.colors.text.primary};
  margin: 0;
`;

// Container for memory list action buttons
const MemoryListActions = styled.div`
  display: flex;
  gap: ${SPACING.SM};
`;

// Scrollable container for memory items
const MemoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${SPACING.MD};
`;

// Wrapper for individual memory items
const MemoryItemWrapper = styled.div`
  margin-bottom: ${SPACING.MD};
`;

// Container for the memory detail view
const DetailContainer = styled.div`
  flex: 1;
  overflow: hidden;
  background-color: ${(props) => props.theme.colors.background.default};
`;

// Empty state when no memories are found
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: ${SPACING.LG};
  text-align: center;
  color: ${(props) => props.theme.colors.text.secondary};
`;

// Container for loading state
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
`;

// Dialog for confirming delete actions
const ConfirmationDialog = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

// Content container for confirmation dialog
const DialogContent = styled.div`
  background-color: ${(props) => props.theme.colors.background.paper};
  padding: ${SPACING.LG};
  border-radius: ${(props) => props.theme.borderRadius.medium};
  max-width: 400px;
  width: 100%;
`;

// Action buttons container for dialog
const DialogActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.LG};
`;

// Information about selected items
const SelectionInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.SM};
  font-size: ${(props) => props.theme.typography.body2.fontSize};
  color: ${(props) => props.theme.colors.text.secondary};
`;

export default MemoryBrowser;