import { useState, useEffect, useCallback, useRef } from 'react'; // react version ^18.2.0
import {
  useConversationStore,
} from '../store/conversationStore';
import {
  Conversation,
  Message,
  ConversationState,
  MessageWithPending,
} from '../types/conversation';
import useVoice from './useVoice';
import useSettings from './useSettings';

/**
 * Interface for conversation hook options
 */
export interface UseConversationOptions {
  conversationId?: string | null;
  autoLoad?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Interface for conversation hook result
 */
export interface UseConversationResult {
  conversation: Conversation | null;
  messages: MessageWithPending[];
  isLoading: boolean;
  isSending: boolean;
  error: Error | null;
  sendMessage: (message: string) => Promise<void>;
  createConversation: () => Promise<void>;
  loadConversation: () => Promise<void>;
  updateConversation: (updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: () => Promise<void>;
  clearError: () => void;
}

/**
 * A hook that provides conversation management functionality
 * @param   options
 * @returns Conversation controls and state
 */
const useConversation = (options: UseConversationOptions = {}): UseConversationResult => {
  // LD1: Extract conversation store state and functions using useConversationStore
  const {
    conversations,
    activeConversationId,
    conversationState,
    isLoading,
    error,
    setActiveConversation,
    loadConversation: loadConversationFromStore,
    loadMessages,
    sendMessage: sendMessageToStore,
    createNewConversation: createNewConversationInStore,
    updateConversationDetails,
    deleteConversationById,
    clearError: clearErrorFromStore,
  } = useConversationStore();

  // LD1: Get voice settings and capabilities from useSettings and useVoice hooks
  const { settings } = useSettings();
  const { speak } = useVoice();

  // LD1: Initialize local state for pending messages and audio playback
  const [isSending, setIsSending] = useState(false);

  // LD1: Create memoized function for sending messages with voice support
  const sendMessage = useCallback(
    async (message: string) => {
      setIsSending(true);
      try {
        // IE1: Access voice settings to determine if voice output is enabled
        const useVoiceOutput = settings.voice_settings.output_enabled;

        // IE1: Call sendMessageToStore to send the message to the store
        await sendMessageToStore(message, options.conversationId, { voice: useVoiceOutput });

        // LD2: If voice output is enabled, speak the AI response
        if (useVoiceOutput) {
          // LD2: Get the active conversation and its messages
          const conversation = conversations[activeConversationId || ''];
          const messages = conversation?.messages || [];

          // LD2: Find the last message in the conversation (the AI response)
          const lastMessage = messages[messages.length - 1];

          // LD2: If there is a last message and it's from the assistant, speak it
          if (lastMessage && lastMessage.role === 'assistant') {
            await speak(lastMessage.content);
          }
        }
      } finally {
        setIsSending(false);
      }
    },
    [sendMessageToStore, options.conversationId, settings.voice_settings, speak, conversations, activeConversationId]
  );

  // LD1: Create memoized function for creating new conversations
  const createConversation = useCallback(async () => {
    try {
      await createNewConversationInStore();
    } catch (e) {
      console.error("Failed to create conversation", e);
    }
  }, [createNewConversationInStore]);

  // LD1: Create memoized function for loading existing conversations
  const loadConversation = useCallback(async () => {
    if (options.conversationId) {
      try {
        await loadConversationFromStore(options.conversationId);
        await loadMessages(options.conversationId);
      } catch (e) {
        console.error("Failed to load conversation", e);
      }
    }
  }, [loadConversationFromStore, options.conversationId, loadMessages]);

  // LD1: Create memoized function for updating conversation details
  const updateConversation = useCallback(async (updates: Partial<Conversation>) => {
    if (options.conversationId) {
      try {
        await updateConversationDetails(options.conversationId, updates);
      } catch (e) {
        console.error("Failed to update conversation", e);
      }
    }
  }, [updateConversationDetails, options.conversationId]);

  // LD1: Create memoized function for deleting conversations
  const deleteConversation = useCallback(async () => {
    if (options.conversationId) {
      try {
        await deleteConversationById(options.conversationId);
      } catch (e) {
        console.error("Failed to delete conversation", e);
      }
    }
  }, [deleteConversationById, options.conversationId]);

  // LD1: Create memoized function for loading conversation messages
  const loadConversationMessages = useCallback(async () => {
    if (options.conversationId) {
      try {
        await loadMessages(options.conversationId);
      } catch (e) {
        console.error("Failed to load conversation messages", e);
      }
    }
  }, [loadMessages, options.conversationId]);

  // LD1: Create memoized function for handling errors
  const clearError = useCallback(() => {
    clearErrorFromStore();
  }, [clearErrorFromStore]);

  // LD1: Set up effect to load active conversation on mount or ID change
  useEffect(() => {
    if (options.autoLoad && options.conversationId) {
      loadConversationMessages();
    }
  }, [options.autoLoad, options.conversationId, loadConversationMessages]);

  // LD1: Set up effect to play audio response when available
  // This effect is intentionally left empty as audio playback is handled directly in the sendMessage function
  useEffect(() => {
    // Audio playback is handled directly in the sendMessage function
  }, []);

  // LD1: Set up effect to handle pending message state
  const messages: MessageWithPending[] = activeConversationId && conversations[activeConversationId]?.messages
    ? conversations[activeConversationId].messages!.map(message => ({
      ...message,
      pending: false // Assuming all messages are loaded and not pending after loading
    }))
    : [];

  // LD1: Return conversation state and control functions
  return {
    conversation: activeConversationId ? conversations[activeConversationId] || null : null,
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
    createConversation,
    loadConversation,
    updateConversation,
    deleteConversation,
    clearError,
  };
};

export default useConversation;