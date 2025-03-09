import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, Platform } from 'react-native';
import { format } from 'date-fns'; // date-fns 2.30.0+
import { MessageWithPending, RelatedMemory } from '../../src/types/conversation';
import { useTheme } from '../theme/theme';

interface MessageListProps {
  messages: MessageWithPending[];
  relatedMemories: Record<string, RelatedMemory[]>;
  onScrollToEnd?: () => void;
}

interface MessageGroup {
  date: string;
  messages: MessageWithPending[];
}

/**
 * Renders a scrollable list of messages in a conversation between the user and the AI agent
 * Groups messages by date and displays appropriate styling based on the sender
 * Auto-scrolls to the latest message when new messages are added
 */
const MessageList: React.FC<MessageListProps> = ({
  messages,
  relatedMemories,
  onScrollToEnd
}) => {
  const flatListRef = useRef<FlatList>(null);
  const { theme } = useTheme();
  const [groupedMessages, setGroupedMessages] = useState<MessageGroup[]>([]);

  // Group messages by date whenever messages change
  useEffect(() => {
    setGroupedMessages(groupMessagesByDate(messages));
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        onScrollToEnd?.();
      }, 100);
    }
  }, [messages.length, onScrollToEnd]);

  // Render a message item with appropriate styling and related memories
  const renderItem = ({ item }: { item: MessageWithPending }) => {
    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';
    const messageStyle = isUser 
      ? theme.components.messageItem.user 
      : isSystem 
        ? theme.components.messageItem.system 
        : theme.components.messageItem.ai;
    
    // Get related memories for this message
    const memories = relatedMemories[item.id] || [];
    
    return (
      <View style={[
        messageStyle,
        item.pending && { opacity: 0.7 }
      ]}
      accessible={true}
      accessibilityLabel={`${isUser ? 'You' : 'AI'}: ${item.content}`}
      >
        <Text style={{ 
          color: isUser ? theme.colors.primary.contrastText : theme.colors.text.primary,
          ...theme.typography.body1
        }}>
          {item.content}
        </Text>
        
        {item.pending && (
          <ActivityIndicator 
            size="small" 
            color={isUser ? theme.colors.primary.contrastText : theme.colors.primary.main} 
            style={{ marginTop: theme.spacing.xs }}
          />
        )}
        
        {!isUser && memories.length > 0 && (
          <View style={{ 
            marginTop: theme.spacing.sm,
            paddingTop: theme.spacing.xs,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider
          }}>
            <Text style={{ 
              color: theme.colors.text.secondary,
              ...theme.typography.caption
            }}
            accessibilityLabel={`Related Memory: ${memories[0].title}`}
            >
              Related Memory: {memories[0].title}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Empty state when no messages are available
  if (messages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Start a conversation by sending a message.
        </Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    messageList: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
    },
    dateSeparator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: theme.spacing.md,
    },
    dateText: {
      backgroundColor: theme.colors.card,
      color: theme.colors.textSecondary,
      fontSize: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    dateLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
      marginHorizontal: theme.spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    contentContainerStyle: {
      flexGrow: 1,
      paddingVertical: theme.spacing.md,
      justifyContent: 'flex-end',
    }
  });

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        renderItem={({ item }) => (
          <View>
            <View style={styles.dateSeparator}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>{item.date}</Text>
              <View style={styles.dateLine} />
            </View>
            
            {item.messages.map(message => (
              <View key={message.id}>
                {renderItem({ item: message })}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.contentContainerStyle}
        style={styles.messageList}
        onContentSizeChange={() => {
          flatListRef.current?.scrollToEnd({ animated: true });
          onScrollToEnd?.();
        }}
        inverted={Platform.OS === 'ios' ? false : undefined}
      />
    </View>
  );
};

/**
 * Groups messages by their date for better visual organization
 * 
 * @param messages Array of messages to group
 * @returns Array of message groups organized by date
 */
function groupMessagesByDate(messages: MessageWithPending[]): MessageGroup[] {
  const result: MessageGroup[] = [];
  const messagesByDate = new Map<string, MessageWithPending[]>();
  
  // Sort messages by creation time (oldest first)
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.created_at || new Date()).getTime();
    const timeB = new Date(b.created_at || new Date()).getTime();
    return timeA - timeB;
  });
  
  // Group messages by date
  sortedMessages.forEach(message => {
    const date = formatMessageDate(message.created_at || new Date().toISOString());
    if (!messagesByDate.has(date)) {
      messagesByDate.set(date, []);
    }
    messagesByDate.get(date)!.push(message);
  });
  
  // Convert map to array
  messagesByDate.forEach((messages, date) => {
    result.push({ date, messages });
  });
  
  return result;
}

/**
 * Formats a date string for display in the message list
 * 
 * @param dateString ISO date string to format
 * @returns Formatted date string (Today, Yesterday, or MMM d, yyyy)
 */
function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date >= today) {
    return "Today";
  } else if (date >= yesterday) {
    return "Yesterday";
  } else {
    return format(date, "MMM d, yyyy");
  }
}

export default MessageList;