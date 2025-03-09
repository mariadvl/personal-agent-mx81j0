import React from 'react'; // react version ^18.2.0
import { render, screen, fireEvent, waitFor } from '@testing-library/react'; // @testing-library/react version ^14.0.0
import userEvent from '@testing-library/user-event'; // @testing-library/user-event version ^14.0.0
import { act } from 'react-dom/test-utils'; // react-dom/test-utils version ^18.2.0
import { ThemeProvider } from 'styled-components'; // styled-components version ^5.3.10
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // react-router-dom version ^6.10.0
import ChatInterface from '../../src/components/chat/ChatInterface';
import useConversation from '../../src/hooks/useConversation';
import useSettings from '../../src/hooks/useSettings';
import { MessageWithPending, RelatedMemory, Conversation, UserSettings } from '../../src/types/conversation';
import { jest } from '@jest/globals'; // jest version ^29.0.0
import lightTheme from '../../src/themes/lightTheme';

// Mock the useConversation hook
jest.mock('../../src/hooks/useConversation');

// Mock the useSettings hook
jest.mock('../../src/hooks/useSettings');

// Define mock return values for the hooks
const mockUseConversation = {
  conversation: null,
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  sendMessage: jest.fn(),
  createConversation: jest.fn(),
  loadConversation: jest.fn(),
  clearError: jest.fn(),
};

const mockUseSettings = {
  settings: {
    privacy_settings: { local_storage_only: true },
    search_settings: { enabled: false },
    voice_settings: { output_enabled: false }
  }
};

describe('ChatInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useConversation as jest.Mock).mockReturnValue(mockUseConversation);
    (useSettings as jest.Mock).mockReturnValue(mockUseSettings);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderChatInterface = (props = {}) => {
    (useConversation as jest.Mock).mockReturnValue(mockUseConversation);
    (useSettings as jest.Mock).mockReturnValue(mockUseSettings);

    return render(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={['/chat']}>
          <Routes>
            <Route path="/chat/:conversationId?" element={<ChatInterface {...props} />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  it('renders loading state correctly', () => {
    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      isLoading: true,
    });

    renderChatInterface();

    expect(screen.getByText('LoadingSpinner')).toBeInTheDocument();
    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    const mockMessages: MessageWithPending[] = [
      { id: '1', role: 'user', content: 'Hello', created_at: new Date().toISOString(), metadata: null, pending: false },
      { id: '2', role: 'assistant', content: 'Hi there', created_at: new Date().toISOString(), metadata: null, pending: false },
    ];

    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      messages: mockMessages,
    });

    renderChatInterface();

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('displays error alerts', async () => {
    const mockError = new Error('Test error');
    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      error: mockError,
    });

    renderChatInterface();

    expect(screen.getByText('Test error')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close alert' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(mockUseConversation.clearError).toHaveBeenCalled();
    });
  });

  it('handles message sending', async () => {
    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      sendMessage: jest.fn(),
    });

    renderChatInterface();

    const inputElement = screen.getByLabelText('Message input');
    fireEvent.change(inputElement, { target: { value: 'Test message' } });

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockUseConversation.sendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('displays related memories', () => {
    const mockMessages: MessageWithPending[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message with related memory',
        created_at: new Date().toISOString(),
        metadata: {
          relatedMemories: [{ memory_id: 'memory1', similarity_score: 0.8 }] as RelatedMemory[],
        },
        pending: false
      },
    ];

    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      messages: mockMessages,
    });

    renderChatInterface();

    expect(screen.getByText('Test message with related memory')).toBeInTheDocument();
  });

  it('shows appropriate privacy status', () => {
    (useSettings as jest.Mock).mockReturnValue({
      settings: {
        privacy_settings: { local_storage_only: true },
        search_settings: { enabled: false },
        voice_settings: { output_enabled: false }
      }
    });

    renderChatInterface();

    expect(screen.getByText('All data stored locally')).toBeInTheDocument();
    expect(screen.getByText('WEB: OFF')).toBeInTheDocument();
  });

  it('loads conversation when conversationId changes', async () => {
    const mockLoadConversation = jest.fn();
    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      loadConversation: mockLoadConversation,
    });

    const { rerender } = render(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={['/chat/123']}>
          <Routes>
            <Route path="/chat/:conversationId?" element={<ChatInterface />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(mockLoadConversation).toHaveBeenCalledWith('123');

    rerender(
      <ThemeProvider theme={lightTheme}>
        <MemoryRouter initialEntries={['/chat/456']}>
          <Routes>
            <Route path="/chat/:conversationId?" element={<ChatInterface />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(mockLoadConversation).toHaveBeenCalledWith('456');
  });

  it('creates new conversation when no conversationId is provided', async () => {
    (useConversation as jest.Mock).mockReturnValue({
      ...mockUseConversation,
      createConversation: jest.fn(),
    });

    renderChatInterface();

    expect(mockUseConversation.createConversation).toHaveBeenCalled();
  });
});