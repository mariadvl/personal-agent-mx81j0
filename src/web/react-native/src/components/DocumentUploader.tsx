import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert,
  Platform 
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import * as FileSystem from 'react-native-fs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/theme';
import { uploadFile } from '../services/api';
import { API_ROUTES } from '../../src/constants/apiRoutes';
import { formatFileSize } from '../../src/utils/fileUtils';
import { 
  SUPPORTED_FILE_TYPES, 
  FILE_TYPE_ACCEPT_STRING,
  MAX_FILE_SIZE_BYTES
} from '../../src/constants/fileTypes';
import { 
  checkStoragePermission,
  requestStoragePermission,
  showPermissionExplanation
} from '../utils/permissions';

/**
 * Interface for the DocumentUploader component props
 */
interface DocumentUploaderProps {
  /** Callback function when upload is successful */
  onUploadComplete: (documentId: string, filename: string) => void;
  /** Callback function when upload fails */
  onUploadError: (error: string) => void;
  /** Whether to automatically process the document after upload */
  autoProcess?: boolean;
  /** Optional style prop for the container */
  style?: StyleProp<ViewStyle>;
}

/**
 * Interface for selected file information
 */
interface SelectedFile {
  /** URI of the selected file */
  uri: string;
  /** Name of the selected file */
  name: string;
  /** MIME type of the selected file */
  type: string;
  /** Size of the selected file in bytes */
  size: number;
}

/**
 * Component that provides a user interface for uploading documents in React Native
 */
const DocumentUploader: React.FC<DocumentUploaderProps> = ({ 
  onUploadComplete, 
  onUploadError, 
  autoProcess = true,
  style 
}) => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const { theme, isDarkMode } = useTheme();
  
  // Check permissions when component mounts
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        const granted = await requestStoragePermission();
        if (!granted) {
          showPermissionExplanation('storage', 
            'Storage permission is needed to select documents for upload.');
        }
      }
    };
    
    checkPermissions();
  }, []);
  
  const handleDocumentSelection = useCallback(async () => {
    try {
      setErrorMessage(null);
      setIsLoading(true);
      
      // Check permission before trying to pick a document
      const hasPermission = await checkStoragePermission();
      if (!hasPermission) {
        const granted = await requestStoragePermission();
        if (!granted) {
          showPermissionExplanation('storage', 
            'Storage permission is needed to select documents for upload.');
          setIsLoading(false);
          return;
        }
      }
      
      // Launch document picker
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });
      
      const file = result[0];
      
      // Validate the selected file
      const validation = validateFile(file);
      
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Invalid file');
        setIsLoading(false);
        return;
      }
      
      // Set the selected file if validation passes
      setSelectedFile({
        uri: file.fileCopyUri || file.uri,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0
      });
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      
      // Ignore if user cancels the document picker
      if (DocumentPicker.isCancel(err)) {
        return;
      }
      
      // Handle other errors
      console.error('Error selecting document:', err);
      setErrorMessage('Failed to select document. Please try again.');
    }
  }, []);
  
  /**
   * Helper function to validate a file before upload
   */
  const validateFile = (file: DocumentPickerResponse): { valid: boolean, error: string | null } => {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }
    
    // Extract file type from file name
    const fileType = getFileTypeFromName(file.name);
    
    // Check if file type is supported
    if (!fileType || !SUPPORTED_FILE_TYPES.includes(fileType as any)) {
      return { 
        valid: false, 
        error: `Unsupported file type. Please upload a supported document type.` 
      };
    }
    
    // Check file size
    if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
      return { 
        valid: false, 
        error: `File size exceeds the maximum allowed size of ${formatFileSize(MAX_FILE_SIZE_BYTES)}.` 
      };
    }
    
    return { valid: true, error: null };
  };
  
  /**
   * Helper function to extract file type from file name
   */
  const getFileTypeFromName = (fileName: string): string | null => {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : null;
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setIsLoading(true);
      setUploadProgress(0);
      setErrorMessage(null);
      
      // Prepare optional parameters
      const additionalData = autoProcess ? { auto_process: true } : null;
      
      // Upload file and track progress
      const result = await uploadFile(
        API_ROUTES.DOCUMENT.UPLOAD,
        selectedFile.uri,
        {
          onProgress: (progress) => setUploadProgress(progress),
          additionalData
        }
      );
      
      setIsLoading(false);
      
      if (result.success && result.data) {
        // Call onUploadComplete with the document ID and filename
        onUploadComplete(result.data.document_id, result.data.filename);
        
        // Reset component state
        setSelectedFile(null);
        setUploadProgress(0);
      } else {
        // Handle error case
        const errorMsg = result.error || 'Failed to upload document';
        setErrorMessage(errorMsg);
        onUploadError(errorMsg);
      }
    } catch (error) {
      setIsLoading(false);
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      setErrorMessage(errorMsg);
      onUploadError(errorMsg);
      console.error('Error uploading document:', error);
    }
  };
  
  const resetSelection = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setUploadProgress(0);
  };
  
  return (
    <View style={[styles.container, style]}>
      {!selectedFile ? (
        // Document selection UI
        <TouchableOpacity 
          style={[
            styles.uploadArea, 
            { 
              borderColor: theme.colors.divider,
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
            }
          ]} 
          onPress={handleDocumentSelection}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          ) : (
            <>
              <Icon 
                name="file-upload-outline" 
                size={48} 
                color={theme.colors.primary.main}
                style={styles.uploadIcon} 
              />
              <Text style={[styles.uploadText, { color: theme.colors.text.primary }]}>
                Tap to select a document
              </Text>
              <Text style={[styles.fileTypeInfo, { color: theme.colors.text.secondary }]}>
                Supported formats: PDF, DOCX, TXT, MD, CSV, XLSX
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        // Selected file UI
        <View style={styles.selectedFileContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon 
              name="file-document-outline" 
              size={36} 
              color={theme.colors.primary.main}
              style={styles.fileIcon} 
            />
            <View style={styles.fileInfo}>
              <Text 
                style={[styles.fileName, { color: theme.colors.text.primary }]}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {selectedFile.name}
              </Text>
              <Text style={[styles.fileSize, { color: theme.colors.text.secondary }]}>
                {formatFileSize(selectedFile.size)}
              </Text>
            </View>
          </View>
          
          {uploadProgress > 0 && uploadProgress < 100 && (
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    backgroundColor: theme.colors.primary.main,
                    width: `${uploadProgress}%` 
                  }
                ]} 
              />
              <Text style={[styles.progressText, { color: theme.colors.text.primary }]}>
                {Math.round(uploadProgress)}%
              </Text>
            </View>
          )}
          
          {errorMessage && (
            <Text style={[styles.errorText, { color: theme.colors.error.main }]}>
              {errorMessage}
            </Text>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary.main }]} 
              onPress={resetSelection}
              disabled={isLoading}
            >
              <Text style={[styles.buttonText, { color: theme.colors.primary.main }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.primaryButton, 
                { backgroundColor: theme.colors.primary.main },
                isLoading && { opacity: 0.7 }
              ]} 
              onPress={handleUpload}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary.contrastText} />
              ) : (
                <Text style={[styles.buttonText, { color: theme.colors.primary.contrastText }]}>
                  Upload
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  fileTypeInfo: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedFileContainer: {
    padding: 16,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    elevation: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressContainer: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 5,
    marginTop: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    position: 'absolute',
    right: 0,
    top: 12,
    fontSize: 12,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
  }
});

export default DocumentUploader;