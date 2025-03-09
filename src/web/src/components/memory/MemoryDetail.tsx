import React, { useState, useEffect, useCallback } from 'react'; // React v18.2.0
import styled from 'styled-components'; // styled-components v5.3.10
import classNames from 'classnames'; // classnames v2.3.2

import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  MemoryItem,
  RelatedMemory
} from '../../types/memory';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { formatMemoryCategory } from '../../utils/formatters';
import { useMemory } from '../../hooks/useMemory';
import useMemoryStore from '../../store/memoryStore';
import { SPACING, ButtonVariant } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

/**
 * Props interface for the MemoryDetail component
 */
export interface MemoryDetailProps {
  /** Optional memory ID to load initially. If not provided, uses selectedMemoryId from store */
  memoryId?: string | undefined;
  /** Callback function when the memory item is edited */
  onEdit?: (memory: MemoryItem) => void;
  /** Callback function when the memory item is deleted */
  onDelete?: (id: string) => void;
  /** Optional CSS class names */
  className?: string | undefined;
}

/**
 * Component that displays detailed information about a selected memory item
 */
const MemoryDetail: React.FC<MemoryDetailProps> = ({
  memoryId,
  onEdit,
  onDelete,
  className
}) => {
  // Destructure props to get memoryId, onEdit, onDelete, className
  // Get the current theme using useTheme hook
  const { theme } = useTheme();

  // Access memory store state using useMemoryStore
  const {
    memoryItems,
    selectedMemoryId,
    relatedMemories,
    isLoading,
    setSelectedMemoryId
  } = useMemoryStore();

  // Initialize memory operations from useMemory hook
  const {
    updateMemory: updateMemoryFn,
    deleteMemory: deleteMemoryFn,
    markAsImportant,
    getRelatedMemories
  } = useMemory();

  // Initialize state for edit mode using useState
  const [editMode, setEditMode] = useState(false);

  // Initialize state for edited content using useState
  const [editedContent, setEditedContent] = useState('');

  // Initialize state for confirmation dialog using useState
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Create a memoized handleEdit function using useCallback
  const handleEdit = useCallback(() => {
    if (selectedMemoryId) {
      const selectedMemory = memoryItems[selectedMemoryId];
      if (selectedMemory) {
        setEditedContent(selectedMemory.content);
        setEditMode(true);
      }
    }
  }, [memoryItems, selectedMemoryId]);

  // Create a memoized handleSave function using useCallback
  const handleSave = useCallback(async () => {
    if (selectedMemoryId) {
      try {
        const updatedMemory = await updateMemoryFn(selectedMemoryId, { content: editedContent });
        if (updatedMemory && onEdit) {
          onEdit(updatedMemory);
        }
        setEditMode(false);
      } catch (error) {
        console.error("Failed to update memory:", error);
        // Handle error appropriately (e.g., display an error message)
      }
    }
  }, [editedContent, selectedMemoryId, updateMemoryFn, onEdit]);

  // Create a memoized handleCancel function using useCallback
  const handleCancel = useCallback(() => {
    setEditMode(false);
  }, []);

  // Create a memoized handleDelete function using useCallback
  const handleDelete = useCallback(() => {
    setShowConfirmation(true);
  }, []);

  // Create a memoized handleConfirmDelete function using useCallback
  const handleConfirmDelete = useCallback(async () => {
    if (selectedMemoryId && deleteMemoryFn && onDelete) {
      try {
        await deleteMemoryFn(selectedMemoryId);
        onDelete(selectedMemoryId);
        setShowConfirmation(false);
        setSelectedMemoryId(null);
      } catch (error) {
        console.error("Failed to delete memory:", error);
        // Handle error appropriately (e.g., display an error message)
      }
    }
  }, [deleteMemoryFn, onDelete, selectedMemoryId, setSelectedMemoryId]);

  // Create a memoized handleCancelDelete function using useCallback
  const handleCancelDelete = useCallback(() => {
    setShowConfirmation(false);
  }, []);

  // Create a memoized handleMarkImportant function using useCallback
  const handleMarkImportant = useCallback(async (important: boolean) => {
    if (selectedMemoryId && markAsImportant) {
      try {
        await markAsImportant(selectedMemoryId, important);
      } catch (error) {
        console.error("Failed to mark as important:", error);
        // Handle error appropriately (e.g., display an error message)
      }
    }
  }, [markAsImportant, selectedMemoryId]);

  // Create a memoized handleRelatedMemoryClick function using useCallback
  const handleRelatedMemoryClick = useCallback((relatedMemoryId: string) => {
    setSelectedMemoryId(relatedMemoryId);
  }, [setSelectedMemoryId]);

  // Set up effect to fetch related memories when memory changes
  useEffect(() => {
    if (selectedMemoryId) {
      getRelatedMemories(selectedMemoryId).catch(error => {
        console.error("Failed to fetch related memories:", error);
      });
    }
  }, [selectedMemoryId, getRelatedMemories]);

  // Get the selected memory from memoryItems using selectedMemoryId or memoryId prop
  const selectedMemory = memoryId ? memoryItems[memoryId] : (selectedMemoryId ? memoryItems[selectedMemoryId] : null);

  // Format memory creation date using formatDateForDisplay
  const formattedDate = selectedMemory ? formatDateForDisplay(selectedMemory.created_at) : '';

  // Format memory category using formatMemoryCategory
  const formattedCategory = selectedMemory ? formatMemoryCategory(selectedMemory.category) : '';

  // Render a Card component with memory details
  return (
    <DetailContainer className={classNames('memory-detail', className)}>
      {/* Show empty state if no memory is selected */}
      {!selectedMemory && !isLoading && (
        <EmptyState>
          <h2>No Memory Selected</h2>
          <p>Please select a memory to view details.</p>
        </EmptyState>
      )}

      {/* Show loading state if data is being fetched */}
      {isLoading && (
        <LoadingContainer>
          <p>Loading memory details...</p>
        </LoadingContainer>
      )}

      {/* Display memory content, category badge, and creation date */}
      {selectedMemory && (
        <Card>
          <DetailContent>
            <MemoryHeader>
              <div>
                {formattedCategory && <Badge content={formattedCategory} />}
                {formattedDate && <p>{formattedDate}</p>}
              </div>
            </MemoryHeader>

            {/* Show source information if available */}
            {selectedMemory.source_type && selectedMemory.source_id && (
              <MemoryMetadata>
                <p>Source: {selectedMemory.source_type} - {selectedMemory.source_id}</p>
              </MemoryMetadata>
            )}

            {/* Display metadata in a formatted way if present */}
            {selectedMemory.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
              <MemoryMetadata>
                {Object.entries(selectedMemory.metadata).map(([key, value]) => (
                  <p key={key}>
                    {key}: {String(value)}
                  </p>
                ))}
              </MemoryMetadata>
            )}

            {/* Show edit form when in edit mode */}
            {editMode ? (
              <EditForm>
                <TextArea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="Edit memory content..."
                />
                <ActionButtons>
                  <Button variant={ButtonVariant.SECONDARY} onClick={handleCancel}>Cancel</Button>
                  <Button variant={ButtonVariant.PRIMARY} onClick={handleSave}>Save</Button>
                </ActionButtons>
              </EditForm>
            ) : (
              <MemoryContent>{selectedMemory.content}</MemoryContent>
            )}

            {/* Show related memories section if available */}
            {relatedMemories && relatedMemories[selectedMemory.id] && relatedMemories[selectedMemory.id].length > 0 && (
              <RelatedMemories>
                <h3>Related Memories</h3>
                {relatedMemories[selectedMemory.id].map((relatedMemory) => (
                  <RelatedMemoryItem key={relatedMemory.memory_id} onClick={() => handleRelatedMemoryClick(relatedMemory.memory_id)}>
                    {relatedMemory.memory.content} (Similarity: {relatedMemory.similarity_score.toFixed(2)})
                  </RelatedMemoryItem>
                ))}
              </RelatedMemories>
            )}

            {/* Provide action buttons for edit, delete, and mark as important */}
            {!editMode && (
              <ActionButtons>
                <Button variant={ButtonVariant.OUTLINED} onClick={handleEdit}>Edit</Button>
                <Button variant={ButtonVariant.OUTLINED} onClick={handleDelete}>Delete</Button>
              </ActionButtons>
            )}
          </DetailContent>
        </Card>
      )}

      {/* Show confirmation dialog when deleting */}
      {showConfirmation && (
        <ConfirmationDialog>
          <DialogContent>
            <p>Are you sure you want to delete this memory?</p>
            <ActionButtons>
              <Button variant={ButtonVariant.SECONDARY} onClick={handleCancelDelete}>Cancel</Button>
              <Button variant={ButtonVariant.PRIMARY} onClick={handleConfirmDelete}>Delete</Button>
            </ActionButtons>
          </DialogContent>
        </ConfirmationDialog>
      )}
    </DetailContainer>
  );
};

