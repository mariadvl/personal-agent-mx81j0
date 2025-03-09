import jest from 'jest';
import { 
  sendMessage, 
  getConversation, 
  getConversationMessages, 
  createConversation, 
  updateConversation, 
  deleteConversation, 
  listConversations, 
  getRecentConversations, 
  summarizeConversation 
} from '../../src/services/conversationService';
import { 
  get, 
  post, 
  put, 
  delete as deleteRequest 
} from '../../src/services/api';
import { API_ROUTES } from '../../src/constants/apiRoutes';
import { 
  Conversation, 
  Message, 
  ConversationMessageRequest, 
  ConversationMessageResponse,
  ConversationFilter,
  ConversationListResponse,
  ConversationDeleteResponse,
  ConversationSummaryResponse
} from '../../src/types/conversation';

// Mock the API service functions
jest.mock('../../src/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

describe('sendMessage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a message with conversation ID correctly', async () => {
    // Mock data
    const request: ConversationMessageRequest = {
      message: 'Hello AI',
      conversation_id: '123',
      voice: false
    };
    
    const mockResponse: ConversationMessageResponse = {
      response: 'Hello human',
      conversation_id: '123',
      audio_url: null
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await sendMessage(request);
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, request);
    expect(result).toEqual(mockResponse);
  });

  it('should send a message without conversation ID correctly', async () => {
    // Mock data
    const request: ConversationMessageRequest = {
      message: 'Hello AI',
      conversation_id: null,
      voice: false
    };
    
    const mockResponse: ConversationMessageResponse = {
      response: 'Hello human',
      conversation_id: '456', // Server generates a new ID
      audio_url: null
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await sendMessage(request);
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, request);
    expect(result).toEqual(mockResponse);
  });

  it('should send a message with voice flag correctly', async () => {
    // Mock data
    const request: ConversationMessageRequest = {
      message: 'Hello AI',
      conversation_id: '123',
      voice: true
    };
    
    const mockResponse: ConversationMessageResponse = {
      response: 'Hello human',
      conversation_id: '123',
      audio_url: 'https://example.com/audio.mp3'
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await sendMessage(request);
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, request);
    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const request: ConversationMessageRequest = {
      message: 'Hello AI',
      conversation_id: '123',
      voice: false
    };
    
    // Mock the post function to return an error
    (post as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Server error'
    });
    
    // Call the function and expect it to throw
    await expect(sendMessage(request)).rejects.toThrow('Server error');
    
    // Verify the post function was called correctly
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, request);
  });
});

describe('getConversation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve a conversation by ID correctly', async () => {
    // Mock data
    const conversationId = '123';
    const mockConversation: Conversation = {
      id: conversationId,
      title: 'Test Conversation',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:05:00Z',
      summary: 'A test conversation',
      messages: null,
      metadata: null
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function
    const result = await getConversation(conversationId);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.GET_BY_ID.replace('{id}', conversationId);
    expect(get).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual(mockConversation);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const conversationId = '123';
    
    // Mock the get function to return an error
    (get as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Conversation not found'
    });
    
    // Call the function and expect it to throw
    await expect(getConversation(conversationId)).rejects.toThrow(`Failed to retrieve conversation with ID: ${conversationId}`);
    
    // Verify the get function was called correctly
    const expectedUrl = API_ROUTES.CONVERSATION.GET_BY_ID.replace('{id}', conversationId);
    expect(get).toHaveBeenCalledWith(expectedUrl);
  });
});

