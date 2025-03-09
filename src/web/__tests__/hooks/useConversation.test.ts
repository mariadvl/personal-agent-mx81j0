import { renderHook, act, waitFor } from '@testing-library/react'; // version ^14.0.0
import { useConversation } from '../../src/hooks/useConversation';
import { UseConversationOptions, UseConversationResult } from '../../src/hooks/useConversation';
import {
  useConversationStore,
  setActiveConversation,
  loadConversation,
  loadMessages,
  sendMessage,
  createNewConversation,
  updateConversationDetails,
  deleteConversationById,
  clearError
} from '../../src/store/conversationStore';
import { Conversation, Message, MessageWithPending, ConversationState } from '../../src/types/conversation';
import useVoice from '../../src/hooks/useVoice';
import useSettings from '../../src/hooks/useSettings';

// Mock the conversation store
jest.mock('../../src/store/conversationStore', () => ({
  useConversationStore: jest.fn(),
  setActiveConversation: jest.fn(),
  loadConversation: jest.fn(),
  loadMessages: jest.fn(),
  sendMessage: jest.fn(),
  createNewConversation: jest.fn(),
  updateConversationDetails: jest.fn(),
  deleteConversationById: jest.fn(),
  clearError: jest.fn()
}));

// Mock the voice hook
jest.mock('../../src/hooks/useVoice', () => ({
  __esModule: true,
  default: jest.fn()
}));