// Main container for the memory detail view
const DetailContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

// Content container for memory details
const DetailContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${SPACING.MD};
`;

// Header section for memory details
const MemoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${SPACING.MD};
`;

// Container for memory metadata
const MemoryMetadata = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
  margin-bottom: ${SPACING.MD};
  font-size: ${props => props.theme.typography.body2.fontSize};
  color: ${props => props.theme.colors.text.secondary};
`;

// Container for memory content
const MemoryContent = styled.div`
  margin-bottom: ${SPACING.LG};
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
`;

// Form for editing memory content
const EditForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

// Textarea for editing memory content
const TextArea = styled.textarea`
  width: 100%;
  min-height: 200px;
  padding: ${SPACING.MD};
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: ${props => props.theme.shape.borderRadius};
  font-family: ${props => props.theme.typography.fontFamily};
  font-size: ${props => props.theme.typography.body1.fontSize};
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary.main};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary.light};
  }
`;

// Container for action buttons
const ActionButtons = styled.div`
  display: flex;
  gap: ${SPACING.SM};
  justify-content: flex-end;
  margin-top: ${SPACING.MD};
`;

// Container for related memories section
const RelatedMemories = styled.div`
  margin-top: ${SPACING.LG};
  border-top: 1px solid ${props => props.theme.colors.divider};
  padding-top: ${SPACING.MD};
`;

// Item in the related memories list
const RelatedMemoryItem = styled.div`
  padding: ${SPACING.SM};
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: ${props => props.theme.shape.borderRadius};
  margin-bottom: ${SPACING.SM};
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

// Empty state when no memory is selected
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: ${SPACING.LG};
  text-align: center;
  color: ${props => props.theme.colors.text.secondary};
`;

// Container for loading state
const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

// Dialog for confirming actions
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
  background-color: ${props => props.theme.colors.background.paper};
  padding: ${SPACING.LG};
  border-radius: ${props => props.theme.shape.borderRadius};
  max-width: 400px;
  width: 100%;
`;

// Indicator for important memories
const ImportanceIndicator = styled.div<{ important?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${SPACING.SM};
  color: ${props => props.important ? props.theme.colors.warning.main : props.theme.colors.text.secondary};
  font-size: ${props => props.theme.typography.body2.fontSize};
  margin-bottom: ${SPACING.SM};
`;

export default MemoryDetail;