describe('getConversationMessages', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve messages for a conversation correctly', async () => {
    // Mock data
    const conversationId = '123';
    const mockMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello AI',
        created_at: '2023-06-10T12:00:00Z',
        metadata: null
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hello human',
        created_at: '2023-06-10T12:01:00Z',
        metadata: null
      }
    ];
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockMessages,
      error: null
    });
    
    // Call the function
    const result = await getConversationMessages(conversationId);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.GET_MESSAGES.replace('{id}', conversationId);
    expect(get).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual(mockMessages);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const conversationId = '123';
    
    // Mock the get function to return an error
    (get as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Messages not found'
    });
    
    // Call the function and expect it to throw
    await expect(getConversationMessages(conversationId)).rejects.toThrow(`Failed to retrieve messages for conversation with ID: ${conversationId}`);
    
    // Verify the get function was called correctly
    const expectedUrl = API_ROUTES.CONVERSATION.GET_MESSAGES.replace('{id}', conversationId);
    expect(get).toHaveBeenCalledWith(expectedUrl);
  });
});

describe('createConversation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a conversation with title correctly', async () => {
    // Mock data
    const conversationData = {
      title: 'New Conversation',
      metadata: null
    };
    
    const mockConversation: Conversation = {
      id: '123',
      title: 'New Conversation',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:00:00Z',
      summary: null,
      messages: null,
      metadata: null
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function
    const result = await createConversation(conversationData);
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, conversationData);
    expect(result).toEqual(mockConversation);
  });

  it('should create a conversation with metadata correctly', async () => {
    // Mock data
    const conversationData = {
      title: null,
      metadata: { source: 'web', topic: 'AI' }
    };
    
    const mockConversation: Conversation = {
      id: '123',
      title: '',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:00:00Z',
      summary: null,
      messages: null,
      metadata: { source: 'web', topic: 'AI' }
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function
    const result = await createConversation(conversationData);
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, conversationData);
    expect(result).toEqual(mockConversation);
  });

  it('should create a conversation without title or metadata correctly', async () => {
    // Mock data
    const mockConversation: Conversation = {
      id: '123',
      title: '',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:00:00Z',
      summary: null,
      messages: null,
      metadata: null
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function without arguments
    const result = await createConversation();
    
    // Assertions
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {});
    expect(result).toEqual(mockConversation);
  });

  it('should handle API errors correctly', async () => {
    // Mock the post function to return an error
    (post as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to create conversation'
    });
    
    // Call the function and expect it to throw
    await expect(createConversation()).rejects.toThrow('Failed to create conversation');
    
    // Verify the post function was called correctly
    expect(post).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {});
  });
});

describe('updateConversation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update a conversation title correctly', async () => {
    // Mock data
    const conversationId = '123';
    const updates = {
      title: 'Updated Title'
    };
    
    const mockConversation: Conversation = {
      id: conversationId,
      title: 'Updated Title',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:10:00Z',
      summary: null,
      messages: null,
      metadata: null
    };
    
    // Mock the put function to return success
    (put as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function
    const result = await updateConversation(conversationId, updates);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.UPDATE.replace('{id}', conversationId);
    expect(put).toHaveBeenCalledWith(expectedUrl, updates);
    expect(result).toEqual(mockConversation);
  });

  it('should update conversation metadata correctly', async () => {
    // Mock data
    const conversationId = '123';
    const updates = {
      metadata: { importance: 'high', category: 'work' }
    };
    
    const mockConversation: Conversation = {
      id: conversationId,
      title: 'Test Conversation',
      created_at: '2023-06-10T12:00:00Z',
      updated_at: '2023-06-10T12:10:00Z',
      summary: null,
      messages: null,
      metadata: { importance: 'high', category: 'work' }
    };
    
    // Mock the put function to return success
    (put as jest.Mock).mockResolvedValue({
      success: true,
      data: mockConversation,
      error: null
    });
    
    // Call the function
    const result = await updateConversation(conversationId, updates);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.UPDATE.replace('{id}', conversationId);
    expect(put).toHaveBeenCalledWith(expectedUrl, updates);
    expect(result).toEqual(mockConversation);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const conversationId = '123';
    const updates = {
      title: 'Updated Title'
    };
    
    // Mock the put function to return an error
    (put as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Conversation not found'
    });
    
    // Call the function and expect it to throw
    await expect(updateConversation(conversationId, updates)).rejects.toThrow(`Failed to update conversation with ID: ${conversationId}`);
    
    // Verify the put function was called correctly
    const expectedUrl = API_ROUTES.CONVERSATION.UPDATE.replace('{id}', conversationId);
    expect(put).toHaveBeenCalledWith(expectedUrl, updates);
  });
});

