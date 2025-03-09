import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import useMemory from '../../hooks/useMemory';
import Card from '../ui/Card';
import { SPACING, FONT_SIZE } from '../../constants/uiConstants';
import { MemoryItem } from '../../types/memory';

/**
 * List container for memory highlights
 */
const HighlightsList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

/**
 * Individual memory highlight item with hover effect
 */
const HighlightItem = styled.li`
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  padding: ${SPACING.MD};
  border-radius: 4px;
  transition: background-color 0.2s;
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

/**
 * Bullet point for list items
 */
const Bullet = styled.span`
  display: inline-block;
  margin-right: ${SPACING.MD};
  color: ${props => props.theme.colors.primary.main};
`;

/**
 * Container for memory content
 */
const HighlightContent = styled.div`
  flex: 1;
`;

/**
 * Text content of the memory item
 */
const MemoryText = styled.p`
  margin: 0 0 4px 0;
  color: ${props => props.theme.colors.text.primary};
`;

/**
 * Source information for the memory item
 */
const MemorySource = styled.span`
  font-size: ${FONT_SIZE.SM};
  color: ${props => props.theme.colors.text.secondary};
`;

/**
 * Empty state message when no memories are found
 */
const EmptyState = styled.div`
  padding: ${SPACING.MD};
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};
`;

/**
 * Link to view all memories
 */
const ViewAllLink = styled.span`
  color: ${props => props.theme.colors.primary.main};
  cursor: pointer;
  font-size: ${FONT_SIZE.SM};
  &:hover {
    text-decoration: underline;
  }
`;

/**
 * Component that displays important memory items on the dashboard
 * 
 * This component shows a curated list of high-priority memories extracted from
 * conversations, documents, and web content to provide users with quick access
 * to important information.
 */
const MemoryHighlights = (): JSX.Element => {
  // Set up navigation for routing
  const navigate = useNavigate();
  
  // Get memory-related functionality from the useMemory hook
  const { searchMemory, searchResults, isLoading, selectMemory } = useMemory();
  
  // State for controlling how many items to display
  const [maxItems, setMaxItems] = useState(5);
  
  // Fetch important memory items when component mounts
  useEffect(() => {
    searchMemory({
      query: '',
      limit: 10,
      categories: ['important'],
      filters: { importance: { $gte: 4 } } // Filter for high-importance items
    });
  }, [searchMemory]);
  
  // Handle clicking on a memory item
  const handleMemoryClick = (id: string) => {
    selectMemory(id);
    navigate('/memory'); // Navigate to memory detail view
  };
  
  // Extract memory items from search results
  const memoryItems = searchResults?.results || [];
  
  // Render the component
  return (
    <Card 
      title="Memory Highlights" 
      footer={
        <ViewAllLink onClick={() => navigate('/memory')}>
          View All
        </ViewAllLink>
      }
    >
      {isLoading ? (
        <EmptyState>Loading important memories...</EmptyState>
      ) : memoryItems.length === 0 ? (
        <EmptyState>No important memories found</EmptyState>
      ) : (
        <HighlightsList>
          {memoryItems.slice(0, maxItems).map((memory) => (
            <HighlightItem 
              key={memory.id}
              onClick={() => handleMemoryClick(memory.id)}
            >
              <Bullet>•</Bullet>
              <HighlightContent>
                <MemoryText>
                  {memory.content.length > 100 
                    ? `${memory.content.substring(0, 100)}...` 
                    : memory.content}
                </MemoryText>
                <MemorySource>
                  {memory.source_type 
                    ? `From ${memory.source_type}${memory.source_id ? `: ${memory.source_id}` : ''}`
                    : `${memory.category.charAt(0).toUpperCase() + memory.category.slice(1)}`}
                </MemorySource>
              </HighlightContent>
            </HighlightItem>
          ))}
        </HighlightsList>
      )}
    </Card>
  );
};

export default MemoryHighlights;