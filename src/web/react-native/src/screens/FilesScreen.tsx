import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DocumentUploader from '../components/DocumentUploader';
import { useTheme } from '../theme/theme';
import { get, post, deleteRequest } from '../services/api';
import { API_ROUTES } from '../../src/constants/apiRoutes';
import { formatFileSize } from '../../src/utils/fileUtils';

/**
 * Interface for document data structure
 */
interface Document {
  /** Unique identifier for the document */
  id: string;
  /** Original filename */
  filename: string;
  /** Document file type */
  file_type: string;
  /** Document creation/upload timestamp */
  created_at: string;
  /** Whether the document has been processed */
  processed: boolean;
  /** Document file size in bytes */
  size_bytes: number;
  /** Document summary if processed */
  summary: string | null;
}

/**
 * FilesScreen component displays the list of uploaded documents and provides
 * functionality for uploading, viewing, processing, and managing documents.
 */
const FilesScreen = () => {
  // State management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Hooks
  const { theme, isDarkMode } = useTheme();
  const navigation = useNavigation();
  
  /**
   * Fetches the list of documents from the API
   */
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await get(API_ROUTES.DOCUMENT.BASE);
      
      if (response.success) {
        setDocuments(response.data.documents || []);
      } else {
        Alert.alert('Error', response.error || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      Alert.alert('Error', 'An error occurred while loading documents');
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Handles the pull-to-refresh action
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };
  
  /**
   * Handles successful document upload
   * @param documentId ID of the uploaded document
   * @param filename Name of the uploaded file
   */
  const handleUploadComplete = (documentId: string, filename: string) => {
    Alert.alert('Success', `Document "${filename}" uploaded successfully`);
    fetchDocuments();
    
    // Optionally prompt to process the document
    Alert.alert(
      'Process Document',
      'Would you like to process this document now?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => handleProcessDocument(documentId)
        }
      ]
    );
  };
  
  /**
   * Handles document upload errors
   * @param error Error message from the upload process
   */
  const handleUploadError = (error: string) => {
    Alert.alert('Upload Failed', error);
  };
  
  /**
   * Initiates document processing
   * @param documentId ID of the document to process
   */
  const handleProcessDocument = async (documentId: string) => {
    try {
      setProcessing(documentId);
      
      const response = await post(
        API_ROUTES.DOCUMENT.PROCESS.replace('{id}', documentId)
      );
      
      if (response.success) {
        Alert.alert('Success', 'Document processing started');
        fetchDocuments(); // Refresh to update status
      } else {
        Alert.alert('Error', response.error || 'Failed to process document');
      }
    } catch (error) {
      console.error('Error processing document:', error);
      Alert.alert('Error', 'An error occurred while processing the document');
    } finally {
      setProcessing(null);
    }
  };
  
  /**
   * Deletes a document after confirmation
   * @param documentId ID of the document to delete
   * @param filename Name of the document for confirmation message
   */
  const handleDeleteDocument = async (documentId: string, filename: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${filename}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteRequest(
                API_ROUTES.DOCUMENT.DELETE.replace('{id}', documentId)
              );
              
              if (response.success) {
                Alert.alert('Success', 'Document deleted successfully');
                fetchDocuments(); // Refresh list after deletion
              } else {
                Alert.alert('Error', response.error || 'Failed to delete document');
              }
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'An error occurred while deleting the document');
            }
          }
        }
      ]
    );
  };
  
  /**
   * Navigates to document viewer screen
   * @param documentId ID of the document to view
   */
  const handleViewDocument = (documentId: string) => {
    // @ts-ignore - Navigation typing would need to be properly set up
    navigation.navigate('DocumentViewer', { documentId });
  };
  
  /**
   * Returns the appropriate icon name for a file type
   * @param fileType File type/extension
   * @returns Icon name for the file type
   */
  const getFileTypeIcon = (fileType: string): string => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return 'file-pdf-box';
      case 'docx':
      case 'doc':
        return 'file-word-box';
      case 'txt':
        return 'file-document-outline';
      case 'md':
        return 'language-markdown';
      case 'csv':
        return 'file-delimited-outline';
      case 'xlsx':
      case 'xls':
        return 'file-excel-box';
      default:
        return 'file-outline';
    }
  };
  
  /**
   * Renders a single document item in the list
   */
  const renderDocumentItem = ({ item }: { item: Document }) => {
    const date = new Date(item.created_at).toLocaleDateString();
    const fileSize = formatFileSize(item.size_bytes);
    const iconName = getFileTypeIcon(item.file_type);
    const isProcessing = processing === item.id;
    
    return (
      <View style={[
        styles.documentItem,
        { 
          borderColor: theme.colors.divider,
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#fff'
        }
      ]}>
        <View style={styles.documentInfo}>
          <Icon
            name={iconName}
            size={36}
            color={theme.colors.primary.main}
            style={styles.documentIcon}
          />
          <View>
            <Text 
              style={[styles.documentName, { color: theme.colors.text.primary }]}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {item.filename}
            </Text>
            <View style={styles.documentMeta}>
              <Text style={[styles.documentDate, { color: theme.colors.text.secondary }]}>
                {date}
              </Text>
              <Text style={[styles.documentSize, { color: theme.colors.text.secondary }]}>
                {fileSize}
              </Text>
              {item.processed && (
                <View style={[styles.processedBadge, { backgroundColor: theme.colors.success.main }]}>
                  <Text style={[styles.processedText, { color: theme.colors.success.contrastText }]}>
                    Processed
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleViewDocument(item.id)}
          >
            <Icon name="eye" size={22} color={theme.colors.primary.main} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              (isProcessing || item.processed) && { opacity: 0.5 }
            ]}
            onPress={() => handleProcessDocument(item.id)}
            disabled={isProcessing || item.processed}
          >
            {isProcessing ? (
              <View style={styles.processingIndicator}>
                <ActivityIndicator size="small" color={theme.colors.primary.main} />
              </View>
            ) : (
              <Icon 
                name="cog" 
                size={22} 
                color={item.processed ? theme.colors.text.disabled : theme.colors.primary.main} 
              />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteDocument(item.id, item.filename)}
          >
            <Icon name="delete" size={22} color={theme.colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Files
        </Text>
        {!loading && (
          <TouchableOpacity onPress={handleRefresh}>
            <Icon name="refresh" size={24} color={theme.colors.primary.main} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        <DocumentUploader
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
        
        <View style={[styles.divider, { backgroundColor: theme.colors.divider }]} />
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={[{ color: theme.colors.text.secondary, marginTop: 10 }]}>
              Loading documents...
            </Text>
          </View>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            renderItem={renderDocumentItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary.main]}
                tintColor={theme.colors.primary.main}
              />
            }
            contentContainerStyle={[
              styles.documentList,
              documents.length === 0 && { flex: 1 }
            ]}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Icon 
                  name="file-document-outline" 
                  size={64} 
                  color={theme.colors.text.disabled}
                />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  No documents yet. Upload a document to get started.
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  documentList: {
    paddingBottom: 16,
  },
  documentItem: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentIcon: {
    marginRight: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    width: '85%',
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentDate: {
    fontSize: 14,
    marginRight: 12,
  },
  documentSize: {
    fontSize: 14,
  },
  processedBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  processedText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 12,
  },
  processingIndicator: {
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FilesScreen;