describe('deleteConversation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a conversation correctly', async () => {
    // Mock data
    const conversationId = '123';
    const mockResponse: ConversationDeleteResponse = {
      success: true,
      id: conversationId,
      error: null
    };
    
    // Mock the delete function to return success
    (deleteRequest as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await deleteConversation(conversationId);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.DELETE.replace('{id}', conversationId);
    expect(deleteRequest).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const conversationId = '123';
    
    // Mock the delete function to return an error
    (deleteRequest as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Conversation not found'
    });
    
    // Call the function and expect it to throw
    await expect(deleteConversation(conversationId)).rejects.toThrow(`Failed to delete conversation with ID: ${conversationId}`);
    
    // Verify the delete function was called correctly
    const expectedUrl = API_ROUTES.CONVERSATION.DELETE.replace('{id}', conversationId);
    expect(deleteRequest).toHaveBeenCalledWith(expectedUrl);
  });
});

describe('listConversations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should list conversations with default parameters correctly', async () => {
    // Mock data
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '123',
          title: 'Conversation 1',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        },
        {
          id: '456',
          title: 'Conversation 2',
          created_at: '2023-06-11T12:00:00Z',
          updated_at: '2023-06-11T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 2,
      limit: 10,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function without filter
    const result = await listConversations();
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {});
    expect(result).toEqual(mockResponse);
  });

  it('should list conversations with limit and offset correctly', async () => {
    // Mock data
    const filter: ConversationFilter = {
      limit: 5,
      offset: 10,
      sort_by: null,
      sort_direction: null,
      search: null,
      from_date: null,
      to_date: null
    };
    
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '789',
          title: 'Conversation 3',
          created_at: '2023-06-12T12:00:00Z',
          updated_at: '2023-06-12T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 15,
      limit: 5,
      offset: 10
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function with filter
    const result = await listConversations(filter);
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      limit: 5,
      offset: 10
    });
    expect(result).toEqual(mockResponse);
  });

  it('should list conversations with sorting correctly', async () => {
    // Mock data
    const filter: ConversationFilter = {
      limit: null,
      offset: null,
      sort_by: 'created_at',
      sort_direction: 'desc',
      search: null,
      from_date: null,
      to_date: null
    };
    
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '789',
          title: 'Conversation 3',
          created_at: '2023-06-12T12:00:00Z',
          updated_at: '2023-06-12T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        },
        {
          id: '456',
          title: 'Conversation 2',
          created_at: '2023-06-11T12:00:00Z',
          updated_at: '2023-06-11T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 3,
      limit: 10,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function with filter
    const result = await listConversations(filter);
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      sort_by: 'created_at',
      sort_direction: 'desc'
    });
    expect(result).toEqual(mockResponse);
  });

  it('should list conversations with search query correctly', async () => {
    // Mock data
    const filter: ConversationFilter = {
      limit: null,
      offset: null,
      sort_by: null,
      sort_direction: null,
      search: 'test query',
      from_date: null,
      to_date: null
    };
    
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '123',
          title: 'Test Query Results',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 1,
      limit: 10,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function with filter
    const result = await listConversations(filter);
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      search: 'test query'
    });
    expect(result).toEqual(mockResponse);
  });

  it('should list conversations with date filters correctly', async () => {
    // Mock data
    const filter: ConversationFilter = {
      limit: null,
      offset: null,
      sort_by: null,
      sort_direction: null,
      search: null,
      from_date: '2023-06-01',
      to_date: '2023-06-30'
    };
    
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '123',
          title: 'Conversation 1',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        },
        {
          id: '456',
          title: 'Conversation 2',
          created_at: '2023-06-11T12:00:00Z',
          updated_at: '2023-06-11T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 2,
      limit: 10,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function with filter
    const result = await listConversations(filter);
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      from_date: '2023-06-01',
      to_date: '2023-06-30'
    });
    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors correctly', async () => {
    // Mock the get function to return an error
    (get as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to retrieve conversations'
    });
    
    // Call the function and expect it to throw
    await expect(listConversations()).rejects.toThrow('Failed to retrieve conversations');
    
    // Verify the get function was called correctly
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {});
  });
});

