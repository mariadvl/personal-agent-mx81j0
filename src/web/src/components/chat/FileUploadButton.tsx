import React, { useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { FiPaperclip } from 'react-icons/fi';

import Button from '../ui/Button';
import { ButtonVariant, ButtonSize } from '../../types/ui';
import { 
  uploadDocument, 
  validateFileType, 
  validateFileSize, 
  MAX_FILE_SIZE_BYTES,
  FILE_TYPE_ACCEPT_STRING,
  formatFileSize
} from '../../services/documentService';

/**
 * Props for the FileUploadButton component
 */
interface FileUploadButtonProps {
  conversationId: string;
  onSuccess: (data: any) => void;
  onError: (message: string) => void;
  className?: string;
}

/**
 * Styled container for the file upload button and hidden input
 */
const UploadContainer = styled.div`
  position: relative;
  display: inline-block;
`;

/**
 * Hidden file input element triggered by the button
 */
const HiddenInput = styled.input`
  display: none;
`;

/**
 * Overlay showing upload progress
 */
const ProgressOverlay = styled.div<{ progress: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  width: ${props => `${props.progress}%`};
  height: 4px;
  background-color: ${props => props.theme.colors.primary.main};
  transition: width 0.2s ease-in-out;
  border-radius: 0 0 4px 4px;
`;

/**
 * A button component that enables users to upload files in the chat interface
 */
const FileUploadButton: React.FC<FileUploadButtonProps> = ({ 
  conversationId, 
  onSuccess, 
  onError, 
  className 
}) => {
  // State for tracking upload progress
  const [progress, setProgress] = useState<number>(0);
  
  // State for tracking if upload is in progress
  const [uploading, setUploading] = useState<boolean>(false);
  
  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle button click - trigger file input
  const handleClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);
  
  // Handle file selection
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // Reset file input to allow selecting the same file again if needed
    if (event.target) {
      event.target.value = '';
    }
    
    if (!file) return;
    
    // Validate file type
    const fileExtension = file.name.split('.').pop() || '';
    if (!validateFileType(fileExtension)) {
      onError(`Unsupported file type. Please upload one of the following: ${FILE_TYPE_ACCEPT_STRING.replace(/\./g, ' ')}`);
      return;
    }
    
    // Validate file size
    if (!validateFileSize(file.size)) {
      onError(`File is too large. Maximum allowed size is ${formatFileSize(MAX_FILE_SIZE_BYTES)}`);
      return;
    }
    
    // Start upload
    setUploading(true);
    setProgress(0);
    
    try {
      // Upload the file with progress tracking
      const response = await uploadDocument(file, {
        onProgress: (progress) => setProgress(progress),
        additionalData: { conversation_id: conversationId }
      });
      
      // Check for errors
      if (!response.success) {
        throw new Error(response.error || 'Failed to upload file');
      }
      
      // Call the success callback
      onSuccess(response.data);
    } catch (error) {
      // Handle errors
      let errorMessage = 'Failed to upload file. Please try again.';
      if (error instanceof Error) {
        // Make error message more user-friendly
        if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Upload timed out. Please try again with a smaller file or better connection.';
        } else if (error.message.includes('server')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      onError(errorMessage);
    } finally {
      // Reset the uploading state
      setUploading(false);
    }
  }, [conversationId, onSuccess, onError]);
  
  return (
    <UploadContainer className={className}>
      <Button
        variant={ButtonVariant.ICON}
        size={ButtonSize.MEDIUM}
        startIcon={<FiPaperclip />}
        onClick={handleClick}
        disabled={uploading}
        ariaLabel="Upload file"
      />
      
      <HiddenInput
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={FILE_TYPE_ACCEPT_STRING}
      />
      
      {uploading && progress > 0 && (
        <ProgressOverlay progress={progress} />
      )}
    </UploadContainer>
  );
};

export default FileUploadButton;