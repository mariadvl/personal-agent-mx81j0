import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import classNames from 'classnames';

import UrlInput from './UrlInput';
import WebContent from './WebContent';
import WebSummary from './WebSummary';
import Card from '../ui/Card';
import Alert from '../ui/Alert';
import StatusBar from '../layout/StatusBar';
import useWebReader from '../../hooks/useWebReader';
import useConversation from '../../hooks/useConversation';
import { WebReaderProps, WebReaderStatus } from '../../types/web';

// Styled components
const WebReaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
`;

const ContentContainer = styled.div`
  margin-top: 16px;
`;

const ViewToggle = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/**
 * Main component for web content extraction and display
 * @param props - Component props including initialUrl, className, and other optional props
 * @returns Rendered web reader component
 */
const WebReader: React.FC<WebReaderProps> = (props) => {
  // LD1: Destructure props to get initialUrl, className, and other optional props
  const { initialUrl, className, ...rest } = props;

  // LD1: Initialize the useWebReader hook with options from props
  const {
    url,
    status,
    title,
    content,
    summary,
    metadata,
    error,
    progress,
    showExternalServiceWarning,
    memoryId,
    setUrl,
    extractContent,
    storeInMemory,
    generateSummary,
    reset,
    confirmExternalServiceWarning,
    isValidUrl
  } = useWebReader(rest);

  // LD1: Initialize the useConversation hook for creating conversations
  const { createConversation, sendMessage } = useConversation();

  // LD1: Create state for view mode (content or summary)
  const [viewMode, setViewMode] = useState<'content' | 'summary'>('content');

  // LD1: Create state for showing full content vs. summary
  const [showFullContent, setShowFullContent] = useState(true);

  // LD1: Create handleUrlSubmit function to process URL input
  const handleUrlSubmit = useCallback((newUrl: string) => {
    setUrl(newUrl);
    extractContent();
  }, [extractContent, setUrl]);

  // LD1: Create handleExternalServiceWarningConfirm function to handle privacy warning confirmation
  const handleExternalServiceWarningConfirm = useCallback(() => {
    confirmExternalServiceWarning();
  }, [confirmExternalServiceWarning]);

  // LD1: Create handleStoreInMemory function to store content in memory
  const handleStoreInMemory = useCallback(async () => {
    try {
      await storeInMemory();
    } catch (err) {
      console.error('Failed to store in memory', err);
    }
  }, [storeInMemory]);

  // LD1: Create handleAskQuestions function to create a conversation about the content
  const handleAskQuestions = useCallback(async () => {
    try {
      await createConversation();
      if (content) {
        await sendMessage(`Summarize the following content: ${content}`);
      }
    } catch (err) {
      console.error('Failed to ask questions', err);
    }
  }, [content, createConversation, sendMessage]);

  // LD1: Create handleViewFullText function to toggle between summary and full content
  const handleViewFullText = useCallback(() => {
    setViewMode('content');
  }, []);

  // LD1: Create handleReset function to reset the web reader state
  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // LD1: Use useEffect to handle initialUrl if provided
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      extractContent();
    }
  }, [initialUrl, setUrl, extractContent]);

  // LD1: Render the main container with appropriate styling
  return (
    <WebReaderContainer className={classNames('web-reader-container', className)}>
      {/* LD1: Render UrlInput component with necessary props */}
      <UrlInput
        onSubmit={handleUrlSubmit}
        webReaderState={{
          url,
          status,
          title,
          content,
          summary,
          metadata,
          error,
          progress,
          showExternalServiceWarning,
          memoryId
        }}
        onExternalServiceWarningConfirm={handleExternalServiceWarningConfirm}
      />

      {/* LD1: Conditionally render WebContent when content is available and view mode is 'content' */}
      {status === WebReaderStatus.COMPLETE && viewMode === 'content' && (
        <WebContent
          webReaderState={{
            url,
            status,
            title,
            content,
            summary,
            metadata,
            error,
            progress,
            showExternalServiceWarning,
            memoryId
          }}
        />
      )}

      {/* LD1: Conditionally render WebSummary when summary is available and view mode is 'summary' */}
      {status === WebReaderStatus.COMPLETE && viewMode === 'summary' && (
        <WebSummary
          webReaderState={{
            url,
            status,
            title,
            content,
            summary,
            metadata,
            error,
            progress,
            showExternalServiceWarning,
            memoryId
          }}
          onStoreInMemory={handleStoreInMemory}
          onAskQuestions={handleAskQuestions}
          onViewFullText={handleViewFullText}
        />
      )}

      {/* LD1: Render StatusBar with external service usage information */}
      <StatusBar showWebStatus />
    </WebReaderContainer>
  );
};

export default WebReader;