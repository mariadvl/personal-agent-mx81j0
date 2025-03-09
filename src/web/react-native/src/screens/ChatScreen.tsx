import React, { useState, useEffect, useLayoutEffect } from 'react'; // React v18.2.0
import { StyleSheet, View, SafeAreaView } from 'react-native'; // React Native v0.72.0
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'; // @react-navigation/native v6.1.0
import { StackNavigationProp } from '@react-navigation/stack'; // @react-navigation/stack v6.3.0

// Internal component imports
import ChatInterface from '../components/ChatInterface';
import useConversationStore from '../../src/store/conversationStore';
import { useTheme } from '../theme/theme';

// Define the route parameters for the ChatScreen
interface ChatScreenParams {
  conversationId?: string;
}

// Define the root stack parameter list for navigation type safety
interface RootStackParamList {
  Chat: ChatScreenParams;
  Home: undefined;
  Files: undefined;
  Memory: undefined;
  Settings: undefined;
  Web: undefined;
}

/**
 * Type definition for the chat screen route parameters
 */
interface ChatScreenParams {
  string: 'conversationId';
}

/**
 * Type definition for the root stack navigation parameters
 */
interface RootStackParamList {
  ChatScreenParams: 'Chat';
  undefined: 'Home';
  undefined: 'Files';
  undefined: 'Memory';
  undefined: 'Settings';
  undefined: 'Web';
}

/**
 * Screen component that renders the chat interface and handles navigation parameters
 */
const ChatScreen: React.FC = () => {
  // 1. Get the current route using useRoute hook to access navigation parameters
  const route = useRoute<RouteProp<RootStackParamList, 'Chat'>>();

  // 2. Get the navigation object using useNavigation hook for header customization
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Chat'>>();

  // 3. Get current theme using useTheme hook
  const { theme } = useTheme();

  // 4. Access conversation store state and actions using useConversationStore
  const { activeConversationId, setActiveConversation, createNewConversation } = useConversationStore();

  // 5. Extract conversationId from route params if available
  const routeConversationId = route.params?.conversationId;

  // 6. Set up state for the current conversation ID
  const [conversationId, setConversationId] = useState<string | undefined>(routeConversationId);

  // 7. Set up effect to update the active conversation in the store when route params change
  useEffect(() => {
    if (routeConversationId) {
      setConversationId(routeConversationId);
      setActiveConversation(routeConversationId);
    }
  }, [routeConversationId, setActiveConversation]);

  // 8. Set up effect to create a new conversation if none exists and no ID is provided
  useEffect(() => {
    if (!conversationId && !activeConversationId) {
      createNewConversation();
    }
  }, [conversationId, activeConversationId, createNewConversation]);

  // 9. Set up layout effect to customize the navigation header with conversation title
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Chat', // You can customize the header title here
    });
  }, [navigation]);

  // 10. Render a SafeAreaView container with appropriate styling
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 11. Render the ChatInterface component with the current conversation ID */}
      <ChatInterface conversationId={conversationId} />
    </SafeAreaView>
  );

  // 12. Apply appropriate styling based on the current theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  });
};

export default ChatScreen;