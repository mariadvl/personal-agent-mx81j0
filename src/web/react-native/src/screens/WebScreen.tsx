import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import WebReader from '../components/WebReader';
import { useStore } from '../store';
import { useTheme } from '../theme/theme';

// Type definitions for the screen props and route parameters
interface WebScreenProps {
  route: RouteProp<RootStackParamList, 'Web'>;
  navigation: StackNavigationProp<RootStackParamList, 'Web'>;
}

interface WebScreenRouteParams {
  initialUrl?: string;
}

type RootStackParamList = {
  Web: { initialUrl?: string };
  Chat: { contextId?: string; contextType?: string; title?: string };
};

/**
 * Web Screen Component for the Personal AI Agent mobile application
 * Provides UI for extracting, viewing, and interacting with web content
 */
const WebScreen: React.FC<WebScreenProps> = ({ route, navigation }) => {
  // Extract route parameters including initialUrl if provided
  const { initialUrl } = route.params || {} as WebScreenRouteParams;
  
  // Access navigation for screen transitions
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  
  // Get theme colors and styles
  const { colors } = useTheme();
  
  // Default web extraction settings
  // In a complete implementation, these would come from the settings store
  const webSettings = {
    includeImages: false,
    maxContentLength: 100000,
    generateSummary: true,
    extractMetadata: true,
    autoStoreInMemory: false
  };
  
  // Default privacy settings
  // In a complete implementation, these would come from the settings store
  const privacySettings = {
    showExternalServiceWarning: true
  };
  
  // Handle successful web content extraction
  const handleContentExtracted = (extractedContent: any) => {
    console.log('Content extracted successfully:', extractedContent.title);
    
    // You could track analytics or update screen state here
    // Example: setContentTitle(extractedContent.title);
  };
  
  // Handle successful memory storage
  const handleMemoryStored = (memoryResponse: any) => {
    console.log('Web content stored in memory:', memoryResponse.memoryId);
    
    // You could display a success message to the user here
    // Example: showToast('Content saved to memory');
  };
  
  // Handle errors during web content extraction
  const handleError = (error: Error) => {
    console.error('Error during web content extraction:', error.message);
    
    // You could display an error message to the user here
    // Example: showErrorDialog(error.message);
  };
  
  // Navigate to chat screen with web content context
  const handleNavigateToChat = (webContent: any) => {
    // Navigate to Chat screen with the web content as context
    navigation.navigate('Chat', {
      contextId: webContent.memoryId, // ID of the stored memory item
      contextType: 'web',              // Indicate this is web content
      title: webContent.title || 'Web Content Discussion'
    });
    
    console.log('Navigating to chat with web content context');
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.default }]}>
      {/* Header with back button and title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          accessible={true}
          accessibilityLabel="Back button"
          accessibilityHint="Navigate back to the previous screen"
        >
          <Text style={{ color: colors.primary.main, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Web Content Reader
        </Text>
      </View>
      
      {/* Web Reader Component */}
      <View style={styles.content}>
        <WebReader
          initialUrl={initialUrl}
          includeImages={webSettings.includeImages}
          maxContentLength={webSettings.maxContentLength}
          generateSummary={webSettings.generateSummary}
          extractMetadata={webSettings.extractMetadata}
          autoStoreInMemory={webSettings.autoStoreInMemory}
          showExternalServiceWarning={privacySettings.showExternalServiceWarning}
          onContentExtracted={handleContentExtracted}
          onMemoryStored={handleMemoryStored}
          onError={handleError}
          onNavigateToChat={handleNavigateToChat}
        />
      </View>
    </SafeAreaView>
  );
};

// Styles for the screen components
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
});

export default WebScreen;