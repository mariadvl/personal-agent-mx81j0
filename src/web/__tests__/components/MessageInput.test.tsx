import React from 'react'; // react version ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react version ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event version ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils version ^18.2.0
import { ThemeProvider } from 'styled-components'; // styled-components version ^5.3.10
import MessageInput from '../../src/components/chat/MessageInput';
import useConversation from '../../src/hooks/useConversation';
import useSettings from '../../src/hooks/useSettings';
import VoiceControl from '../../src/components/chat/VoiceControl';
import FileUploadButton from '../../src/components/chat/FileUploadButton';
import Button from '../../src/components/ui/Button';
import { DEFAULT_USER_SETTINGS } from '../../src/constants/defaultSettings';

// Mock the useConversation hook
jest.mock('../../src/hooks/useConversation');

// Mock the useSettings hook
jest.mock('../../src/hooks/useSettings');

// Mock the VoiceControl component
jest.mock('../../src/components/chat/VoiceControl', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ onTranscription }) => (
    <button data-testid="voice-control" onClick={() => onTranscription('Voice transcription text')} />
  )),
}));

// Mock the FileUploadButton component
jest.mock('../../src/components/chat/FileUploadButton', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(({ onSuccess, onError }) => (
    <button data-testid="file-upload" onClick={() => onSuccess({ id: 'file-123', name: 'test.pdf' })} />
  )),
}));

// Define a type for the renderMessageInput return value
type RenderResult = {
  container: HTMLElement;
  baseElement: HTMLElement;
  debug: (baseElement?: HTMLElement, maxLength?: number, options?: {
    inlineStyle?: boolean;
    hydrate?: boolean;
    strict?: boolean;
  }) => void;
  unmount: () => void;
};

// Helper function to render the component with mocks
const renderMessageInput = (props: any = {}): RenderResult => {
  // Set up mock implementations for useConversation and useSettings
  (useConversation as jest.Mock).mockReturnValue({
    sendMessage: jest.fn(),
    isSending: false,
  });

  (useSettings as jest.Mock).mockReturnValue({
    settings: DEFAULT_USER_SETTINGS,
  });

  // Wrap component in ThemeProvider
  return render(
    <ThemeProvider theme={{ colors: { primary: { main: '#007bff' } } }}>
      <MessageInput {...props} />
    </ThemeProvider>
  );
};

describe('MessageInput', () => {
  beforeEach(() => {
    // Reset all mocks to ensure clean test environment
    jest.clearAllMocks();

    // Set up default mock implementations for hooks and functions
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: jest.fn(),
      isSending: false,
    });

    (useSettings as jest.Mock).mockReturnValue({
      settings: DEFAULT_USER_SETTINGS,
    });
  });

  afterEach(() => {
    // Clear all mocks to prevent test interference
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    // Render the MessageInput component
    renderMessageInput();

    // Verify that the text input field is rendered
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();

    // Verify that the send button is rendered
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();

    // Verify that the voice control component is rendered
    expect(screen.getByTestId('voice-control')).toBeInTheDocument();

    // Verify that the file upload button is rendered
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('handles text input changes', () => {
    // Render the MessageInput component
    renderMessageInput();

    // Find the text input field
    const inputElement = screen.getByPlaceholderText('Type your message...');

    // Type text into the input field
    fireEvent.change(inputElement, { target: { value: 'Hello AI' } });

    // Verify that the input field value is updated
    expect((inputElement as HTMLInputElement).value).toBe('Hello AI');
  });

  it('submits message when send button is clicked', () => {
    // Arrange
    const sendMessageMock = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: sendMessageMock,
      isSending: false,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the text input field and send button
    const inputElement = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    // Type a message in the input field
    fireEvent.change(inputElement, { target: { value: 'Hello AI' } });

    // Act
    fireEvent.click(sendButton);

    // Assert
    expect(sendMessageMock).toHaveBeenCalledWith('Hello AI');
    expect((inputElement as HTMLInputElement).value).toBe('');
  });

  it('submits message when Enter key is pressed', () => {
    // Arrange
    const sendMessageMock = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: sendMessageMock,
      isSending: false,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the text input field
    const inputElement = screen.getByPlaceholderText('Type your message...');

    // Type a message in the input field
    fireEvent.change(inputElement, { target: { value: 'Hello AI' } });

    // Act
    fireEvent.keyDown(inputElement, { key: 'Enter', code: 'Enter' });

    // Assert
    expect(sendMessageMock).toHaveBeenCalledWith('Hello AI');
    expect((inputElement as HTMLInputElement).value).toBe('');
  });

  it('does not submit empty messages', () => {
    // Arrange
    const sendMessageMock = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: sendMessageMock,
      isSending: false,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the send button
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    // Act
    fireEvent.click(sendButton);

    // Assert
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('handles voice transcription', () => {
    // Render the MessageInput component
    renderMessageInput();

    // Find the VoiceControl component
    const voiceControlElement = screen.getByTestId('voice-control');

    // Simulate a voice transcription event
    fireEvent.click(voiceControlElement);

    // Verify that the input field is updated with the transcribed text
    expect((screen.getByPlaceholderText('Type your message...') as HTMLInputElement).value).toBe('Voice transcription text');
  });

  it('handles file uploads', () => {
    // Arrange
    const sendMessageMock = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: sendMessageMock,
      isSending: false,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the FileUploadButton component
    const fileUploadElement = screen.getByTestId('file-upload');

    // Act
    fireEvent.click(fileUploadElement);

    // Assert
    expect(sendMessageMock).toHaveBeenCalledWith(expect.stringContaining('file-123'));
    expect(sendMessageMock).toHaveBeenCalledWith(expect.stringContaining('test.pdf'));
  });

  it('disables send button when sending a message', () => {
    // Arrange
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: jest.fn(),
      isSending: true,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the send button
    const sendButton = screen.getByRole('button', { name: 'Send message' });

    // Verify that the send button is disabled
    expect(sendButton).toBeDisabled();
  });

  it('clears input after message is sent', async () => {
    // Arrange
    const sendMessageMock = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      sendMessage: sendMessageMock,
      isSending: false,
    });

    // Render the MessageInput component
    renderMessageInput();

    // Find the text input field
    const inputElement = screen.getByPlaceholderText('Type your message...');

    // Type a message in the input field
    fireEvent.change(inputElement, { target: { value: 'Hello AI' } });

    // Act
    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(sendButton);

    // Assert
    await waitFor(() => {
      expect((inputElement as HTMLInputElement).value).toBe('');
    });
  });
});