import React, { useCallback } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Checkbox from '../ui/Checkbox';
import { MemoryItem as MemoryItemType, MemoryCategory } from '../../types/memory';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { formatMemoryCategory, truncateText } from '../../utils/formatters';
import useTheme from '../../hooks/useTheme';
import { SPACING } from '../../constants/uiConstants';

/**
 * Props interface for the MemoryItem component
 */
export interface MemoryItemProps {
  /** The memory item to display */
  memory: MemoryItemType;
  /** Whether the memory item is selected (for batch operations) */
  isSelected?: boolean;
  /** Callback when the memory selection state changes */
  onSelect?: (id: string, selected: boolean) => void;
  /** Callback when the memory item is clicked */
  onClick?: (id: string) => void;
  /** Additional CSS class names */
  className?: string;
}

/**
 * Component that displays an individual memory item with selection capability
 * and shows a summary of memory content, category, and creation date.
 */
const MemoryItem: React.FC<MemoryItemProps> = ({
  memory,
  isSelected = false,
  onSelect,
  onClick,
  className
}) => {
  const { theme } = useTheme();
  const formattedDate = formatDateForDisplay(memory.created_at);
  const categoryDisplay = formatMemoryCategory(memory.category);
  const truncatedContent = truncateText(memory.content, 150);
  
  // Determine category color based on category type
  let categoryColor;
  switch (memory.category) {
    case 'conversation':
      categoryColor = theme.colors.primary.main;
      break;
    case 'document':
      categoryColor = theme.colors.info.main;
      break;
    case 'web':
      categoryColor = theme.colors.secondary.main;
      break;
    case 'important':
      categoryColor = theme.colors.warning.main;
      break;
    case 'user_defined':
      categoryColor = theme.colors.success.main;
      break;
    default:
      categoryColor = theme.colors.primary.main;
  }
  
  // Handler for checkbox selection that prevents event propagation
  const handleSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(memory.id, e.target.checked);
    }
  }, [memory.id, onSelect]);
  
  // Handler for clicking the memory item
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(memory.id);
    }
  }, [memory.id, onClick]);
  
  return (
    <ItemContainer isSelected={isSelected}>
      <Card 
        className={classNames('memory-item', className)}
        onClick={onClick ? handleClick : undefined}
      >
        {onSelect && (
          <SelectionCheckbox onClick={e => e.stopPropagation()}>
            <Checkbox 
              id={`select-memory-${memory.id}`}
              checked={isSelected}
              onChange={handleSelect}
            />
          </SelectionCheckbox>
        )}
        
        <MemoryContent>
          {truncatedContent}
        </MemoryContent>
        
        <MemoryFooter>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <CategoryBadge>
              <Badge content={categoryDisplay} color={categoryColor} />
            </CategoryBadge>
            
            {memory.importance >= 4 && (
              <ImportanceIndicator>
                <span role="img" aria-label="Important">⭐</span>
              </ImportanceIndicator>
            )}
          </div>
          
          <DateDisplay>
            {formattedDate}
          </DateDisplay>
        </MemoryFooter>
      </Card>
    </ItemContainer>
  );
};

// Container for the memory item with selection styling
const ItemContainer = styled.div<{ isSelected: boolean }>`
  position: relative;
  transition: all 0.2s ease-in-out;
  border: 2px solid ${props => props.isSelected ? props.theme.colors.primary.main : 'transparent'};
  border-radius: ${props => props.theme.shape.borderRadius}px;
  overflow: hidden;
`;

// Container for the selection checkbox
const SelectionCheckbox = styled.div`
  position: absolute;
  top: ${SPACING.SM};
  right: ${SPACING.SM};
  z-index: 1;
`;

// Container for the memory content
const MemoryContent = styled.div`
  margin-bottom: ${SPACING.SM};
  font-size: ${props => props.theme.typography.body1.fontSize};
  color: ${props => props.theme.colors.text.primary};
  line-height: 1.5;
  word-break: break-word;
`;

// Footer section for metadata display
const MemoryFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${SPACING.SM};
  font-size: ${props => props.theme.typography.caption.fontSize};
  color: ${props => props.theme.colors.text.secondary};
`;

// Styled badge for category display
const CategoryBadge = styled.div`
  display: inline-flex;
  align-items: center;
  margin-right: ${SPACING.SM};
`;

// Container for date display
const DateDisplay = styled.div`
  white-space: nowrap;
`;

// Indicator for important memories
const ImportanceIndicator = styled.div`
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.warning.main};
  font-size: ${props => props.theme.typography.caption.fontSize};
  margin-right: ${SPACING.SM};
`;

export default MemoryItem;