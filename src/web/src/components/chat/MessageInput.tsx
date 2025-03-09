import React, { useState, useRef, useEffect, useCallback } from 'react'; // react version ^18.2.0
import styled from 'styled-components'; // styled-components version ^5.3.10
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'; // @heroicons/react version ^2.0.18

import Button from '../ui/Button';
import { ButtonVariant, ButtonSize } from '../../types/ui';
import VoiceControl from './VoiceControl';
import FileUploadButton from './FileUploadButton';
import useConversation from '../../hooks/useConversation';
import useSettings from '../../hooks/useSettings';

interface MessageInputProps {
  conversationId: string | null;
  className?: string;
  placeholder?: string;
}

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  background-color: ${props => props.theme.colors.background.paper};
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: 8px;
  padding: 8px 12px;
  gap: 8px;
`;

const StyledInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  font-family: ${props => props.theme.typography.fontFamily};
  color: ${props => props.theme.colors.text.primary};
  min-height: 40px;
  resize: none;

  &::placeholder {
    color: ${props => props.theme.colors.text.secondary};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/**
 * A component that provides text input, voice control, and file upload for the chat interface
 */
const MessageInput: React.FC<MessageInputProps> = (props) => {
  // LD1: Destructure props to get conversationId, className, and placeholder
  const { conversationId, className, placeholder = 'Type your message...' } = props;

  // LD1: Initialize state for the input text value
  const [text, setText] = useState('');

  // LD1: Create a ref for the input element to focus it programmatically
  const inputRef = useRef<HTMLInputElement>(null);

  // LD1: Get conversation functions and state from useConversation hook
  const { sendMessage, isSending } = useConversation({ conversationId });

  // LD1: Get user settings from useSettings hook
  const { settings } = useSettings();

  // LD1: Create a memoized handler for text input changes
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  }, []);

  // LD1: Create a memoized handler for sending messages
  const handleSendMessage = useCallback(() => {
    if (text.trim()) {
      sendMessage(text);
      setText('');
    }
  }, [text, sendMessage]);

  // LD1: Create a memoized handler for handling key presses (Enter to send)
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline in input
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // LD1: Create a memoized handler for voice transcription
  const handleVoiceTranscription = useCallback((transcribedText: string) => {
    setText(transcribedText);
  }, []);

  // LD1: Create a memoized handler for file upload success
  const handleFileUploadSuccess = useCallback((data: any) => {
    // LD1: Implement file upload success logic here
    console.log('File uploaded successfully:', data);
    // LD2: Optionally display a success message or update the UI
  }, []);

  // LD1: Create a memoized handler for file upload errors
  const handleFileUploadError = useCallback((message: string) => {
    // LD1: Implement file upload error handling logic here
    console.error('File upload error:', message);
    // LD2: Display an error message to the user
  }, []);

  // LD1: Set up effect to focus the input field on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // LD1: Set up effect to clear input after message is sent
  useEffect(() => {
    // LD2: This effect is intentionally left empty as clearing is handled directly in the sendMessage function
  }, [isSending]);

  // LD1: Render a styled container with the input field, voice control, file upload, and send button
  return (
    <InputContainer className={className}>
      <StyledInput
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        aria-label="Message input"
        aria-multiline="true"
      />
      <ActionButtons>
        <VoiceControl
          onTranscription={handleVoiceTranscription}
          disabled={!settings.voice_settings.enabled}
        />
        <FileUploadButton
          conversationId={conversationId}
          onSuccess={handleFileUploadSuccess}
          onError={handleFileUploadError}
        />
        <Button
          variant={ButtonVariant.PRIMARY}
          size={ButtonSize.MEDIUM}
          onClick={handleSendMessage}
          disabled={!text.trim() || isSending}
          aria-label="Send message"
        >
          <PaperAirplaneIcon width={20} height={20} />
        </Button>
      </ActionButtons>
    </InputContainer>
  );
};

export default MessageInput;