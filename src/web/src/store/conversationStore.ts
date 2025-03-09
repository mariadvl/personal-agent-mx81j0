import { create } from 'zustand'; // v4.4.5
import { immer } from 'zustand/middleware/immer'; // v4.4.5
import { v4 as uuidv4 } from 'uuid'; // v9.0.1

import {
  Conversation,
  Message,
  ConversationState,
  ConversationStore,
  MessageWithPending
} from '../types/conversation';

import {
  sendMessage as apiSendMessage,
  getConversation,
  getConversationMessages,
  createConversation,
  updateConversation,
  deleteConversation,
  getRecentConversations
} from '../services/conversationService';

/**
 * Zustand store for managing conversation state in the Personal AI Agent
 * 
 * This store handles all conversation-related state, including:
 * - Tracking conversations and their messages
 * - Managing the active conversation
 * - Sending and receiving messages
 * - Loading conversation history
 * - Creating, updating, and deleting conversations
 */
export const useConversationStore = create<ConversationStore>()(
  immer((set, get) => ({
    // State
    conversations: {},
    activeConversationId: null,
    conversationState: 'idle',
    error: null,
    isLoading: false,
    recentConversations: [],
    
    // Actions
    setActiveConversation: (conversationId) => {
      set((state) => {
        state.activeConversationId = conversationId;
      });
    },
    
    loadConversation: async (conversationId) => {
      try {
        set((state) => {
          state.conversationState = 'loading';
          state.error = null;
        });
        
        const conversation = await getConversation(conversationId);
        
        set((state) => {
          state.conversations[conversationId] = conversation;
          state.activeConversationId = conversationId;
          state.conversationState = 'idle';
        });
        
        return conversation;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to load conversation');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    loadMessages: async (conversationId) => {
      try {
        set((state) => {
          state.conversationState = 'loading';
          state.error = null;
        });
        
        const messages = await getConversationMessages(conversationId);
        
        set((state) => {
          if (state.conversations[conversationId]) {
            state.conversations[conversationId].messages = messages;
          } else {
            // Create conversation object if it doesn't exist yet
            state.conversations[conversationId] = {
              id: conversationId,
              title: 'Conversation',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              summary: null,
              messages,
              metadata: null
            };
          }
          state.conversationState = 'idle';
        });
        
        return messages;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to load messages');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    sendMessage: async (message, conversationId, options = {}) => {
      try {
        const activeId = conversationId || get().activeConversationId;
        const useVoice = options?.voice || false;
        
        set((state) => {
          state.conversationState = 'sending';
          state.error = null;
        });
        
        // Create temporary user message with pending status
        const tempMessageId = uuidv4();
        const userMessage: MessageWithPending = {
          id: tempMessageId,
          role: 'user',
          content: message,
          created_at: new Date().toISOString(),
          metadata: null,
          pending: true
        };
        
        // Add user message to the conversation
        set((state) => {
          if (activeId && state.conversations[activeId]) {
            if (!state.conversations[activeId].messages) {
              state.conversations[activeId].messages = [];
            }
            state.conversations[activeId].messages!.push(userMessage);
            state.conversations[activeId].updated_at = new Date().toISOString();
          } else {
            // Create a new conversation
            const newId = uuidv4();
            state.conversations[newId] = {
              id: newId,
              title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              summary: null,
              messages: [userMessage],
              metadata: null
            };
            state.activeConversationId = newId;
          }
        });
        
        // Prepare request
        const currentConversationId = activeId || get().activeConversationId;
        const response = await apiSendMessage({
          message,
          conversation_id: currentConversationId,
          voice: useVoice
        });
        
        set((state) => {
          state.conversationState = 'receiving';
        });
        
        // Create AI response message
        const aiMessage: Message = {
          id: uuidv4(),
          role: 'assistant',
          content: response.response,
          created_at: new Date().toISOString(),
          metadata: response.audio_url ? { audio_url: response.audio_url } : null
        };
        
        // Update the conversation with both messages (no longer pending)
        set((state) => {
          const conversationId = response.conversation_id;
          
          // Update existing conversation or create a new one
          if (state.conversations[conversationId]) {
            // Replace pending message with final version
            if (state.conversations[conversationId].messages) {
              const messages = state.conversations[conversationId].messages!;
              const pendingIndex = messages.findIndex(m => m.id === tempMessageId);
              
              if (pendingIndex !== -1) {
                // Update the pending message
                messages[pendingIndex] = {
                  ...userMessage,
                  pending: false
                };
              }
              
              // Add AI response
              messages.push(aiMessage);
            } else {
              state.conversations[conversationId].messages = [
                { ...userMessage, pending: false },
                aiMessage
              ];
            }
            
            state.conversations[conversationId].updated_at = new Date().toISOString();
          } else {
            // Create a new conversation with the final ID from the response
            state.conversations[conversationId] = {
              id: conversationId,
              title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              summary: null,
              messages: [
                { ...userMessage, pending: false },
                aiMessage
              ],
              metadata: null
            };
          }
          
          // Update active conversation ID if it changed
          if (state.activeConversationId !== conversationId) {
            state.activeConversationId = conversationId;
          }
          
          state.conversationState = 'idle';
        });
        
        return response;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to send message');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    createNewConversation: async (data) => {
      try {
        set((state) => {
          state.conversationState = 'loading';
          state.error = null;
        });
        
        const newConversation = await createConversation(data);
        
        set((state) => {
          state.conversations[newConversation.id] = newConversation;
          state.activeConversationId = newConversation.id;
          state.conversationState = 'idle';
        });
        
        return newConversation;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to create conversation');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    updateConversationDetails: async (conversationId, updates) => {
      try {
        set((state) => {
          state.conversationState = 'loading';
          state.error = null;
        });
        
        const updatedConversation = await updateConversation(conversationId, updates);
        
        set((state) => {
          state.conversations[conversationId] = {
            ...state.conversations[conversationId],
            ...updatedConversation
          };
          state.conversationState = 'idle';
        });
        
        return updatedConversation;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to update conversation');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    deleteConversationById: async (conversationId) => {
      try {
        set((state) => {
          state.conversationState = 'loading';
          state.error = null;
        });
        
        const result = await deleteConversation(conversationId);
        
        set((state) => {
          // Remove from conversations map
          delete state.conversations[conversationId];
          
          // If the deleted conversation was active, clear activeConversationId
          if (state.activeConversationId === conversationId) {
            state.activeConversationId = null;
          }
          
          // Remove from recentConversations if present
          state.recentConversations = state.recentConversations.filter(
            conv => conv.id !== conversationId
          );
          
          state.conversationState = 'idle';
        });
        
        return result;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to delete conversation');
          state.conversationState = 'error';
        });
        throw error;
      }
    },
    
    loadRecentConversations: async (filters) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });
        
        // Extract limit from filters or use default
        const limit = filters?.limit !== null && filters?.limit !== undefined 
          ? filters.limit 
          : 10;
        
        const conversations = await getRecentConversations(limit);
        
        set((state) => {
          state.recentConversations = conversations;
          
          // Also add these conversations to the conversations map
          conversations.forEach(conversation => {
            state.conversations[conversation.id] = conversation;
          });
          
          state.isLoading = false;
        });
        
        return conversations;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error : new Error('Failed to load recent conversations');
          state.isLoading = false;
        });
        throw error;
      }
    },
    
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
    
    resetState: () => {
      set((state) => {
        state.conversations = {};
        state.activeConversationId = null;
        state.conversationState = 'idle';
        state.error = null;
        state.isLoading = false;
        state.recentConversations = [];
      });
    }
  }))
);