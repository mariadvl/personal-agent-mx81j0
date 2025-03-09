import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FiUpload, FiFile } from 'react-icons/fi';

import Card from '../ui/Card';
import Button from '../ui/Button';
import useDocuments from '../../hooks/useDocuments';
import useTheme from '../../hooks/useTheme';
import { validateFile, formatFileSize } from '../../utils/fileUtils';
import { MAX_FILE_SIZE_BYTES } from '../../constants/fileTypes';
import { ButtonVariant } from '../../types/ui';

/**
 * Props for the DocumentUploader component
 */
interface DocumentUploaderProps {
  /** Callback function when upload is successful */
  onUploadComplete?: (documentId: string, filename: string) => void;
  /** Callback function when upload fails */
  onUploadError?: (error: string) => void;
  /** Whether to automatically process the document after upload */
  autoProcess?: boolean;
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * A component that provides a user interface for uploading documents to the Personal AI Agent.
 * Supports drag-and-drop functionality, file selection via browser dialog, and displays
 * validation feedback for file types and sizes.
 */
const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onUploadComplete,
  onUploadError,
  autoProcess = true,
  className
}) => {
  // State for drag and drop functionality
  const [dragActive, setDragActive] = useState<boolean>(false);
  // State for validation error messages
  const [error, setError] = useState<string | null>(null);
  // State for selected file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Reference to the file input element
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get the current theme
  const { theme } = useTheme();
  
  // Get document management functions from the useDocuments hook
  const { uploadDocument, supportedFileTypes, acceptedFileTypes } = useDocuments({
    onError: (err) => {
      setError(err);
      if (onUploadError) onUploadError(err);
    }
  });

  // Handler for drag enter events
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  // Handler for drag leave events
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Handler for drag over events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent default to allow drop
  }, []);

  // Handler for drop events
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // Check if files were dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Take the first file (we don't support multiple file upload)
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  // Handler for file input change events
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  // Handler to trigger file input click
  const handleFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Function to validate and upload the selected file
  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Validate the file
    const validation = validateFileForUpload(selectedFile, supportedFileTypes);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      if (onUploadError) onUploadError(validation.error || 'Invalid file');
      return;
    }

    try {
      // Upload the document
      const documentId = await uploadDocument(selectedFile, {}, autoProcess);
      
      if (documentId) {
        // Clear the selected file and error on success
        setSelectedFile(null);
        setError(null);
        if (onUploadComplete) onUploadComplete(documentId, selectedFile.name);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMessage);
      if (onUploadError) onUploadError(errorMessage);
    }
  }, [selectedFile, supportedFileTypes, uploadDocument, autoProcess, onUploadComplete, onUploadError]);

  // Function to reset file selection
  const resetFileSelection = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Helper function to validate a file before upload
  function validateFileForUpload(file: File, allowedTypes: string[]): { valid: boolean, error: string | null } {
    // Check if file exists
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    // Validate file type
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      return { 
        valid: false, 
        error: fileValidation.error || `Unsupported file type. Please upload one of these formats: ${allowedTypes.join(', ')}` 
      };
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { 
        valid: false, 
        error: `File size exceeds the maximum allowed size of ${formatFileSize(MAX_FILE_SIZE_BYTES)}` 
      };
    }
    
    return { valid: true, error: null };
  }

  return (
    <Card className={className}>
      <UploadContainer>
        {!selectedFile ? (
          // Drag and drop area (when no file is selected)
          dragActive ? (
            <DropZoneActive
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleFileSelect}
              role="button"
              tabIndex={0}
              aria-label="Drop your file here"
            >
              <UploadIcon>
                <FiUpload size={40} color={theme.colors.primary.main} />
              </UploadIcon>
              <UploadText>Drop your file here</UploadText>
              <FileTypeInfo>
                Supported formats: {supportedFileTypes.join(', ')}
              </FileTypeInfo>
            </DropZoneActive>
          ) : (
            <DropZone
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={handleFileSelect}
              role="button"
              tabIndex={0}
              aria-label="Upload a document"
            >
              <UploadIcon>
                <FiUpload size={40} color={theme.colors.primary.light} />
              </UploadIcon>
              <UploadText>
                Drag & drop your file here, or click to browse
              </UploadText>
              <FileTypeInfo>
                Supported formats: {supportedFileTypes.join(', ')}
              </FileTypeInfo>
              <FileTypeInfo>
                Maximum file size: {formatFileSize(MAX_FILE_SIZE_BYTES)}
              </FileTypeInfo>
            </DropZone>
          )
        ) : (
          // Selected file information display
          <SelectedFileContainer>
            <FileIcon>
              <FiFile size={32} color={theme.colors.primary.main} />
            </FileIcon>
            <FileInfo>
              <FileName>{selectedFile.name}</FileName>
              <FileSize>{formatFileSize(selectedFile.size)}</FileSize>
            </FileInfo>
            <ButtonContainer>
              <Button
                variant={ButtonVariant.OUTLINED}
                onClick={resetFileSelection}
                aria-label="Cancel upload"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                aria-label="Upload file"
              >
                Upload
              </Button>
            </ButtonContainer>
          </SelectedFileContainer>
        )}

        {/* Error message if any */}
        {error && <ErrorMessage>{error}</ErrorMessage>}

        {/* Hidden file input element */}
        <HiddenInput
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={acceptedFileTypes}
          aria-label="Upload document"
        />
      </UploadContainer>
    </Card>
  );
};

// Styled components
const UploadContainer = styled.div`
  padding: ${props => props.theme.typography.fontWeightMedium};
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.theme.colors.divider};
  border-radius: ${props => props.theme.shape.borderRadius}px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  text-align: center;
  
  &:hover {
    border-color: ${props => props.theme.colors.primary.main};
    background-color: ${props => props.theme.colors.action.hover};
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary.main};
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.6);
  }
`;

const DropZoneActive = styled(DropZone)`
  border-color: ${props => props.theme.colors.primary.main};
  background-color: ${props => props.theme.colors.action.hover};
`;

const UploadIcon = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const UploadText = styled.p`
  margin: 0 0 8px 0;
  font-size: ${props => props.theme.typography.body1.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
`;

const FileTypeInfo = styled.p`
  margin: 4px 0 0 0;
  font-size: ${props => props.theme.typography.caption.fontSize};
  color: ${props => props.theme.colors.text.secondary};
`;

const ErrorMessage = styled.p`
  color: ${props => props.theme.colors.error.main};
  font-size: ${props => props.theme.typography.body2.fontSize};
  margin: 8px 0 0 0;
`;

const SelectedFileContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: ${props => props.theme.shape.borderRadius}px;
  border: 1px solid ${props => props.theme.colors.divider};
  background-color: ${props => props.theme.colors.background.paper};
`;

const FileIcon = styled.div`
  margin-right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FileInfo = styled.div`
  flex: 1;
`;

const FileName = styled.p`
  margin: 0;
  font-size: ${props => props.theme.typography.body1.fontSize};
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
  word-break: break-word;
`;

const FileSize = styled.p`
  margin: 4px 0 0 0;
  font-size: ${props => props.theme.typography.caption.fontSize};
  color: ${props => props.theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-left: 16px;
`;

const HiddenInput = styled.input`
  display: none;
`;

export default DocumentUploader;