import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  RefreshControl 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, FileText, Database, Settings, Plus } from 'react-native-feather';

import { useTheme } from '../theme/theme';
import useConversationStore from '../../src/store/conversationStore';
import useMemoryStore from '../../src/store/memoryStore';

/**
 * Main dashboard screen for the Personal AI Agent mobile application.
 * Displays an overview of recent conversations, quick actions, memory highlights,
 * and system status information.
 */
const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { conversations, createNewConversation, loadRecentConversations } = useConversationStore();
  const { importantMemories, fetchImportantMemories } = useMemoryStore();
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle pull-to-refresh functionality
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadRecentConversations(),
        fetchImportantMemories({ limit: 5 })
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [loadRecentConversations, fetchImportantMemories]);
  
  // Handle creating and navigating to a new chat
  const handleNewChat = useCallback(async () => {
    try {
      const conversation = await createNewConversation();
      navigation.navigate('Conversation', { conversationId: conversation.id });
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  }, [createNewConversation, navigation]);
  
  // Handle opening an existing chat
  const handleOpenChat = useCallback((conversationId: string) => {
    navigation.navigate('Conversation', { conversationId });
  }, [navigation]);
  
  // Handle navigation to Files screen
  const handleOpenFiles = useCallback(() => {
    navigation.navigate('Files');
  }, [navigation]);
  
  // Handle navigation to Memory screen
  const handleOpenMemory = useCallback(() => {
    navigation.navigate('Memory');
  }, [navigation]);
  
  // Handle navigation to Settings screen
  const handleOpenSettings = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);
  
  // Fetch initial data on component mount
  useEffect(() => {
    loadRecentConversations();
    fetchImportantMemories({ limit: 5 });
  }, [loadRecentConversations, fetchImportantMemories]);
  
  // Get sorted conversations (most recent first)
  const sortedConversations = Object.values(conversations)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.main }]}>
      <StatusBar 
        backgroundColor={theme.components.statusBar.background}
        barStyle={theme.components.statusBar.barStyle}
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            colors={[theme.colors.primary.main]}
            tintColor={theme.colors.primary.main}
          />
        }
      >
        {/* Header with app title and user avatar */}
        <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Personal AI Agent
          </Text>
          <TouchableOpacity 
            style={[styles.avatar, { backgroundColor: theme.colors.primary.main }]}
            onPress={handleOpenMemory}
          >
            <Text style={[styles.avatarText, { color: theme.colors.primary.contrastText }]}>
              U
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Recent Conversations section */}
        {renderRecentConversations({ 
          conversations: sortedConversations, 
          onOpenChat: handleOpenChat, 
          onSeeAllChats: handleOpenMemory,
          theme 
        })}
        
        {/* Quick Actions section */}
        {renderQuickActions({ 
          onNewChat: handleNewChat, 
          onOpenFiles: handleOpenFiles, 
          onOpenMemory: handleOpenMemory, 
          onOpenSettings: handleOpenSettings, 
          theme 
        })}
        
        {/* Memory Highlights section */}
        {renderMemoryHighlights({ 
          memories: importantMemories || [], 
          onOpenMemory: (memoryId) => {
            navigation.navigate('MemoryDetail', { memoryId });
          }, 
          onSeeAllMemories: handleOpenMemory,
          theme 
        })}
        
        {/* System Status section */}
        {renderSystemStatus({ theme })}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Renders the Recent Conversations section
 */
