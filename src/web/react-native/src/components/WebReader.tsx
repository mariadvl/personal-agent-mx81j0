import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { WebReaderStatus } from '../../src/types/web';
import { post } from '../services/api';
import { validateUrl, normalizeUrl } from '../../src/services/webService';

/**
 * Props interface for the WebReader component
 */
interface WebReaderProps {
  /** Initial URL to load (optional) */
  initialUrl?: string;
  /** Custom styles for the container */
  style?: object;
  /** Whether to include images in extraction (default: false) */
  includeImages?: boolean;
  /** Maximum content length to extract */
  maxContentLength?: number;
  /** Whether to generate summary (default: true) */
  generateSummary?: boolean;
  /** Whether to extract metadata (default: true) */
  extractMetadata?: boolean;
  /** Whether to automatically store in memory (default: false) */
  autoStoreInMemory?: boolean;
  /** Whether to show external service warning (default: true) */
  showExternalServiceWarning?: boolean;
  /** Callback when content is extracted */
  onContentExtracted?: (content: any) => void;
  /** Callback when memory is stored */
  onMemoryStored?: (memoryId: string) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback to navigate to chat with context */
  onNavigateToChat?: (memoryId: string) => void;
}

/**
 * WebReader component for extracting and displaying web content on mobile
 */
