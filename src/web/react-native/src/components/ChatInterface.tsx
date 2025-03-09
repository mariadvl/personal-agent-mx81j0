import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';

import MessageList from './MessageList';
import MessageInput from './MessageInput';
import useConversationStore from '../../src/store/conversationStore';
import { useTheme } from '../theme/theme';

interface ChatInterfaceProps {
  conversationId?: string;
}

/**
 * Main chat interface component that provides a complete conversation experience with the AI agent.
 * Combines message list display, user input field, and voice control functionality.
 * Optimized for mobile screens with appropriate keyboard handling and styling.
 */
const ChatInterface: React.FC<ChatInterfaceProps> = ({ conversationId }) => {
  // Get current theme
  const { theme } = useTheme();
  
  // Access conversation store state and actions
  const {
    activeConversationId,
    conversations,
    conversationState,
    createNewConversation,
    loadMessages
  } = useConversationStore();
  
  // State for related memories shown with messages
  const [relatedMemories, setRelatedMemories] = useState<Record<string, any[]>>({});
  
  // Create a memoized handler for message sent events
  const handleMessageSent = useCallback(() => {
    // Will be called after a message is sent
    // Handled by MessageInput component
  }, []);
  
  // Create a memoized handler for scrolling to the end of the message list
  const handleScrollToEnd = useCallback(() => {
    // This is passed to MessageList for auto-scrolling
  }, []);
  
  // Create new conversation if none exists
  useEffect(() => {
    if (!conversationId && !activeConversationId) {
      createNewConversation();
    }
  }, [conversationId, activeConversationId, createNewConversation]);
  
  // Load messages when conversation ID changes
  useEffect(() => {
    const currentConversationId = conversationId || activeConversationId;
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [conversationId, activeConversationId, loadMessages]);
  
  // Update related memories when messages change
  useEffect(() => {
    const currentConversationId = conversationId || activeConversationId;
    if (currentConversationId && conversations[currentConversationId]?.messages) {
      // Extract related memories from message metadata
      const messages = conversations[currentConversationId].messages || [];
      const newRelatedMemories: Record<string, any[]> = {};
      
      messages.forEach(message => {
        // Check for related memories in metadata - structure may vary based on implementation
        if (message.metadata?.relatedMemories) {
          newRelatedMemories[message.id] = message.metadata.relatedMemories;
        } else if (message.metadata?.related_memories) {
          newRelatedMemories[message.id] = message.metadata.related_memories;
        }
      });
      
      setRelatedMemories(newRelatedMemories);
    }
  }, [conversationId, activeConversationId, conversations]);
  
  // Determine the current conversation ID
  const currentConversationId = conversationId || activeConversationId;
  
  // Get messages for the current conversation
  const messages = currentConversationId && conversations[currentConversationId]?.messages 
    ? conversations[currentConversationId].messages || []
    : [];
  
  // Create styles based on current theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    keyboardAvoidingView: {
      flex: 1
    },
    messageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background
    },
    inputContainer: {
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
    }
  });
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.messageContainer}>
          {conversationState === 'loading' ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.main} />
            </View>
          ) : (
            <MessageList
              messages={messages}
              relatedMemories={relatedMemories}
              onScrollToEnd={handleScrollToEnd}
            />
          )}
        </View>
        
        <View style={styles.inputContainer}>
          <MessageInput
            conversationId={currentConversationId}
            onMessageSent={handleMessageSent}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatInterface;