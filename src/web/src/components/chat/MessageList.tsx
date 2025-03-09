import React from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { useRef, useEffect } from 'react'; // react version ^18.2.0

import MessageItem from './MessageItem';
import { 
  MessageWithPending,
} from '../../types/conversation';
import { 
  SPACING,
} from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import { RelatedMemory } from '../../types/conversation';

/**
 * Interface defining the props for the MessageList component.
 */
interface MessageListProps {
  messages: MessageWithPending[];
  relatedMemories: Record<string, RelatedMemory[]>;
  className?: string;
}

interface MessageGroup {
  date: string;
  messages: MessageWithPending[];
}

/**
 * Renders a list of messages in a conversation with automatic scrolling to the latest message
 * @param {MessageListProps} props - The props object containing messages, relatedMemories, and className
 * @returns {JSX.Element} Rendered message list component
 */
const MessageList: React.FC<MessageListProps> = ({ messages, relatedMemories, className }) => {
  // LD1: Destructure props to get messages, relatedMemories, and className
  // S1: Logging the props for debugging purposes
  // console.log("MessageList props:", { messages, relatedMemories, className });

  // LD2: Create a ref for the message container element
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // LD3: Get current theme using useTheme hook
  const { theme } = useTheme();

  // LD4: Set up effect to scroll to the bottom when new messages are added
  useEffect(() => {
    // S1: Check if the message container ref exists
    if (messageContainerRef.current) {
      // S2: Scroll to the bottom of the message container
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]); // S3: Effect runs when messages change

  // LD5: Group messages by date for better visual organization
  const groupedMessages: MessageGroup[] = React.useMemo(() => {
    const groups: Record<string, MessageWithPending[]> = {};
    if (messages) {
      messages.forEach(message => {
        const date = new Date(message.created_at).toLocaleDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(message);
      });
    }
  
    return Object.entries(groups).map(([date, messages]) => ({ date, messages }));
  }, [messages]);

  // LD6: Render a container with appropriate styling
  return (
    <MessageListContainer 
      className={className}
      ref={messageContainerRef}
      aria-live="polite"
      aria-atomic="false"
      aria-relevant="additions text"
    >
      {groupedMessages.length > 0 ? (
        groupedMessages.map((group, index) => (
          <React.Fragment key={index}>
            {/* LD7: For each date group, render a date separator */}
            <DateSeparator theme={theme}>
              <DateLine theme={theme} />
              <DateText theme={theme}>{group.date}</DateText>
            </DateSeparator>
            {/* LD8: For each message in the group, render a MessageItem component */}
            {group.messages.map(message => (
              <MessageItem
                key={message.id}
                message={message}
                relatedMemories={relatedMemories}
              />
            ))}
          </React.Fragment>
        ))
      ) : (
        <EmptyStateMessage theme={theme}>
          No messages yet. Start the conversation!
        </EmptyStateMessage>
      )}
    </MessageListContainer>
  );
};

// LD1: Styled container for the entire message list
const MessageListContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: ${SPACING.MD};
  scroll-behavior: smooth;
`;

// LD2: Visual separator for messages from different dates
const DateSeparator = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  justify-content: center;
  margin: ${SPACING.MD} 0;
  position: relative;
  text-align: center;
`;

// LD3: Text displaying the date
const DateText = styled.span<{ theme: any }>`
  background-color: ${props => props.theme.colors.background.secondary};
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.8rem;
  padding: 4px 12px;
  border-radius: 12px;
  z-index: 1;
`;

// LD4: Horizontal line for the date separator
const DateLine = styled.div<{ theme: any }>`
  position: absolute;
  width: 100%;
  height: 1px;
  background-color: ${props => props.theme.colors.border.light};
  top: 50%;
  z-index: 0;
`;

// LD5: Message displayed when there are no messages
const EmptyStateMessage = styled.div<{ theme: any }>`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;
  text-align: center;
  padding: ${SPACING.MD};
`;

// IE3: Export the MessageList component as default
export default MessageList;