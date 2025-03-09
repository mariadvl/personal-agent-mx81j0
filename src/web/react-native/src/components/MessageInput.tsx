import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Keyboard, 
  useColorScheme 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // @expo/vector-icons ^13.0.0
import * as Haptics from 'expo-haptics'; // expo-haptics ^12.0.0

import VoiceControl from './VoiceControl';
import { useConversationStore } from '../../src/store/conversationStore';
import { ConversationState } from '../../src/types/conversation';
import theme from '../theme/theme';

interface MessageInputProps {
  conversationId?: string;
  onMessageSent?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  conversationId,
  onMessageSent
}) => {
  // Get color scheme to determine if device is in dark mode
  const colorScheme = useColorScheme();
  
  // Input text state
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Get conversation state and sendMessage function from the store
  const { conversationState, sendMessage } = useConversationStore();
  
  // Reference to the text input element
  const inputRef = useRef<TextInput>(null);
  
  // Handle sending text messages
  const handleSendMessage = useCallback(() => {
    if (message.trim() === '') return;
    
    // Provide haptic feedback when sending message
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Send the message through the conversation store
    sendMessage(message, conversationId);
    
    // Clear the input field
    setMessage('');
    
    // Call the callback if provided
    if (onMessageSent) {
      onMessageSent();
    }
  }, [message, conversationId, sendMessage, onMessageSent]);
  
  // Handle voice transcription results
  const handleTranscription = useCallback((text: string) => {
    if (text.trim() === '') return;
    
    // Send the transcribed message
    sendMessage(text, conversationId);
    
    // Call the callback if provided
    if (onMessageSent) {
      onMessageSent();
    }
  }, [conversationId, sendMessage, onMessageSent]);
  
  // Handle focus state changes for the input field
  const handleFocusChange = useCallback((focused: boolean) => {
    setIsFocused(focused);
  }, []);
  
  // Effect to clear input after message is sent successfully
  useEffect(() => {
    if (conversationState === 'idle') {
      setMessage('');
    }
  }, [conversationState]);
  
  // Effect to handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Additional handling when keyboard appears could be added here
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Remove focus when keyboard hides
        if (inputRef.current) {
          inputRef.current.blur();
        }
      }
    );
    
    // Clean up event listeners
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  return (
    <View style={styles.container}>
      {/* Text input container */}
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused
      ]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={colorScheme === 'dark' ? "#95A5A6" : "#B2BEC3"}
          onFocus={() => handleFocusChange(true)}
          onBlur={() => handleFocusChange(false)}
          multiline={true}
          returnKeyType="default"
          blurOnSubmit={false}
          accessible={true}
          accessibilityLabel="Message input field"
          accessibilityHint="Enter your message here"
        />
      </View>
      
      {/* Send button */}
      <TouchableOpacity
        style={[
          styles.sendButton,
          message.trim() === '' && styles.sendButtonDisabled
        ]}
        onPress={handleSendMessage}
        disabled={message.trim() === '' || conversationState === 'sending'}
        accessible={true}
        accessibilityLabel="Send message"
        accessibilityHint="Sends your message to the AI assistant"
      >
        {conversationState === 'sending' ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Ionicons 
            name="send" 
            size={20} 
            color="white" 
          />
        )}
      </TouchableOpacity>
      
      {/* Voice control component */}
      <View style={styles.voiceContainer}>
        <VoiceControl
          onTranscription={handleTranscription}
          disabled={conversationState === 'sending'}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.card,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
    maxHeight: 100,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  voiceContainer: {
    marginLeft: theme.spacing.sm,
  },
});

export default MessageInput;