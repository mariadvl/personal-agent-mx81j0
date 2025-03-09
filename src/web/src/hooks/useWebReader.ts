import { useState, useEffect, useCallback } from 'react';
import useSettings from './useSettings';
import { 
  extractWebContent,
  validateUrl,
  normalizeUrl,
  storeWebContentInMemory,
  generateWebContentSummary,
  isExternalServiceWarningNeeded
} from '../services/webService';
import {
  WebReaderState,
  WebReaderStatus,
  WebReaderOptions,
  WebExtractionOptions,
  MAX_CONTENT_LENGTH
} from '../types/web';

/**
 * Interface for the object returned by the useWebReader hook
 */
interface WebReaderHookResult {
  /** Current URL being processed */
  url: string;
  /** Current status of the web reader */
  status: WebReaderStatus;
  /** Title of the extracted web page */
  title: string;
  /** Content of the extracted web page */
  content: string;
  /** Summary of the extracted content */
  summary: string;
  /** Metadata of the extracted web page */
  metadata: object;
  /** Error message if any */
  error: string;
  /** Progress of the current operation (0-100) */
  progress: number;
  /** Whether to show the external service warning */
  showExternalServiceWarning: boolean;
  /** ID of the memory item if stored */
  memoryId: string;
  
  /**
   * Set the URL to extract content from
   * @param url - The URL to set
   */
  setUrl: (url: string) => void;
  
  /**
   * Extract content from the current URL
   * @returns Promise that resolves when extraction is complete
   */
  extractContent: () => Promise<void>;
  
  /**
   * Store the extracted content in memory
   * @returns Promise resolving to the memory ID
   */
  storeInMemory: () => Promise<string>;
  
  /**
   * Generate a summary of the extracted content
   * @returns Promise resolving to the summary text
   */
  generateSummary: () => Promise<string>;
  
  /**
   * Reset the web reader state
   */
  reset: () => void;
  
  /**
   * Confirm the external service warning and proceed with extraction
   * @returns Promise that resolves when extraction begins
   */
  confirmExternalServiceWarning: () => Promise<void>;
  
  /**
   * Check if the current URL is valid
   * @returns True if URL is valid
   */
  isValidUrl: () => boolean;
}

/**
 * A hook that provides functionality for extracting and processing web content
 * 
 * @param options - Configuration options for the web reader
 * @returns Object containing web reader state and functions for managing web content
 */
function useWebReader(options: WebReaderOptions): WebReaderHookResult {
  // Get privacy settings from the settings hook
  const { settings } = useSettings();
  const localStorageOnly = settings.privacy_settings.local_storage_only;
  
  // Initialize state with empty values and idle status
  const [state, setState] = useState<WebReaderState>({
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
    showExternalServiceWarning: isExternalServiceWarningNeeded(localStorageOnly),
    memoryId: ''
  });
  
  /**
   * Reset the reader state to initial values
   */
  const reset = useCallback(() => {
    setState({
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
      showExternalServiceWarning: isExternalServiceWarningNeeded(localStorageOnly),
      memoryId: ''
    });
  }, [localStorageOnly]);
  
  /**
   * Set the URL and update the warning status if needed
   */
  const setUrl = useCallback((url: string) => {
    setState(prev => ({
      ...prev,
      url,
      // Only show warning if URL is valid and local-only mode is enabled
      showExternalServiceWarning: 
        url && validateUrl(url) 
          ? isExternalServiceWarningNeeded(localStorageOnly) 
          : false
    }));
  }, [localStorageOnly]);
  
  /**
   * Check if the current URL is valid
   */
  const isValidUrl = useCallback(() => {
    return validateUrl(state.url);
  }, [state.url]);
  
  /**
   * Extract content from the current URL
   */
  const extractContent = useCallback(async () => {
    // Validate URL before proceeding
    if (!isValidUrl()) {
      setState(prev => ({
        ...prev,
        error: 'Invalid URL. Please enter a valid URL.',
        status: WebReaderStatus.ERROR
      }));
      return;
    }
    
    // If warning needs to be shown, don't proceed with extraction yet
    if (state.showExternalServiceWarning) {
      return;
    }
    
    try {
      // Update status to show extraction is starting
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.EXTRACTING,
        progress: 10,
        error: ''
      }));
      
      // Prepare extraction options from hook options
      const extractionOptions: WebExtractionOptions = {
        includeImages: options.includeImages,
        maxContentLength: options.maxContentLength || MAX_CONTENT_LENGTH,
        generateSummary: options.generateSummary,
        extractMetadata: options.extractMetadata
      };
      
      // Call API to extract content
      const result = await extractWebContent({
        url: normalizeUrl(state.url),
        options: extractionOptions
      });
      
      // Update state with extracted content
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.COMPLETE,
        title: result.title,
        content: result.content,
        summary: result.summary,
        metadata: result.metadata,
        progress: 100
      }));
      
      // Automatically store in memory if configured
      if (options.autoStoreInMemory && result.content) {
        await storeInMemory();
      }
      
    } catch (error) {
      // Handle extraction errors
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to extract web content',
        status: WebReaderStatus.ERROR,
        progress: 0
      }));
    }
  }, [state.url, state.showExternalServiceWarning, options, isValidUrl]);
  
  /**
   * Store the extracted content in memory
   */
  const storeInMemory = useCallback(async (): Promise<string> => {
    // Verify content is available to store
    if (state.status !== WebReaderStatus.COMPLETE || !state.content) {
      throw new Error('No content available to store in memory');
    }
    
    try {
      // Update status to show processing
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.PROCESSING,
        progress: 80
      }));
      
      // Call API to store content in memory
      const result = await storeWebContentInMemory({
        url: state.url,
        title: state.title,
        content: state.content,
        summary: state.summary,
        metadata: state.metadata,
        category: 'web'
      });
      
      // Update state with memory ID
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.COMPLETE,
        memoryId: result.memoryId,
        progress: 100
      }));
      
      return result.memoryId;
    } catch (error) {
      // Handle storage errors
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to store content in memory',
        status: WebReaderStatus.ERROR
      }));
      throw error;
    }
  }, [state.url, state.title, state.content, state.summary, state.metadata, state.status]);
  
  /**
   * Generate a summary of the extracted content
   */
  const generateSummary = useCallback(async (): Promise<string> => {
    // Verify content is available to summarize
    if (!state.content) {
      throw new Error('No content available to summarize');
    }
    
    try {
      // Update status to show summarizing
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.SUMMARIZING,
        progress: 70
      }));
      
      // Call API to generate summary
      const result = await generateWebContentSummary({
        url: state.url,
        content: state.content,
        maxLength: 200
      });
      
      // Update state with summary
      setState(prev => ({
        ...prev,
        status: WebReaderStatus.COMPLETE,
        summary: result.summary,
        progress: 90
      }));
      
      return result.summary;
    } catch (error) {
      // Handle summarization errors
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
        status: WebReaderStatus.ERROR
      }));
      throw error;
    }
  }, [state.url, state.content]);
  
  /**
   * Confirm the external service warning and proceed with extraction
   */
  const confirmExternalServiceWarning = useCallback(async (): Promise<void> => {
    // Clear the warning flag
    setState(prev => ({
      ...prev,
      showExternalServiceWarning: false
    }));
    
    // Proceed with extraction
    await extractContent();
  }, [extractContent]);
  
  // Return the state and functions
  return {
    ...state,
    setUrl,
    extractContent,
    storeInMemory,
    generateSummary,
    reset,
    confirmExternalServiceWarning,
    isValidUrl
  };
}

export default useWebReader;