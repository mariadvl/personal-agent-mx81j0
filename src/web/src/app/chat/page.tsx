import React from 'react'; // react version ^18.2.0
import { Metadata } from 'next'; // next version ^14.0.0
import styled from 'styled-components'; // styled-components version ^5.3.10

import ChatInterface from '../../components/chat/ChatInterface';
import StatusBar from '../../components/layout/StatusBar';
import useSettings from '../../hooks/useSettings';

/**
 * Generates metadata for the chat page
 * @returns Page metadata including title and description
 */
export const generateMetadata = (): Metadata => {
  // LD1: Return metadata object with title 'New Chat' and description about starting a new conversation with the AI assistant
  return {
    title: 'New Chat',
    description: 'Start a new conversation with the AI assistant.',
  };
};

/**
 * Renders the main chat page for starting new conversations
 * @returns Rendered chat page component
 */
const ChatPage: React.FC = () => {
  // LD1: Access user settings using useSettings hook
  const { settings } = useSettings();

  // LD2: Set up page container with appropriate styling
  return (
    <PageContainer>
      {/* LD3: Render ChatInterface component for a new conversation */}
      <ChatContainer>
        <ChatInterface />
      </ChatContainer>

      {/* LD4: Include StatusBar component at the bottom of the page with web status indicator */}
      <StatusBar />
    </PageContainer>
  );
};

// LD1: Styled container for the chat page
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  position: relative;
  background-color: ${props => props.theme.colors.background.primary};
  overflow: hidden;
`;

// LD2: Styled container for the chat interface
const ChatContainer = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

export default ChatPage;