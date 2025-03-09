import React, { useEffect } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { FiChevronRight } from 'react-icons/fi';

import Card from '../ui/Card';
import Button from '../ui/Button';
import useConversationStore from '../../store/conversationStore';
import { Conversation } from '../../types/conversation';
import { formatRelativeTime } from '../../utils/dateUtils';
import { SPACING } from '../../constants/uiConstants';
import { ButtonVariant } from '../../types/ui';
import useTheme from '../../hooks/useTheme';

// Styled components for the conversation list section
const ConversationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
`;

// Styled component for individual conversation items
const ConversationItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${SPACING.SM} ${SPACING.MD};
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.action.hover};
  }
`;

// Styled component for conversation titles with overflow handling
const ConversationTitle = styled.div`
  font-weight: ${props => props.theme.typography.fontWeightMedium};
  color: ${props => props.theme.colors.text.primary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
`;

// Styled component for conversation timestamps
const ConversationTime = styled.div`
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text.secondary};
`;

// Styled component for empty state message
const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;
`;

// Styled component for loading state
const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
`;

// Styled component for the view all button container
const ViewAllContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
`;

/**
 * Component that displays a list of recent conversations on the dashboard
 * of the Personal AI Agent application. It fetches and displays the most
 * recent conversations, allowing users to quickly access their previous
 * interactions with the AI.
 */
const RecentConversations = (): JSX.Element => {
  // Access conversation store to get recent conversations data and loading state
  const { recentConversations, loadRecentConversations, isLoading } = useConversationStore();
  
  // Get current theme for styled components
  const { theme } = useTheme();

  // Load recent conversations when the component mounts
  useEffect(() => {
    loadRecentConversations({ limit: 5 });
  }, [loadRecentConversations]);

  // Number of conversations to display on the dashboard
  const displayLimit = 5;

  // Card footer with "View All" button that links to the chat page
  const cardFooter = (
    <ViewAllContainer>
      <Link href="/chat">
        <Button
          variant={ButtonVariant.TEXT}
          endIcon={<FiChevronRight />}
        >
          View All
        </Button>
      </Link>
    </ViewAllContainer>
  );

  return (
    <Card
      title="Recent Conversations"
      footer={cardFooter}
    >
      {isLoading ? (
        <LoadingState>Loading conversations...</LoadingState>
      ) : recentConversations.length === 0 ? (
        <EmptyState>No recent conversations. Start chatting with your AI assistant!</EmptyState>
      ) : (
        <ConversationList>
          {recentConversations.slice(0, displayLimit).map((conversation: Conversation) => (
            <Link 
              href={`/chat/${conversation.id}`} 
              key={conversation.id}
            >
              <ConversationItem>
                <ConversationTitle>{conversation.title}</ConversationTitle>
                <ConversationTime>
                  {formatRelativeTime(conversation.updated_at)}
                </ConversationTime>
              </ConversationItem>
            </Link>
          ))}
        </ConversationList>
      )}
    </Card>
  );
};

export default RecentConversations;