/**
 * Conversation Service
 * 
 * This service handles all conversation-related API interactions for the Personal AI Agent.
 * It provides methods for creating, retrieving, updating, and deleting conversations,
 * as well as sending and receiving messages with the AI agent.
 */

import { API_ROUTES } from '../constants/apiRoutes';
import {
  Conversation,
  Message,
  ConversationMessageRequest,
  ConversationMessageResponse,
  ConversationCreate,
  ConversationListResponse,
  ConversationDeleteResponse,
  ConversationFilter,
  ConversationSummaryResponse
} from '../types/conversation';
import { get, post, put, delete as deleteRequest } from '../services/api';

/**
 * Sends a message to the AI agent and returns the response
 * @param request - The message request containing the message, conversation ID, and voice flag
 * @returns Promise resolving to the AI response
 */
export async function sendMessage(
  request: ConversationMessageRequest
): Promise<ConversationMessageResponse> {
  const response = await post<ConversationMessageResponse>(
    API_ROUTES.CONVERSATION.BASE,
    request
  );
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to get response from AI');
  }
  
  return response.data;
}

/**
 * Retrieves a specific conversation by ID
 * @param conversationId - The ID of the conversation to retrieve
 * @returns Promise resolving to the conversation data
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const url = API_ROUTES.CONVERSATION.GET_BY_ID.replace('{id}', conversationId);
  const response = await get<Conversation>(url);
  
  if (!response.success) {
    throw new Error(response.error || `Failed to retrieve conversation with ID: ${conversationId}`);
  }
  
  return response.data;
}

/**
 * Retrieves messages for a specific conversation
 * @param conversationId - The ID of the conversation to retrieve messages for
 * @returns Promise resolving to an array of messages
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const url = API_ROUTES.CONVERSATION.GET_MESSAGES.replace('{id}', conversationId);
  const response = await get<Message[]>(url);
  
  if (!response.success) {
    throw new Error(response.error || `Failed to retrieve messages for conversation with ID: ${conversationId}`);
  }
  
  return response.data;
}

/**
 * Creates a new conversation
 * @param data - The conversation creation data containing optional title and metadata
 * @returns Promise resolving to the created conversation
 */
export async function createConversation(data?: ConversationCreate): Promise<Conversation> {
  const response = await post<Conversation>(
    API_ROUTES.CONVERSATION.BASE,
    data || {}
  );
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to create conversation');
  }
  
  return response.data;
}

/**
 * Updates an existing conversation
 * @param conversationId - The ID of the conversation to update
 * @param updates - The updates to apply to the conversation
 * @returns Promise resolving to the updated conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: Partial<Conversation>
): Promise<Conversation> {
  const url = API_ROUTES.CONVERSATION.UPDATE.replace('{id}', conversationId);
  const response = await put<Conversation>(url, updates);
  
  if (!response.success) {
    throw new Error(response.error || `Failed to update conversation with ID: ${conversationId}`);
  }
  
  return response.data;
}

/**
 * Deletes a conversation
 * @param conversationId - The ID of the conversation to delete
 * @returns Promise resolving to the deletion response
 */
export async function deleteConversation(
  conversationId: string
): Promise<ConversationDeleteResponse> {
  const url = API_ROUTES.CONVERSATION.DELETE.replace('{id}', conversationId);
  const response = await deleteRequest<ConversationDeleteResponse>(url);
  
  if (!response.success) {
    throw new Error(response.error || `Failed to delete conversation with ID: ${conversationId}`);
  }
  
  return response.data;
}

/**
 * Retrieves a list of conversations with optional filtering
 * @param filter - Optional filter parameters for conversations
 * @returns Promise resolving to the paginated conversation list
 */
export async function listConversations(
  filter?: ConversationFilter
): Promise<ConversationListResponse> {
  // Convert filter object to query parameters
  const params: Record<string, any> = {};
  if (filter) {
    if (filter.limit !== null && filter.limit !== undefined) params.limit = filter.limit;
    if (filter.offset !== null && filter.offset !== undefined) params.offset = filter.offset;
    if (filter.sort_by !== null && filter.sort_by !== undefined) params.sort_by = filter.sort_by;
    if (filter.sort_direction !== null && filter.sort_direction !== undefined) params.sort_direction = filter.sort_direction;
    if (filter.search !== null && filter.search !== undefined) params.search = filter.search;
    if (filter.from_date !== null && filter.from_date !== undefined) params.from_date = filter.from_date;
    if (filter.to_date !== null && filter.to_date !== undefined) params.to_date = filter.to_date;
  }
  
  const response = await get<ConversationListResponse>(
    API_ROUTES.CONVERSATION.BASE,
    params
  );
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to retrieve conversations');
  }
  
  return response.data;
}

/**
 * Retrieves a list of recent conversations
 * @param limit - The maximum number of conversations to retrieve
 * @returns Promise resolving to an array of recent conversations
 */
export async function getRecentConversations(
  limit: number = 10
): Promise<Conversation[]> {
  const filter: ConversationFilter = {
    limit,
    offset: 0,
    sort_by: 'updated_at',
    sort_direction: 'desc',
    search: null,
    from_date: null,
    to_date: null
  };
  
  const response = await listConversations(filter);
  return response.conversations;
}

/**
 * Generates or retrieves a summary for a conversation
 * @param conversationId - The ID of the conversation to summarize
 * @returns Promise resolving to the conversation summary
 */
export async function summarizeConversation(
  conversationId: string
): Promise<ConversationSummaryResponse> {
  const url = API_ROUTES.CONVERSATION.SUMMARIZE.replace('{id}', conversationId);
  const response = await post<ConversationSummaryResponse>(url);
  
  if (!response.success) {
    throw new Error(response.error || `Failed to summarize conversation with ID: ${conversationId}`);
  }
  
  return response.data;
}