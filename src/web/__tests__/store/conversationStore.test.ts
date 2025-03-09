import { useConversationStore } from '../../src/store/conversationStore';
import {
  Conversation,
  Message,
  ConversationState,
  ConversationMessageResponse
} from '../../src/types/conversation';
import { act } from '@testing-library/react';

// Mock the conversationService
jest.mock('../../src/services/conversationService', () => ({
  sendMessage: jest.fn(),
  getConversation: jest.fn(),
  getConversationMessages: jest.fn(),
  createConversation: jest.fn(),
  updateConversation: jest.fn(),
  deleteConversation: jest.fn(),
  getRecentConversations: jest.fn()
}));

// Import mocked services
import {
  sendMessage,
  getConversation,
  getConversationMessages,
  createConversation,
  updateConversation,
  deleteConversation,
  getRecentConversations
} from '../../src/services/conversationService';

describe('useConversationStore', () => {
  // Test fixtures
  const mockConversation: Conversation = {
    id: 'test-conversation-id',
    title: 'Test Conversation',
    created_at: '2023-06-01T12:00:00Z',
    updated_at: '2023-06-01T12:30:00Z',
    summary: 'Test conversation summary',
    messages: [],
    metadata: null
  };

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello AI',
      created_at: '2023-06-01T12:00:00Z',
      metadata: null
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello! How can I help you today?',
      created_at: '2023-06-01T12:00:05Z',
      metadata: null
    }
  ];

  const mockMessageResponse: ConversationMessageResponse = {
    response: "I'm an AI assistant, how can I help you?",
    conversation_id: 'test-conversation-id',
    audio_url: null
  };

  // Reset store and mocks before each test
  beforeEach(() => {
    useConversationStore.getState().resetState();
    jest.clearAllMocks();
  });

  // Clean up after each test
  afterEach(() => {
    useConversationStore.getState().resetState();
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const state = useConversationStore.getState();
    
    expect(state.conversations).toEqual({});
    expect(state.activeConversationId).toBeNull();
    expect(state.conversationState).toBe('idle');
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.recentConversations).toEqual([]);
  });

  it('should set active conversation', () => {
    const conversationId = 'test-conversation-id';
    
    act(() => {
      useConversationStore.getState().setActiveConversation(conversationId);
    });
    
    expect(useConversationStore.getState().activeConversationId).toBe(conversationId);
  });

  it('should load a conversation', async () => {
    const conversationId = 'test-conversation-id';
    (getConversation as jest.Mock).mockResolvedValue(mockConversation);
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Start loading the conversation
    const loadPromise = state.loadConversation(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the loading to complete
    await act(async () => {
      await loadPromise;
    });
    
    // After loading, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    expect(state.conversations[conversationId]).toEqual(mockConversation);
    expect(state.activeConversationId).toBe(conversationId);
    expect(getConversation).toHaveBeenCalledWith(conversationId);
  });

  it('should handle errors when loading a conversation', async () => {
    const conversationId = 'test-conversation-id';
    const error = new Error('Failed to load conversation');
    (getConversation as jest.Mock).mockRejectedValue(error);
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Start loading the conversation
    const loadPromise = state.loadConversation(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the loading to complete (with error)
    await act(async () => {
      await expect(loadPromise).rejects.toThrow('Failed to load conversation');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    expect(getConversation).toHaveBeenCalledWith(conversationId);
  });

  it('should load conversation messages', async () => {
    const conversationId = 'test-conversation-id';
    (getConversationMessages as jest.Mock).mockResolvedValue(mockMessages);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: { ...mockConversation, messages: null }
        }
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Start loading the messages
    const loadPromise = state.loadMessages(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the loading to complete
    await act(async () => {
      await loadPromise;
    });
    
    // After loading, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    expect(state.conversations[conversationId].messages).toEqual(mockMessages);
    expect(getConversationMessages).toHaveBeenCalledWith(conversationId);
  });

  it('should handle errors when loading messages', async () => {
    const conversationId = 'test-conversation-id';
    const error = new Error('Failed to load messages');
    (getConversationMessages as jest.Mock).mockRejectedValue(error);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: { ...mockConversation, messages: null }
        }
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Start loading the messages
    const loadPromise = state.loadMessages(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the loading to complete (with error)
    await act(async () => {
      await expect(loadPromise).rejects.toThrow('Failed to load messages');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    expect(getConversationMessages).toHaveBeenCalledWith(conversationId);
  });

  it('should send a message and handle the response', async () => {
    const conversationId = 'test-conversation-id';
    const testMessage = 'Hello, AI!';
    
    (sendMessage as jest.Mock).mockResolvedValue(mockMessageResponse);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: { ...mockConversation, messages: [] }
        },
        activeConversationId: conversationId
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Send the message
    const sendPromise = state.sendMessage(testMessage, conversationId);
    
    // State should be 'sending' while the message is being sent
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('sending');
    
    // Wait for the sending to complete
    await act(async () => {
      await sendPromise;
    });
    
    // After sending, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    
    // Check that the messages were added to the conversation
    const conversation = state.conversations[conversationId];
    expect(conversation.messages?.length).toBe(2);
    expect(conversation.messages?.[0].role).toBe('user');
    expect(conversation.messages?.[0].content).toBe(testMessage);
    expect(conversation.messages?.[1].role).toBe('assistant');
    expect(conversation.messages?.[1].content).toBe(mockMessageResponse.response);
    
    // Check that the API was called with the correct parameters
    expect(sendMessage).toHaveBeenCalledWith({
      message: testMessage,
      conversation_id: conversationId,
      voice: false
    });
  });

  it('should handle errors when sending a message', async () => {
    const conversationId = 'test-conversation-id';
    const testMessage = 'Hello, AI!';
    const error = new Error('Failed to send message');
    
    (sendMessage as jest.Mock).mockRejectedValue(error);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: { ...mockConversation, messages: [] }
        },
        activeConversationId: conversationId
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Send the message
    const sendPromise = state.sendMessage(testMessage, conversationId);
    
    // State should be 'sending' while the message is being sent
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('sending');
    
    // Wait for the sending to complete (with error)
    await act(async () => {
      await expect(sendPromise).rejects.toThrow('Failed to send message');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    
    // Check that the API was called with the correct parameters
    expect(sendMessage).toHaveBeenCalledWith({
      message: testMessage,
      conversation_id: conversationId,
      voice: false
    });
  });

  it('should create a new conversation', async () => {
    const newConversation = { ...mockConversation, id: 'new-conversation-id' };
    (createConversation as jest.Mock).mockResolvedValue(newConversation);
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Create a new conversation
    const createPromise = state.createNewConversation({
      title: 'New Conversation',
      metadata: { custom: 'data' }
    });
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the creation to complete
    await act(async () => {
      await createPromise;
    });
    
    // After creation, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    expect(state.conversations['new-conversation-id']).toEqual(newConversation);
    expect(state.activeConversationId).toBe('new-conversation-id');
    
    // Check that the API was called with the correct parameters
    expect(createConversation).toHaveBeenCalledWith({
      title: 'New Conversation',
      metadata: { custom: 'data' }
    });
  });

  it('should handle errors when creating a conversation', async () => {
    const error = new Error('Failed to create conversation');
    (createConversation as jest.Mock).mockRejectedValue(error);
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Create a new conversation
    const createPromise = state.createNewConversation({
      title: 'New Conversation',
      metadata: { custom: 'data' }
    });
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the creation to complete (with error)
    await act(async () => {
      await expect(createPromise).rejects.toThrow('Failed to create conversation');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    
    // Check that the API was called with the correct parameters
    expect(createConversation).toHaveBeenCalledWith({
      title: 'New Conversation',
      metadata: { custom: 'data' }
    });
  });

  it('should update conversation details', async () => {
    const conversationId = 'test-conversation-id';
    const updatedConversation = {
      ...mockConversation,
      title: 'Updated Title',
      summary: 'Updated summary'
    };
    
    (updateConversation as jest.Mock).mockResolvedValue(updatedConversation);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: mockConversation
        }
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Update the conversation
    const updatePromise = state.updateConversationDetails(conversationId, {
      title: 'Updated Title',
      summary: 'Updated summary'
    });
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the update to complete
    await act(async () => {
      await updatePromise;
    });
    
    // After update, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    expect(state.conversations[conversationId]).toEqual(updatedConversation);
    
    // Check that the API was called with the correct parameters
    expect(updateConversation).toHaveBeenCalledWith(conversationId, {
      title: 'Updated Title',
      summary: 'Updated summary'
    });
  });

  it('should handle errors when updating a conversation', async () => {
    const conversationId = 'test-conversation-id';
    const error = new Error('Failed to update conversation');
    
    (updateConversation as jest.Mock).mockRejectedValue(error);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: mockConversation
        }
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Update the conversation
    const updatePromise = state.updateConversationDetails(conversationId, {
      title: 'Updated Title'
    });
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the update to complete (with error)
    await act(async () => {
      await expect(updatePromise).rejects.toThrow('Failed to update conversation');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    
    // Check that the API was called with the correct parameters
    expect(updateConversation).toHaveBeenCalledWith(conversationId, {
      title: 'Updated Title'
    });
  });

  it('should delete a conversation', async () => {
    const conversationId = 'test-conversation-id';
    const deleteResponse = { success: true, id: conversationId, error: null };
    
    (deleteConversation as jest.Mock).mockResolvedValue(deleteResponse);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: mockConversation
        },
        activeConversationId: conversationId
      });
    });
    
    let state = useConversationStore.getState();
    
    // Verify the conversation exists before deletion
    expect(state.conversations[conversationId]).toBeDefined();
    expect(state.activeConversationId).toBe(conversationId);
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Delete the conversation
    const deletePromise = state.deleteConversationById(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the deletion to complete
    await act(async () => {
      await deletePromise;
    });
    
    // After deletion, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('idle');
    expect(state.conversations[conversationId]).toBeUndefined();
    expect(state.activeConversationId).toBeNull();
    
    // Check that the API was called with the correct parameters
    expect(deleteConversation).toHaveBeenCalledWith(conversationId);
  });

  it('should handle errors when deleting a conversation', async () => {
    const conversationId = 'test-conversation-id';
    const error = new Error('Failed to delete conversation');
    
    (deleteConversation as jest.Mock).mockRejectedValue(error);
    
    // Set up a conversation in the store for the test
    act(() => {
      useConversationStore.setState({
        conversations: {
          [conversationId]: mockConversation
        },
        activeConversationId: conversationId
      });
    });
    
    let state = useConversationStore.getState();
    
    // Initial conversationState should be 'idle'
    expect(state.conversationState).toBe('idle');
    
    // Delete the conversation
    const deletePromise = state.deleteConversationById(conversationId);
    
    // State should be 'loading' while the API call is in progress
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('loading');
    
    // Wait for the deletion to complete (with error)
    await act(async () => {
      await expect(deletePromise).rejects.toThrow('Failed to delete conversation');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.conversationState).toBe('error');
    expect(state.error).toEqual(error);
    
    // Conversation should still exist in the store
    expect(state.conversations[conversationId]).toBeDefined();
    expect(state.activeConversationId).toBe(conversationId);
    
    // Check that the API was called with the correct parameters
    expect(deleteConversation).toHaveBeenCalledWith(conversationId);
  });

  it('should load recent conversations', async () => {
    const recentConversations = [mockConversation];
    (getRecentConversations as jest.Mock).mockResolvedValue(recentConversations);
    
    let state = useConversationStore.getState();
    
    // Initial state
    expect(state.isLoading).toBe(false);
    expect(state.recentConversations).toEqual([]);
    
    // Load recent conversations
    const loadPromise = state.loadRecentConversations({ limit: 5 });
    
    // State should be loading
    state = useConversationStore.getState();
    expect(state.isLoading).toBe(true);
    
    // Wait for loading to complete
    await act(async () => {
      await loadPromise;
    });
    
    // After loading, state should be updated
    state = useConversationStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.recentConversations).toEqual(recentConversations);
    expect(state.conversations[mockConversation.id]).toEqual(mockConversation);
    
    // Check that the API was called with the correct parameters
    expect(getRecentConversations).toHaveBeenCalledWith(5);
  });

  it('should handle errors when loading recent conversations', async () => {
    const error = new Error('Failed to load recent conversations');
    (getRecentConversations as jest.Mock).mockRejectedValue(error);
    
    let state = useConversationStore.getState();
    
    // Initial state
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
    
    // Load recent conversations
    const loadPromise = state.loadRecentConversations({ limit: 5 });
    
    // State should be loading
    state = useConversationStore.getState();
    expect(state.isLoading).toBe(true);
    
    // Wait for loading to complete (with error)
    await act(async () => {
      await expect(loadPromise).rejects.toThrow('Failed to load recent conversations');
    });
    
    // After error, state should be updated
    state = useConversationStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toEqual(error);
    
    // Check that the API was called with the correct parameters
    expect(getRecentConversations).toHaveBeenCalledWith(5);
  });

  it('should clear error state', () => {
    const error = new Error('Test error');
    
    // Set an error in the store
    act(() => {
      useConversationStore.setState({
        error
      });
    });
    
    // Verify the error is set
    expect(useConversationStore.getState().error).toEqual(error);
    
    // Clear the error
    act(() => {
      useConversationStore.getState().clearError();
    });
    
    // Verify the error is cleared
    expect(useConversationStore.getState().error).toBeNull();
  });

  it('should reset state to initial values', () => {
    // Setup test data in the store
    act(() => {
      useConversationStore.setState({
        conversations: {
          'test-id': mockConversation
        },
        activeConversationId: 'test-id',
        conversationState: 'loading',
        error: new Error('Test error'),
        isLoading: true,
        recentConversations: [mockConversation]
      });
    });
    
    // Verify the state is set
    const state = useConversationStore.getState();
    expect(state.conversations).toHaveProperty('test-id');
    expect(state.activeConversationId).toBe('test-id');
    expect(state.conversationState).toBe('loading');
    expect(state.error).not.toBeNull();
    expect(state.isLoading).toBe(true);
    expect(state.recentConversations.length).toBe(1);
    
    // Reset the state
    act(() => {
      state.resetState();
    });
    
    // Verify the state is reset
    const resetState = useConversationStore.getState();
    expect(resetState.conversations).toEqual({});
    expect(resetState.activeConversationId).toBeNull();
    expect(resetState.conversationState).toBe('idle');
    expect(resetState.error).toBeNull();
    expect(resetState.isLoading).toBe(false);
    expect(resetState.recentConversations).toEqual([]);
  });
});