const WebReader: React.FC<WebReaderProps> = ({
  initialUrl,
  style,
  includeImages = false,
  maxContentLength,
  generateSummary = true,
  extractMetadata = true,
  autoStoreInMemory = false,
  showExternalServiceWarning = true,
  onContentExtracted,
  onMemoryStored,
  onError,
  onNavigateToChat
}) => {
  // State for web content extraction
  const [webReaderState, setWebReaderState] = useState({
    url: initialUrl || '',
    status: WebReaderStatus.IDLE,
    title: '',
    content: '',
    summary: '',
    metadata: {
      author: '',
      publishDate: '',
      source: '',
      wordCount: 0,
      imageCount: 0,
      keywords: []
    },
    error: '',
    progress: 0,
    showExternalServiceWarning: false,
    memoryId: ''
  });

  // State for view mode (content or summary)
  const [viewMode, setViewMode] = useState('summary');

  // Handle URL submission
  const handleUrlSubmit = useCallback((url: string) => {
    if (!url || !validateUrl(url)) {
      setWebReaderState(prev => ({
        ...prev,
        error: 'Please enter a valid URL',
        status: WebReaderStatus.ERROR
      }));
      return;
    }

    // Reset error and set loading state
    setWebReaderState(prev => ({
      ...prev,
      url,
      error: '',
      status: WebReaderStatus.LOADING,
      progress: 0
    }));

    // Show warning about external service usage if needed
    if (showExternalServiceWarning) {
      setWebReaderState(prev => ({
        ...prev,
        showExternalServiceWarning: true
      }));
    } else {
      // If no warning needed, proceed with extraction
      handleExternalServiceWarningConfirm();
    }
  }, [showExternalServiceWarning]);

  // Handle confirmation of external service warning
  const handleExternalServiceWarningConfirm = useCallback(() => {
    setWebReaderState(prev => ({
      ...prev,
      showExternalServiceWarning: false,
      status: WebReaderStatus.EXTRACTING
    }));

    const normalizedUrl = normalizeUrl(webReaderState.url);
    
    // Make API request to extract web content
    post('/api/web/extract', {
      url: normalizedUrl,
      options: {
        includeImages,
        maxContentLength,
        generateSummary,
        extractMetadata
      }
    })
      .then(response => {
        if (response.success && response.data) {
          const extractionResult = response.data;
          
          setWebReaderState(prev => ({
            ...prev,
            status: WebReaderStatus.COMPLETE,
            title: extractionResult.title,
            content: extractionResult.content,
            summary: extractionResult.summary,
            metadata: extractionResult.metadata || prev.metadata,
            progress: 100
          }));
          
          if (onContentExtracted) {
            onContentExtracted(extractionResult);
          }
          
          // Automatically store in memory if option enabled
          if (autoStoreInMemory) {
            handleStoreInMemory();
          }
        } else {
          throw new Error(response.error || 'Failed to extract web content');
        }
      })
      .catch(error => {
        setWebReaderState(prev => ({
          ...prev,
          status: WebReaderStatus.ERROR,
          error: error.message || 'An error occurred while extracting web content'
        }));
        
        if (onError) {
          onError(error.message || 'Failed to extract web content');
        }
      });
  }, [
    webReaderState.url,
    includeImages,
    maxContentLength,
    generateSummary,
    extractMetadata,
    autoStoreInMemory,
    onContentExtracted,
    onError
  ]);

  // Handle store in memory
  const handleStoreInMemory = useCallback(() => {
    if (webReaderState.memoryId) {
      // Already stored
      return;
    }
    
    if (webReaderState.status !== WebReaderStatus.COMPLETE) {
      return;
    }
    
    setWebReaderState(prev => ({
      ...prev,
      status: WebReaderStatus.PROCESSING
    }));
    
    post('/api/memory', {
      content: webReaderState.content,
      metadata: {
        url: webReaderState.url,
        title: webReaderState.title,
        summary: webReaderState.summary,
        ...webReaderState.metadata
      },
      category: 'web',
      source_type: 'web'
    })
      .then(response => {
        if (response.success && response.data) {
          setWebReaderState(prev => ({
            ...prev,
            status: WebReaderStatus.COMPLETE,
            memoryId: response.data.memoryId
          }));
          
          if (onMemoryStored) {
            onMemoryStored(response.data.memoryId);
          }
          
          Alert.alert('Success', 'Web content stored in memory');
        } else {
          throw new Error(response.error || 'Failed to store web content in memory');
        }
      })
      .catch(error => {
        setWebReaderState(prev => ({
          ...prev,
          status: WebReaderStatus.COMPLETE,
          error: error.message || 'An error occurred while storing web content'
        }));
        
        Alert.alert('Error', 'Failed to store web content in memory');
      });
  }, [webReaderState.status, webReaderState.memoryId, webReaderState.url, webReaderState.title, webReaderState.content, webReaderState.summary, webReaderState.metadata, onMemoryStored]);

  // Handle ask questions about content
  const handleAskQuestions = useCallback(() => {
    if (webReaderState.status !== WebReaderStatus.COMPLETE) {
      return;
    }
    
    if (!webReaderState.memoryId) {
      // Need to store in memory first
      handleStoreInMemory();
      setTimeout(() => {
        if (webReaderState.memoryId && onNavigateToChat) {
          onNavigateToChat(webReaderState.memoryId);
        }
      }, 1000); // Give time for memory storage to complete
      return;
    }
    
    if (onNavigateToChat) {
      onNavigateToChat(webReaderState.memoryId);
    }
  }, [webReaderState.status, webReaderState.memoryId, handleStoreInMemory, onNavigateToChat]);

  // Toggle between full content and summary
  const handleViewFullText = useCallback(() => {
    setViewMode(prev => prev === 'content' ? 'summary' : 'content');
  }, []);

  // Reset the web reader
  const handleReset = useCallback(() => {
    setWebReaderState({
      url: '',
      status: WebReaderStatus.IDLE,
      title: '',
      content: '',
      summary: '',
      metadata: {
        author: '',
        publishDate: '',
        source: '',
        wordCount: 0,
        imageCount: 0,
        keywords: []
      },
      error: '',
      progress: 0,
      showExternalServiceWarning: false,
      memoryId: ''
    });
    setViewMode('summary');
  }, []);

  // Initialize with initial URL if provided
  useEffect(() => {
    if (initialUrl && validateUrl(initialUrl)) {
      handleUrlSubmit(initialUrl);
    }
  }, [initialUrl, handleUrlSubmit]);

  // Render URL input with validation
  const renderUrlInput = (webReaderState, handleUrlSubmit, handleExternalServiceWarningConfirm) => {
    const [inputUrl, setInputUrl] = useState(webReaderState.url);
    const [urlError, setUrlError] = useState('');
    
    const handleUrlChange = (text: string) => {
      setInputUrl(text);
      setUrlError('');
    };
    
    const handleSubmit = () => {
      if (!inputUrl) {
        setUrlError('Please enter a URL');
        return;
      }
      
      if (!validateUrl(inputUrl)) {
        setUrlError('Please enter a valid URL');
        return;
      }
      
      handleUrlSubmit(inputUrl);
    };
    
    const isLoading = [
      WebReaderStatus.LOADING,
      WebReaderStatus.EXTRACTING,
      WebReaderStatus.PROCESSING
    ].includes(webReaderState.status);
    
    return (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter URL (https://example.com)"
          value={inputUrl}
          onChangeText={handleUrlChange}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!isLoading}
          accessible={true}
          accessibilityLabel="URL input field"
          accessibilityHint="Enter a web page URL to extract content"
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          accessible={true}
          accessibilityLabel="Extract content button"
          accessibilityHint="Press to extract content from the entered URL"
        >
          <Text style={styles.buttonText}>Go</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render warning about external service usage
  const renderExternalServiceWarning = (onConfirm, onCancel) => {
    return (
      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ This will send the URL to external services for content extraction. 
          External services may have access to the URL and its content.
        </Text>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#dc3545' }]}
            onPress={onCancel}
            accessible={true}
            accessibilityLabel="Cancel button"
            accessibilityHint="Cancel the web content extraction"
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onConfirm}
            accessible={true}
            accessibilityLabel="Continue button"
            accessibilityHint="Continue with web content extraction using external services"
          >
            <Text style={styles.actionButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render extracted web content
  const renderWebContent = (webReaderState) => {
    const { title, content, metadata } = webReaderState;
    
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title} 
          accessible={true} 
          accessibilityRole="header"
        >
          {title}
        </Text>
        <ScrollView>
          <Text style={styles.content}>
            {content}
          </Text>
          
          {metadata && (
            <View style={styles.metadataContainer}>
              {metadata.source && (
                <Text style={styles.metadataText}>Source: {metadata.source}</Text>
              )}
              {metadata.publishDate && (
                <Text style={styles.metadataText}>Published: {metadata.publishDate}</Text>
              )}
              {metadata.wordCount > 0 && (
                <Text style={styles.metadataText}>Word count: {metadata.wordCount}</Text>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render web content summary
  const renderWebSummary = (webReaderState, onStoreInMemory, onAskQuestions, onViewFullText) => {
    const { title, summary, metadata } = webReaderState;
    
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.title} 
          accessible={true} 
          accessibilityRole="header"
        >
          {title}
        </Text>
        <ScrollView>
          <Text style={styles.content}>
            {summary}
          </Text>
          
          {metadata && (
            <View style={styles.metadataContainer}>
              {metadata.source && (
                <Text style={styles.metadataText}>Source: {metadata.source}</Text>
              )}
              {metadata.publishDate && (
                <Text style={styles.metadataText}>Published: {metadata.publishDate}</Text>
              )}
              {metadata.wordCount > 0 && (
                <Text style={styles.metadataText}>Word count: {metadata.wordCount}</Text>
              )}
            </View>
          )}
        </ScrollView>
        
        {renderActionButtons(
          onStoreInMemory, 
          onAskQuestions, 
          onViewFullText, 
          !!webReaderState.memoryId
        )}
      </View>
    );
  };

  // Render action buttons
  const renderActionButtons = (onStoreInMemory, onAskQuestions, onViewFullText, isStoredInMemory) => {
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={[
            styles.actionButton,
            isStoredInMemory && styles.actionButtonDisabled
          ]}
          onPress={onStoreInMemory}
          disabled={isStoredInMemory}
          accessible={true}
          accessibilityLabel="Store in memory button"
          accessibilityHint="Store this web content in the AI's memory"
        >
          <Text style={styles.actionButtonText}>
            {isStoredInMemory ? 'Stored in Memory' : 'Store in Memory'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onAskQuestions}
          accessible={true}
          accessibilityLabel="Ask questions button"
          accessibilityHint="Ask questions about this web content"
        >
          <Text style={styles.actionButtonText}>Ask Questions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={onViewFullText}
          accessible={true}
          accessibilityLabel="View full text button"
          accessibilityHint="Toggle between summary and full content view"
        >
          <Text style={styles.actionButtonText}>
            {viewMode === 'content' ? 'View Summary' : 'View Full Text'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render status bar
  const renderStatusBar = (usingExternalService) => {
    return (
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {usingExternalService ? 
            '⚠️ External service used for web access' : 
            'ℹ️ Local processing only'}
          {usingExternalService ? ' [Web: ON]' : ' [Web: OFF]'}
        </Text>
      </View>
    );
  };

  // Render the main component
  return (
    <SafeAreaView style={[styles.container, style]}>
      {/* URL input section */}
      {renderUrlInput(webReaderState, handleUrlSubmit, handleExternalServiceWarningConfirm)}
      
      {/* External service warning */}
      {webReaderState.showExternalServiceWarning && (
        renderExternalServiceWarning(
          handleExternalServiceWarningConfirm,
          () => setWebReaderState(prev => ({ ...prev, showExternalServiceWarning: false, status: WebReaderStatus.IDLE }))
        )
      )}
      
      {/* Loading indicator */}
      {(webReaderState.status === WebReaderStatus.LOADING || 
        webReaderState.status === WebReaderStatus.EXTRACTING || 
        webReaderState.status === WebReaderStatus.PROCESSING) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10 }}>
            {webReaderState.status === WebReaderStatus.LOADING ? 'Preparing...' : 
             webReaderState.status === WebReaderStatus.EXTRACTING ? 'Extracting content...' : 
             'Processing...'}
          </Text>
        </View>
      )}
      
      {/* Error message */}
      {webReaderState.status === WebReaderStatus.ERROR && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{webReaderState.error}</Text>
          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Web content */}
      {webReaderState.status === WebReaderStatus.COMPLETE && viewMode === 'content' && (
        renderWebContent(webReaderState)
      )}
      
      {/* Web summary */}
      {webReaderState.status === WebReaderStatus.COMPLETE && viewMode === 'summary' && (
        renderWebSummary(
          webReaderState,
          handleStoreInMemory,
          handleAskQuestions,
          handleViewFullText
        )
      )}
      
      {/* Status bar */}
      {webReaderState.status !== WebReaderStatus.IDLE && (
        renderStatusBar(webReaderState.status !== WebReaderStatus.ERROR)
      )}
    </SafeAreaView>
  );
};

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: '#cc0000',
    marginBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
  },
  metadataContainer: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16,
  },
  metadataText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 13,
  },
  warningContainer: {
    padding: 16,
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: 16,
  },
  warningText: {
    color: '#856404',
    marginBottom: 16,
  },
  statusBar: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#dddddd',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
});

export default WebReader;