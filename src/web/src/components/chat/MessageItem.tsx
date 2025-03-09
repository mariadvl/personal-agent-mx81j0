import React from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import classNames from 'classnames'; // classnames version ^2.3.2

import Avatar from '../ui/Avatar';
import RelatedMemory from './RelatedMemory';
import { 
  Message, 
  MessageRole,
  MessageWithPending 
} from '../../types/conversation';
import useTheme from '../../hooks/useTheme';
import { 
  SPACING, 
  MESSAGE_MAX_WIDTH,
  BORDER_RADIUS 
} from '../../constants/uiConstants';
import { formatDate } from '../../utils/dateUtils';

/**
 * Interface defining the props for the MessageItem component.
 */
interface MessageItemProps {
  message: MessageWithPending;
  relatedMemories: Record<string, RelatedMemory[]>;
  className?: string;
}

/**
 * Renders an individual message in the chat interface with appropriate styling based on the message role
 * @param {MessageItemProps} props - The props object containing message data, related memories, and optional class names
 * @returns {JSX.Element} Rendered message component
 */
const MessageItem: React.FC<MessageItemProps> = ({ message, relatedMemories, className }) => {
  // LD1: Destructure props to get message, relatedMemories, and className
  const { role, content, created_at, metadata, pending } = message;

  // LD1: Get current theme using useTheme hook
  const { theme } = useTheme();

  // LD1: Determine if the message is from the user or AI based on role
  const isUserMessage = role === 'user';
  const isAssistantMessage = role === 'assistant';

  // LD1: Format the message timestamp using formatDate utility
  const formattedTimestamp = formatDate(created_at, 'h:mm a');

  // LD1: Determine appropriate styling based on message role and theme
  const messageContainerClassName = classNames(
    'message-container',
    className,
    {
      'user-message': isUserMessage,
      'ai-message': isAssistantMessage,
      'pending-message': pending === true,
    }
  );

  // LD1: Render a container with appropriate alignment (right for user, left for AI)
  return (
    <MessageContainer className={messageContainerClassName} isUserMessage={isUserMessage}>
      {/* LD1: Include Avatar component with appropriate image or initials */}
      <AvatarContainer isUserMessage={isUserMessage}>
        <Avatar 
          text={isUserMessage ? 'You' : 'AI'}
          size={32}
        />
      </AvatarContainer>

      {/* LD1: Render message bubble with content and timestamp */}
      <MessageBubble isUserMessage={isUserMessage}>
        <MessageContent isUserMessage={isUserMessage}>
          {content}
        </MessageContent>
        <MessageTimestamp isUserMessage={isUserMessage}>
          {formattedTimestamp}
        </MessageTimestamp>
      </MessageBubble>

      {/* LD1: Show loading indicator for pending AI messages */}
      {isAssistantMessage && pending && (
        <LoadingIndicator>
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </LoadingIndicator>
      )}

      {/* LD1: Render related memories below AI messages when available */}
      {isAssistantMessage && relatedMemories && relatedMemories[message.id] && (
        <RelatedMemoriesContainer>
          {relatedMemories[message.id].map(relatedMemory => (
            <RelatedMemory 
              key={relatedMemory.memory_id}
              relatedMemory={relatedMemory}
            />
          ))}
        </RelatedMemoriesContainer>
      )}
    </MessageContainer>
  );
};

// LD1: Styled container for a message with appropriate alignment
const MessageContainer = styled.div<{ isUserMessage: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: ${props => props.isUserMessage ? 'flex-end' : 'flex-start'};
  margin-bottom: ${SPACING.MD};
  width: 100%;
`;

// LD1: Styled bubble containing the message content
const MessageBubble = styled.div<{ isUserMessage: boolean }>`
  background-color: ${props =>
    props.isUserMessage ? props.theme.colors.primary.main : props.theme.colors.background.elevated};
  border-radius: ${BORDER_RADIUS.MEDIUM};
  padding: ${SPACING.MD};
  max-width: ${MESSAGE_MAX_WIDTH};
  box-shadow: ${props => props.theme.shadows.small};
  word-break: break-word;
  white-space: pre-wrap;
`;

// LD1: Container for the actual message text
const MessageContent = styled.div<{ isUserMessage: boolean }>`
  color: ${props =>
    props.isUserMessage ? props.theme.colors.primary.contrastText : props.theme.colors.text.primary};
  font-size: ${props => props.theme.typography.body1.fontSize};
  line-height: ${props => props.theme.typography.body1.lineHeight};
`;

// LD1: Styled timestamp display
const MessageTimestamp = styled.div<{ isUserMessage: boolean }>`
  font-size: ${props => props.theme.typography.caption.fontSize};
  color: ${props => props.theme.colors.text.secondary};
  opacity: 0.7;
  margin-top: ${SPACING.SM};
  text-align: ${props => props.isUserMessage ? 'right' : 'left'};
`;

// LD1: Container for the avatar with appropriate spacing
const AvatarContainer = styled.div<{ isUserMessage: boolean }>`
  margin-right: ${props => props.isUserMessage ? '0' : SPACING.MD};
  margin-left: ${props => props.isUserMessage ? SPACING.MD : '0'};
  flex-shrink: 0;
`;

// LD1: Container for related memory references
const RelatedMemoriesContainer = styled.div`
  margin-top: ${SPACING.MD};
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
`;

// LD1: Animated dots for pending messages
const LoadingIndicator = styled.div`
  display: inline-block;
  
  span {
    display: inline-block;
    animation: loading 1.5s infinite;
    opacity: 0;
    
    &:nth-child(1) {
      animation-delay: 0s;
    }
    
    &:nth-child(2) {
      animation-delay: 0.5s;
    }
    
    &:nth-child(3) {
      animation-delay: 1s;
    }
  }
  
  @keyframes loading {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
`;

// IE3: Export the MessageItem component as default
export default MessageItem;