const renderRecentConversations = ({ 
  conversations, 
  onOpenChat,
  onSeeAllChats,
  theme 
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Recent Conversations
      </Text>
      
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
            No conversations yet. Start a new chat!
          </Text>
        </View>
      ) : (
        <>
          {conversations.map((conversation) => (
            <TouchableOpacity
              key={conversation.id}
              style={[styles.conversationItem, { 
                backgroundColor: theme.colors.background.paper,
                shadowColor: theme.colors.shadow
              }]}
              onPress={() => onOpenChat(conversation.id)}
            >
              <Text style={[styles.conversationTitle, { color: theme.colors.text.primary }]}>
                {conversation.title || 'New Conversation'}
              </Text>
              
              <Text 
                style={[styles.conversationPreview, { color: theme.colors.text.secondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {conversation.messages && conversation.messages.length > 0
                  ? conversation.messages[conversation.messages.length - 1].content.substring(0, 60)
                  : 'No messages yet'}
              </Text>
              
              <Text style={[styles.conversationDate, { color: theme.colors.text.secondary }]}>
                {formatRelativeTime(conversation.updated_at)}
              </Text>
            </TouchableOpacity>
          ))}
          
          {conversations.length > 0 && (
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={onSeeAllChats}
            >
              <Text style={[styles.seeAllText, { color: theme.colors.primary.main }]}>
                See all
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

/**
 * Renders the Quick Actions section
 */
const renderQuickActions = ({ 
  onNewChat, 
  onOpenFiles, 
  onOpenMemory, 
  onOpenSettings, 
  theme 
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Quick Actions
      </Text>
      
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.background.paper,
            shadowColor: theme.colors.shadow
          }]}
          onPress={onNewChat}
        >
          <MessageCircle stroke={theme.colors.primary.main} width={24} height={24} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
            New Chat
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.background.paper,
            shadowColor: theme.colors.shadow
          }]}
          onPress={onOpenFiles}
        >
          <FileText stroke={theme.colors.primary.main} width={24} height={24} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
            Files
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.background.paper,
            shadowColor: theme.colors.shadow
          }]}
          onPress={onOpenMemory}
        >
          <Database stroke={theme.colors.primary.main} width={24} height={24} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
            Memory
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { 
            backgroundColor: theme.colors.background.paper,
            shadowColor: theme.colors.shadow
          }]}
          onPress={onOpenSettings}
        >
          <Settings stroke={theme.colors.primary.main} width={24} height={24} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text.primary }]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Renders the Memory Highlights section
 */
const renderMemoryHighlights = ({ 
  memories, 
  onOpenMemory,
  onSeeAllMemories,
  theme 
}) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Memory Highlights
      </Text>
      
      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
            No important memories yet.
          </Text>
        </View>
      ) : (
        <>
          {memories.map((memory) => (
            <TouchableOpacity
              key={memory.id}
              style={[styles.memoryItem, { 
                backgroundColor: theme.colors.background.paper,
                shadowColor: theme.colors.shadow
              }]}
              onPress={() => onOpenMemory(memory.id)}
            >
              <Text 
                style={[styles.memoryContent, { color: theme.colors.text.primary }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {memory.content}
              </Text>
              
              <View style={styles.memoryMeta}>
                <Text 
                  style={[styles.memoryCategory, { 
                    backgroundColor: theme.colors.background.default,
                    color: theme.colors.text.secondary 
                  }]}
                >
                  {memory.category}
                </Text>
                
                <Text style={[styles.memoryDate, { color: theme.colors.text.secondary }]}>
                  {formatRelativeTime(memory.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={onSeeAllMemories}
          >
            <Text style={[styles.seeAllText, { color: theme.colors.primary.main }]}>
              See all
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

/**
 * Renders the System Status section
 */
const renderSystemStatus = ({ theme }) => {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        System Status
      </Text>
      
      <View style={[styles.statusContainer, { backgroundColor: theme.colors.background.paper }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
            Storage
          </Text>
          <Text style={[styles.statusValue, { color: theme.colors.text.primary }]}>
            1.2 GB available
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
            Privacy
          </Text>
          <View style={[styles.localBadge, { backgroundColor: theme.colors.privacy.main }]}>
            <Text style={[styles.localBadgeText, { color: theme.colors.privacy.contrastText }]}>
              LOCAL ONLY
            </Text>
          </View>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
            Memory Items
          </Text>
          <Text style={[styles.statusValue, { color: theme.colors.text.primary }]}>
            245 items
          </Text>
        </View>
        
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: theme.colors.text.secondary }]}>
            Version
          </Text>
          <Text style={[styles.statusValue, { color: theme.colors.text.primary }]}>
            1.0.0
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Helper function to format relative time (e.g., "Today", "Yesterday", or date)
 */
const formatRelativeTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  
  // Check if date is today
  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }
  
  // Check if date is yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Otherwise return formatted date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

// Styles for the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  conversationItem: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conversationPreview: {
    fontSize: 14,
    marginBottom: 4,
  },
  conversationDate: {
    fontSize: 12,
  },
  emptyState: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    width: '48%',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  memoryItem: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memoryContent: {
    fontSize: 14,
    marginBottom: 6,
  },
  memoryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoryCategory: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memoryDate: {
    fontSize: 12,
  },
  seeAllButton: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusContainer: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 6,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  localBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  localBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default HomeScreen;