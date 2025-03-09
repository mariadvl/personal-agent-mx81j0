import React from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { useNavigate } from 'react-router-dom'; // react-router-dom version ^6.10.0
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Tooltip from '../ui/Tooltip';
import { RelatedMemory, MemoryItem, MemoryCategory } from '../../types/memory';
import useMemory from '../../hooks/useMemory';
import { formatDate } from '../../utils/dateUtils';
import { truncateText } from '../../utils/formatters';

/**
 * Interface defining the props for the RelatedMemory component.
 */
interface RelatedMemoryProps {
  relatedMemory: RelatedMemory;
  className?: string;
}

/**
 * Renders a component displaying a related memory item with its category, content preview, and source information
 * @param {RelatedMemoryProps} props - The props object containing related memory data and optional class names
 * @returns {JSX.Element} Rendered related memory component
 */
const RelatedMemoryComponent: React.FC<RelatedMemoryProps> = ({ relatedMemory, className }) => {
  // LD1: Destructure props to get relatedMemory and className
  const { memory, similarity_score } = relatedMemory;

  // LD1: Get navigate function from useNavigate hook
  const navigate = useNavigate();

  // LD1: Get memory operations from useMemory hook
  const { selectMemory } = useMemory();

  // LD1: Set up state for expanded view toggle
  const [isExpanded, setIsExpanded] = React.useState(false);

  // LD1: Format the memory creation date using formatDate utility
  const formattedDate = formatDate(memory.created_at, 'MMM d, yyyy');

  // LD1: Truncate memory content for preview display
  const truncatedContent = truncateText(memory.content, 150);

  // LD1: Determine appropriate icon and color based on memory category
  let categoryIcon: string;
  let categoryColor: string;

  switch (memory.category) {
    case 'conversation':
      categoryIcon = '💬';
      categoryColor = '#6C5CE7'; // LD1: Purple
      break;
    case 'document':
      categoryIcon = '📄';
      categoryColor = '#00B894'; // LD1: Teal
      break;
    case 'web':
      categoryIcon = '🌐';
      categoryColor = '#FDCB6E'; // LD1: Amber
      break;
    case 'important':
      categoryIcon = '⭐';
      categoryColor = '#FF6B6B'; // LD1: Red
      break;
    default:
      categoryIcon = '💡';
      categoryColor = '#74B9FF'; // LD1: Blue
  }

  // LD1: Extract source information from metadata if available
  const source = memory.metadata?.source || 'Unknown Source';

  // LD1: Handle click to navigate to memory details page
  const handleClick = () => {
    selectMemory(memory.id);
    navigate(`/memory/${memory.id}`);
  };

  // LD1: Render a Card component with memory information
  return (
    <MemoryCard className={className} onClick={handleClick}>
      <MemoryHeader>
        {/* LD1: Display category badge with appropriate icon and color */}
        <CategoryBadge color={categoryColor}>
          {categoryIcon} {memory.category}
        </CategoryBadge>
        {/* LD1: Add tooltip showing similarity score for transparency */}
        <Tooltip content={`Similarity Score: ${similarity_score.toFixed(2)}`}>
          <SimilarityScore>
            {similarity_score.toFixed(2)}
          </SimilarityScore>
        </Tooltip>
      </MemoryHeader>
      {/* LD1: Show truncated content with option to expand */}
      <MemoryContent>
        {truncatedContent}
        {memory.content.length > 150 && (
          <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'Show Less' : 'Show More'}
          </ExpandButton>
        )}
      </MemoryContent>
      {/* LD1: Include source information and creation date */}
      <MemoryFooter>
        <SourceInfo>
          Source: {source}
        </SourceInfo>
        <div>Created: {formattedDate}</div>
      </MemoryFooter>
    </MemoryCard>
  );
};

// LD1: Styled card container for the related memory
const MemoryCard = styled(Card)`
  margin-top: 8px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${props => props.theme.colors.background.secondary};
  border: 1px solid ${props => props.theme.colors.border.light};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.theme.colors.background.hover};
  }
`;

// LD1: Header section of the memory card
const MemoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

// LD1: Badge showing the memory category
const CategoryBadge = styled(Badge)`
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

// LD1: Container for the memory content
const MemoryContent = styled.div`
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 8px;
  white-space: pre-wrap;
  word-break: break-word;
`;

// LD1: Footer section with metadata
const MemoryFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: ${props => props.theme.colors.text.tertiary};
`;

// LD1: Container for source information
const SourceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// LD1: Button to expand/collapse memory content
const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary.main};
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  margin-top: 4px;
  text-decoration: underline;
`;

// LD1: Display for similarity score
const SimilarityScore = styled.span`
  font-size: 11px;
  color: ${props => props.theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: 2px;
`;

// IE3: Export the RelatedMemory component as default
export default RelatedMemoryComponent;