describe('getRecentConversations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve recent conversations with default limit correctly', async () => {
    // Mock data
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '123',
          title: 'Conversation 1',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        },
        {
          id: '456',
          title: 'Conversation 2',
          created_at: '2023-06-11T12:00:00Z',
          updated_at: '2023-06-11T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 2,
      limit: 10,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await getRecentConversations();
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      limit: 10,
      offset: 0,
      sort_by: 'updated_at',
      sort_direction: 'desc'
    });
    expect(result).toEqual(mockResponse.conversations);
  });

  it('should retrieve recent conversations with custom limit correctly', async () => {
    // Mock data
    const customLimit = 5;
    const mockResponse: ConversationListResponse = {
      conversations: [
        {
          id: '123',
          title: 'Conversation 1',
          created_at: '2023-06-10T12:00:00Z',
          updated_at: '2023-06-10T12:05:00Z',
          summary: null,
          messages: null,
          metadata: null
        }
      ],
      total: 1,
      limit: customLimit,
      offset: 0
    };
    
    // Mock the get function to return success
    (get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function with custom limit
    const result = await getRecentConversations(customLimit);
    
    // Assertions
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      limit: customLimit,
      offset: 0,
      sort_by: 'updated_at',
      sort_direction: 'desc'
    });
    expect(result).toEqual(mockResponse.conversations);
  });

  it('should handle API errors correctly', async () => {
    // Mock the get function to return an error
    (get as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to retrieve conversations'
    });
    
    // Call the function and expect it to throw
    await expect(getRecentConversations()).rejects.toThrow('Failed to retrieve conversations');
    
    // Verify the get function was called correctly
    expect(get).toHaveBeenCalledWith(API_ROUTES.CONVERSATION.BASE, {
      limit: 10,
      offset: 0,
      sort_by: 'updated_at',
      sort_direction: 'desc'
    });
  });
});

describe('summarizeConversation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should summarize a conversation correctly', async () => {
    // Mock data
    const conversationId = '123';
    const mockResponse: ConversationSummaryResponse = {
      id: conversationId,
      summary: 'This is a summary of the conversation about AI technology.',
      generated_at: '2023-06-10T12:10:00Z'
    };
    
    // Mock the post function to return success
    (post as jest.Mock).mockResolvedValue({
      success: true,
      data: mockResponse,
      error: null
    });
    
    // Call the function
    const result = await summarizeConversation(conversationId);
    
    // Assertions
    const expectedUrl = API_ROUTES.CONVERSATION.SUMMARIZE.replace('{id}', conversationId);
    expect(post).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual(mockResponse);
  });

  it('should handle API errors correctly', async () => {
    // Mock data
    const conversationId = '123';
    
    // Mock the post function to return an error
    (post as jest.Mock).mockResolvedValue({
      success: false,
      data: null,
      error: 'Failed to summarize conversation'
    });
    
    // Call the function and expect it to throw
    await expect(summarizeConversation(conversationId)).rejects.toThrow(`Failed to summarize conversation with ID: ${conversationId}`);
    
    // Verify the post function was called correctly
    const expectedUrl = API_ROUTES.CONVERSATION.SUMMARIZE.replace('{id}', conversationId);
    expect(post).toHaveBeenCalledWith(expectedUrl);
  });
});