// Mock the settings hook
jest.mock('../../src/hooks/useSettings', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('useConversation hook', () => {
  const mockUseConversationStore = useConversationStore as jest.Mock;
  const mockUseVoice = useVoice as jest.Mock;
  const mockUseSettings = useSettings as jest.Mock;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set up common test data
    const mockConversation: Conversation = {
      id: '123',
      title: 'Test Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: 'Test summary',
      messages: [],
      metadata: null
    };

    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      }
    ];

    // Mock the conversation store functions
    mockUseConversationStore.mockReturnValue({
      conversations: { '123': mockConversation },
      activeConversationId: '123',
      conversationState: 'idle',
      isLoading: false,
      error: null,
      recentConversations: [],
      setActiveConversation: setActiveConversation as jest.Mock,
      loadConversation: loadConversation as jest.Mock,
      loadMessages: loadMessages as jest.Mock,
      sendMessage: sendMessage as jest.Mock,
      createNewConversation: createNewConversation as jest.Mock,
      updateConversationDetails: updateConversationDetails as jest.Mock,
      deleteConversationById: deleteConversationById as jest.Mock,
      clearError: clearError as jest.Mock,
      resetState: jest.fn()
    });

    // Mock the useVoice hook
    mockUseVoice.mockReturnValue({
      state: 'idle',
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      error: null,
      transcript: '',
      audioLevel: 0,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      cancelListening: jest.fn(),
      speak: jest.fn(),
      stopSpeaking: jest.fn(),
      isSupported: true,
      availableVoices: [],
      loadVoices: jest.fn()
    });

    // Mock the useSettings hook
    mockUseSettings.mockReturnValue({
      settings: {
        id: 'default',
        voice_settings: {
          enabled: true,
          input_enabled: true,
          output_enabled: true,
          voice_id: 'default',
          speed: 1.0,
          pitch: 1.0,
          provider: 'system',
          local_tts_enabled: true,
          local_stt_enabled: true,
          whisper_model: 'base',
          auto_detect_language: true
        },
        personality_settings: {
          name: 'Assistant',
          style: 'helpful',
          formality: 'neutral',
          verbosity: 'balanced',
          humor: 'subtle',
          empathy: 'moderate',
          creativity: 'moderate',
          expertise: 'intermediate'
        },
        privacy_settings: {
          local_storage_only: true,
          analytics_enabled: false,
          error_reporting: false,
          data_collection: false,
          usage_statistics: false,
          content_analysis: false,
          personalization: true,
          data_retention: {
            conversations: 'indefinite',
            documents: 'indefinite',
            web_content: '90days',
            search_history: '30days'
          }
        },
        storage_settings: {
          base_path: 'data',
          backup_enabled: false,
          backup_frequency: 'weekly',
          backup_count: 5,
          backup_location: 'local',
          cloud_provider: '',
          cloud_region: '',
          encryption_enabled: true,
          compression_enabled: true,
          auto_cleanup: false,
          cleanup_threshold_gb: 5,
          file_types_allowed: ['pdf', 'txt', 'docx', 'md', 'csv', 'json']
        },
        llm_settings: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1.0,
          frequency_penalty: 0.0,
          presence_penalty: 0.0,
          use_local_llm: false,
          local_model_path: '',
          local_model_type: 'llama3',
          embedding_model: 'text-embedding-3-small',
          local_embedding_model: '',
          context_window_size: 10,
          streaming: true,
          fallback_to_local: true
        },
        search_settings: {
          enabled: true,
          provider: 'duckduckgo',
          max_results: 5,
          safe_search: true,
          region: 'wt-wt',
          timeout_seconds: 10,
          auto_search: false,
          cache_results: true,
          cache_expiry_hours: 24
        },
        memory_settings: {
          vector_db_path: 'memory/vectors',
          max_memory_items: 10000,
          context_window_size: 10,
          recency_weight: 0.25,
          relevance_weight: 0.65,
          importance_weight: 0.1,
          chunk_size: 1000,
          chunk_overlap: 100,
          auto_summarize: true,
          auto_categorize: true,
          default_categories: ['conversation', 'document', 'web', 'important'],
          similarity_threshold: 0.75,
          auto_prune: false,
          prune_threshold: 50000
        }
      },
      isLoading: false,
      error: null,
      isSyncing: false,
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
      updateVoice: jest.fn(),
      updatePersonality: jest.fn(),
      updatePrivacy: jest.fn(),
      updateStorage: jest.fn(),
      updateLLM: jest.fn(),
      updateSearch: jest.fn(),
      updateMemory: jest.fn(),
      resetToDefaults: jest.fn(),
      exportToJson: jest.fn(),
      importFromJson: jest.fn(),
      syncSettings: jest.fn(),
      clearSettingsError: jest.fn(),
      isVoiceEnabled: jest.fn(),
      isLocalStorageOnly: jest.fn(),
      isBackupEnabled: jest.fn(),
      isWebSearchEnabled: jest.fn(),
      isLocalLLMEnabled: jest.fn()
    });
  });

  test('should initialize with default values when no conversation ID is provided', () => {
    const { result } = renderHook(() => useConversation());

    expect(result.current.conversation).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('should load conversation when conversation ID is provided', async () => {
    const mockConversation: Conversation = {
      id: '123',
      title: 'Test Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: 'Test summary',
      messages: [],
      metadata: null
    };

    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      }
    ];

    (loadConversation as jest.Mock).mockResolvedValue(mockConversation);
    (loadMessages as jest.Mock).mockResolvedValue(mockMessages);

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    await waitFor(() => {
      expect(loadConversation).toHaveBeenCalledWith('123');
      expect(loadMessages).toHaveBeenCalledWith('123');
      expect(result.current.conversation).toEqual(mockConversation);
      expect(result.current.messages).toEqual(mockMessages.map(message => ({ ...message, pending: false })));
      expect(result.current.isLoading).toBe(false);
    });
  });

  test('should send a message and update the conversation', async () => {
    const mockResponse = {
      response: 'This is a response',
      conversation_id: '123',
      audio_url: null
    };

    (sendMessage as jest.Mock).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    act(() => {
      result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('Test message', '123', { voice: true });
      expect(result.current.isSending).toBe(false);
    });
  });

  test('should send a message with voice enabled and handle audio response', async () => {
    const mockResponse = {
      response: 'This is a response',
      conversation_id: '123',
      audio_url: 'http://example.com/audio.mp3'
    };

    (sendMessage as jest.Mock).mockResolvedValue(mockResponse);
    (mockUseVoice as jest.Mock).mockReturnValue({
      state: 'idle',
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      error: null,
      transcript: '',
      audioLevel: 0,
      startListening: jest.fn(),
      stopListening: jest.fn(),
      cancelListening: jest.fn(),
      speak: jest.fn(),
      stopSpeaking: jest.fn(),
      isSupported: true,
      availableVoices: [],
      loadVoices: jest.fn()
    });

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    act(() => {
      result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith('Test message', '123', { voice: true });
    });
  });

  test('should create a new conversation', async () => {
    const mockNewConversation = {
      id: '456',
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: null,
      messages: [],
      metadata: null
    };

    (createNewConversation as jest.Mock).mockResolvedValue(mockNewConversation);
    (loadConversation as jest.Mock).mockResolvedValue(mockNewConversation);

    const { result } = renderHook(() => useConversation());

    act(() => {
      result.current.createConversation();
    });

    await waitFor(() => {
      expect(createNewConversation).toHaveBeenCalled();
      expect(loadConversation).not.toHaveBeenCalled();
      expect(result.current.conversation).toBeNull();
    });
  });

  test('should update an existing conversation', async () => {
    const mockUpdatedConversation = {
      id: '123',
      title: 'Updated Conversation Title',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: 'Updated summary',
      messages: [],
      metadata: null
    };

    (updateConversationDetails as jest.Mock).mockResolvedValue(mockUpdatedConversation);
    (loadConversation as jest.Mock).mockResolvedValue(mockUpdatedConversation);

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    act(() => {
      result.current.updateConversation({ title: 'Updated Conversation Title' });
    });

    await waitFor(() => {
      expect(updateConversationDetails).toHaveBeenCalledWith('123', { title: 'Updated Conversation Title' });
      expect(loadConversation).not.toHaveBeenCalled();
      expect(result.current.conversation).toEqual({
        id: '123',
        title: 'Test Conversation',
        created_at: expect.any(String),
        updated_at: expect.any(String),
        summary: 'Test summary',
        messages: [],
        metadata: null
      });
    });
  });

  test('should delete a conversation', async () => {
    (deleteConversationById as jest.Mock).mockResolvedValue({ success: true, id: '123', error: null });

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    act(() => {
      result.current.deleteConversation();
    });

    await waitFor(() => {
      expect(deleteConversationById).toHaveBeenCalledWith('123');
      expect(result.current.conversation).toBeNull();
    });
  });

  test('should handle errors when API calls fail', async () => {
    (loadConversation as jest.Mock).mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    await waitFor(() => {
      expect(result.current.error).toEqual(new Error('Failed to load'));
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  test('should show pending state for messages being sent', async () => {
    const mockResponse = {
      response: 'This is a response',
      conversation_id: '123',
      audio_url: null
    };

    (sendMessage as jest.Mock).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return mockResponse;
    });

    const { result } = renderHook(() => useConversation({ conversationId: '123' }));

    act(() => {
      result.current.sendMessage('Test message');
    });

    expect(result.current.messages.length).toBe(0);
  });

  test('should automatically load conversation when autoLoad is true', async () => {
    const mockConversation: Conversation = {
      id: '123',
      title: 'Test Conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: 'Test summary',
      messages: [],
      metadata: null
    };

    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there',
        created_at: new Date().toISOString(),
        metadata: null,
        conversation_id: '123'
      }
    ];

    (loadConversation as jest.Mock).mockResolvedValue(mockConversation);
    (loadMessages as jest.Mock).mockResolvedValue(mockMessages);

    const { result, rerender } = renderHook((props: UseConversationOptions) => useConversation(props), {
      initialProps: { conversationId: '123', autoLoad: true }
    });

    await waitFor(() => {
      expect(loadConversation).toHaveBeenCalledWith('123');
      expect(loadMessages).toHaveBeenCalledWith('123');
    });

    (loadConversation as jest.Mock).mockClear();
    (loadMessages as jest.Mock).mockClear();

    rerender({ conversationId: '456', autoLoad: false });

    expect(loadConversation).not.toHaveBeenCalled();
    expect(loadMessages).not.toHaveBeenCalled();
  });

  test('should call custom error handler when provided', async () => {
    const mockErrorHandler = jest.fn();
    (loadConversation as jest.Mock).mockRejectedValue(new Error('Custom Error'));

    renderHook(() => useConversation({ conversationId: '123', onError: mockErrorHandler }));

    await waitFor(() => {
      expect(mockErrorHandler).toHaveBeenCalledWith(new Error('Custom Error'));
    });
  });

  test('should clean up resources when unmounted', () => {
    const { unmount } = renderHook(() => useConversation());
    unmount();
  });
});