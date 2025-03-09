/**
 * Types and interfaces for conversation-related data structures.
 * Used throughout the frontend for type safety when working with conversations,
 * messages, and related API requests/responses.
 */

/**
 * Type representing the possible roles in a conversation.
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Interface representing a message in a conversation.
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender (user, assistant, system) */
  role: MessageRole;
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created */
  created_at: string;
  /** Optional metadata associated with the message */
  metadata: Record<string, any> | null;
}

/**
 * Interface representing a conversation between user and AI.
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;
  /** Title or subject of the conversation */
  title: string;
  /** Timestamp when the conversation was created */
  created_at: string;
  /** Timestamp when the conversation was last updated */
  updated_at: string;
  /** Optional summary of the conversation */
  summary: string | null;
  /** Messages in the conversation (may be null if not loaded) */
  messages: Message[] | null;
  /** Optional metadata associated with the conversation */
  metadata: Record<string, any> | null;
}

/**
 * Type representing the possible states of a conversation.
 */
export type ConversationState = 'idle' | 'loading' | 'sending' | 'receiving' | 'error';

/**
 * Interface for sending a message in a conversation.
 */
export interface ConversationMessageRequest {
  /** Message content to send */
  message: string;
  /** ID of the conversation (null for new conversation) */
  conversation_id: string | null;
  /** Whether to enable voice for this message */
  voice: boolean;
}

/**
 * Interface for responses to conversation messages.
 */
export interface ConversationMessageResponse {
  /** Response message from the AI */
  response: string;
  /** ID of the conversation */
  conversation_id: string;
  /** URL to audio response (if voice was enabled) */
  audio_url: string | null;
}

/**
 * Interface for creating a new conversation.
 */
export interface ConversationCreate {
  /** Optional title for the new conversation */
  title: string | null;
  /** Optional metadata for the conversation */
  metadata: Record<string, any> | null;
}

/**
 * Interface for paginated conversation list responses.
 */
export interface ConversationListResponse {
  /** Array of conversations */
  conversations: Conversation[];
  /** Total number of conversations available */
  total: number;
  /** Limit used for pagination */
  limit: number;
  /** Offset used for pagination */
  offset: number;
}

/**
 * Interface for conversation deletion responses.
 */
export interface ConversationDeleteResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** ID of the deleted conversation */
  id: string;
  /** Error message if operation failed */
  error: string | null;
}

/**
 * Interface for filtering conversations in list requests.
 */
export interface ConversationFilter {
  /** Maximum number of conversations to return */
  limit: number | null;
  /** Number of conversations to skip */
  offset: number | null;
  /** Field to sort by */
  sort_by: string | null;
  /** Sort direction */
  sort_direction: 'asc' | 'desc' | null;
  /** Search term to filter conversations */
  search: string | null;
  /** Filter by conversations created after this date */
  from_date: string | null;
  /** Filter by conversations created before this date */
  to_date: string | null;
}

/**
 * Interface for conversation summary responses.
 */
export interface ConversationSummaryResponse {
  /** ID of the conversation */
  id: string;
  /** Generated summary text */
  summary: string;
  /** Timestamp when the summary was generated */
  generated_at: string;
}

/**
 * Interface for the conversation store state and actions.
 */
export interface ConversationStore {
  /** Record of conversations by ID */
  conversations: Record<string, Conversation>;
  /** ID of the currently active conversation */
  activeConversationId: string | null;
  /** Current state of the conversation */
  conversationState: ConversationState;
  /** Any error that occurred */
  error: Error | null;
  /** Whether conversations are being loaded */
  isLoading: boolean;
  /** List of recent conversations */
  recentConversations: Conversation[];
  
  /** Sets the active conversation */
  setActiveConversation: (id: string | null) => void;
  /** Loads a conversation by ID */
  loadConversation: (id: string) => Promise<Conversation>;
  /** Loads messages for a conversation */
  loadMessages: (conversationId: string) => Promise<Message[]>;
  /** Sends a message in a conversation */
  sendMessage: (message: string, conversationId?: string, options?: { voice?: boolean }) => Promise<ConversationMessageResponse>;
  /** Creates a new conversation */
  createNewConversation: (data?: ConversationCreate) => Promise<Conversation>;
  /** Updates conversation details */
  updateConversationDetails: (id: string, updates: Partial<Conversation>) => Promise<Conversation>;
  /** Deletes a conversation by ID */
  deleteConversationById: (id: string) => Promise<ConversationDeleteResponse>;
  /** Loads recent conversations */
  loadRecentConversations: (filters?: ConversationFilter) => Promise<Conversation[]>;
  /** Clears any error state */
  clearError: () => void;
  /** Resets the conversation state */
  resetState: () => void;
}

/**
 * Extended Message interface with pending status for UI rendering.
 */
export interface MessageWithPending extends Message {
  /** Whether the message is pending (sending/receiving) */
  pending: boolean;
}