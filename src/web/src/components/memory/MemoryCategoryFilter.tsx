import React from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import RadioGroup from '../ui/RadioGroup';
import { MemoryCategory, MEMORY_CATEGORIES } from '../../types/memory';
import useTheme from '../../hooks/useTheme';
import { SPACING } from '../../constants/uiConstants';

// Container for the category filter component
const FilterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: ${props => props.theme.shape.borderRadius}px;
  border: 1px solid ${props => props.theme.colors.divider};
`;

// Title for the category filter section
const FilterTitle = styled.h3`
  font-size: ${props => props.theme.typography.h6.fontSize};
  font-weight: ${props => props.theme.typography.h6.fontWeight};
  color: ${props => props.theme.colors.text.primary};
  margin: 0 0 ${SPACING.SM} 0;
`;

// Props interface for the MemoryCategoryFilter component
export interface MemoryCategoryFilterProps {
  selectedCategory: MemoryCategory | 'all';
  onCategoryChange: (category: MemoryCategory | 'all') => void;
  className?: string;
}

/**
 * Formats category values into human-readable labels
 * 
 * @param category The category string to format
 * @returns Formatted category label with proper capitalization
 */
const formatCategoryLabel = (category: string): string => {
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
};

/**
 * Transforms memory categories into radio options format
 * 
 * @returns Array of radio options for the RadioGroup component
 */
const getCategoryOptions = () => {
  // Create an "all" option first
  const allOption = {
    value: 'all',
    label: 'All'
  };
  
  // Map memory categories to RadioOption format with proper labels
  const categoryOptions = MEMORY_CATEGORIES.map(category => ({
    value: category,
    label: formatCategoryLabel(category)
  }));
  
  // Return the combined array of options
  return [allOption, ...categoryOptions];
};

/**
 * Component that renders a filter interface for memory categories
 * 
 * Allows users to filter memory items by category (conversation, document, web, etc.)
 * or view all categories at once
 */
const MemoryCategoryFilter: React.FC<MemoryCategoryFilterProps> = ({
  selectedCategory,
  onCategoryChange,
  className
}) => {
  const { theme } = useTheme();
  
  // Transform MEMORY_CATEGORIES into RadioOption format
  const options = getCategoryOptions();
  
  // Create a handler function for category selection changes
  const handleCategoryChange = (value: string) => {
    onCategoryChange(value as MemoryCategory | 'all');
  };
  
  return (
    <FilterContainer className={classNames('memory-category-filter', className)}>
      <FilterTitle>Categories</FilterTitle>
      <RadioGroup
        name="memory-category"
        options={options}
        value={selectedCategory}
        onChange={handleCategoryChange}
        className="memory-category-options"
      />
    </FilterContainer>
  );
};

export default MemoryCategoryFilter;