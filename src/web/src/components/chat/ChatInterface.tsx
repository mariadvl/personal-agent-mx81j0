import React from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { useParams } from 'react-router-dom'; // react-router-dom version ^6.10.0

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatusBar from '../layout/StatusBar';
import Alert from '../ui/Alert';
import useConversation from '../../hooks/useConversation';
import useSettings from '../../hooks/useSettings';
import { 
    MessageWithPending,
    RelatedMemory
} from '../../types/conversation';

interface ChatInterfaceProps {
    className?: string;
}

/**
 * Main component for the chat interface that handles conversation display and interaction
 * @param {ChatInterfaceProps} props - The props object containing className
 * @returns {JSX.Element} Rendered chat interface component
 */
const ChatInterface: React.FC<ChatInterfaceProps> = (props) => {
    // LD1: Destructure props to get className and any other props
    const { className, ...rest } = props;

    // LD2: Get conversationId from URL parameters using useParams
    const { conversationId } = useParams<{ conversationId: string }>();

    // LD3: Initialize conversation state and functions using useConversation hook
    const { 
        conversation,
        messages,
        isLoading,
        error,
        clearError
    } = useConversation({ 
        conversationId: conversationId || null, 
        autoLoad: true 
    });

    // LD4: Get user settings using useSettings hook
    const { settings } = useSettings();

    // LD5: Initialize state for related memories with useState
    const [relatedMemories, setRelatedMemories] = React.useState<Record<string, RelatedMemory[]>>({});

    // LD6: Create a ref for the chat container element
    const chatContainerRef = React.useRef<HTMLDivElement>(null);

    // LD7: Set up effect to load conversation when conversationId changes
    React.useEffect(() => {
        // The loadConversation function is already called in the useConversation hook
    }, [conversationId]);

    // LD8: Set up effect to extract related memories from message metadata
    React.useEffect(() => {
        const newRelatedMemories: Record<string, RelatedMemory[]> = {};
        messages.forEach(message => {
            if (message.metadata && message.metadata.relatedMemories) {
                newRelatedMemories[message.id] = message.metadata.relatedMemories;
            }
        });
        setRelatedMemories(newRelatedMemories);
    }, [messages]);

    // LD9: Create a memoized handler for dismissing error alerts
    const handleDismissError = React.useCallback(() => {
        clearError();
    }, [clearError]);

    // LD10: Determine privacy and connection status based on settings
    const isLocalOnly = settings?.privacy_settings?.local_storage_only;
    const hasCloudBackup = settings?.storage_settings?.backup_enabled;

    // LD11: Render a container with appropriate styling
    return (
        <ChatContainer className={className} {...rest}>
            {/* LD12: Show loading state when conversation is loading */}
            {isLoading && (
                <LoadingContainer>
                    <LoadingSpinner />
                </LoadingContainer>
            )}

            {/* LD13: Display error alert when an error occurs */}
            {error && (
                <ErrorContainer>
                    <Alert 
                        id="chat-error"
                        type="error" 
                        message={error.message} 
                        onClose={handleDismissError} 
                    />
                </ErrorContainer>
            )}

            {/* LD14: Render MessageList component with messages and related memories */}
            <MessageArea>
                <MessageList 
                    messages={messages} 
                    relatedMemories={relatedMemories} 
                />
            </MessageArea>

            {/* LD15: Render MessageInput component for user input */}
            <InputArea>
                <MessageInput 
                    conversationId={conversationId || null} 
                />
            </InputArea>

            {/* LD16: Render StatusBar component with privacy and connection status */}
            <StatusBar />
            
            {/* LD17: Apply appropriate accessibility attributes */}
            <div role="log" aria-live="polite" aria-atomic="false"></div>
        </ChatContainer>
    );
};

// LD1: Styled container for the chat interface
const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: ${props => props.theme.colors.background.default};
    border-radius: 8px;
    overflow: hidden;
`;

// LD2: Styled container for the message list
const MessageArea = styled.div`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 0;
    position: relative;
`;

// LD3: Styled container for the message input
const InputArea = styled.div`
    padding: 16px;
    border-top: 1px solid ${props => props.theme.colors.border.light};
    background-color: ${props => props.theme.colors.background.paper};
`;

// LD4: Styled container for the loading state
const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    width: 100%;
    padding: 20px;
`;

// LD5: Styled animated loading spinner
const LoadingSpinner = styled.div`
    border: 3px solid ${props => props.theme.colors.background.paper};
    border-top: 3px solid ${props => props.theme.colors.primary.main};
    border-radius: 50%;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

// LD6: Styled container for error messages
const ErrorContainer = styled.div`
    margin: 16px;
    max-width: 100%;
`;

// IE3: Export the ChatInterface component as default
export default ChatInterface;