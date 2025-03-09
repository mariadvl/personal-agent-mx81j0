import React, { useEffect } from 'react'; // react version ^18.2.0
import { Metadata } from 'next'; // next version ^14.0.0
import { useParams } from 'next/navigation'; // next/navigation version ^14.0.0
import styled from 'styled-components'; // styled-components version ^5.3.10

import ChatInterface from '../../../components/chat/ChatInterface';
import StatusBar from '../../../components/layout/StatusBar';
import useConversation from '../../../hooks/useConversation';

/**
 * Generates metadata for the specific conversation page
 * @param   { params }
 * @returns {Promise<Metadata>} Page metadata including title and description
 */
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Extract conversation ID from params
  const conversationId = params.id;

  // Return metadata object with title 'Conversation' and description about the specific conversation
  return {
    title: `Conversation`,
    description: `Conversation with ID: ${conversationId}`,
  };
}

/**
 * Renders the conversation page for a specific conversation ID
 * @returns {JSX.Element} Rendered conversation page component
 */
const ConversationPage = () => {
  // Get conversation ID from URL parameters using useParams
  const { id: conversationId } = useParams();

  // Set up page container with appropriate styling
  return (
    <PageContainer>
      <ChatContainer>
        {/* Render ChatInterface component with the specific conversation ID */}
        <ChatInterface conversationId={conversationId} />
      </ChatContainer>

      {/* Include StatusBar component at the bottom of the page with web status indicator */}
      <StatusBar />
    </PageContainer>
  );
};

// Main container for the conversation page
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  position: relative;
  background-color: ${props => props.theme.colors.background.primary};
  overflow: hidden;
`;

// Container for the chat interface
const ChatContainer = styled.div`
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  flex-direction: column;
`;

export default ConversationPage;