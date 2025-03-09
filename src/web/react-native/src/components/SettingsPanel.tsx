import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native'; // react-native ^0.72.0
import { Ionicons } from '@expo/vector-icons'; // @expo/vector-icons ^13.0.0
import { useTheme } from '../theme/theme';
import useSettings from '../../src/hooks/useSettings';

/**
 * Configuration for settings tabs
 */
interface SettingsTabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

/**
 * Settings panel component for the Personal AI Agent mobile application.
 * Provides a tabbed interface to manage different categories of settings.
 */
const SettingsPanel: React.FC = () => {
  // Track the currently active settings tab
  const [activeTab, setActiveTab] = useState('api');
  
  // Get current theme and settings
  const { theme } = useTheme();
  const { 
    settings, 
    isLoading,
    error,
    updateVoice,
    updatePersonality,
    updatePrivacy,
    updateStorage,
    updateLLM,
    updateSearch,
    updateMemory,
    resetToDefaults,
    exportToJson,
    importFromJson,
    isLocalStorageOnly
  } = useSettings(true); // Load settings on mount
  
  // Define tabs configuration with icons and labels
  const SETTINGS_TABS: SettingsTabConfig[] = [
    {
      id: 'api',
      label: 'API Keys',
      icon: <Ionicons name="key-outline" size={24} color={activeTab === 'api' ? theme.colors.primary.main : theme.colors.text.secondary} />
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: <Ionicons name="settings-outline" size={24} color={activeTab === 'advanced' ? theme.colors.primary.main : theme.colors.text.secondary} />
    },
    {
      id: 'data',
      label: 'Data',
      icon: <Ionicons name="save-outline" size={24} color={activeTab === 'data' ? theme.colors.primary.main : theme.colors.text.secondary} />
    }
  ];
  
  // Handle tab selection change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.default }]}>
      {/* Horizontal Tab Bar */}
      <View style={[styles.tabBar, { 
        backgroundColor: theme.colors.background.paper,
        borderBottomColor: theme.colors.divider,
        shadowColor: theme.colors.text.primary
      }]}>
        {SETTINGS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && [styles.activeTab, { borderBottomColor: theme.colors.primary.main }]
            ]}
            onPress={() => handleTabChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
          >
            {tab.icon}
            <Text
              style={[
                styles.tabText,
                { color: theme.colors.text.secondary, fontFamily: theme.typography.fontFamily.primary },
                activeTab === tab.id && [styles.activeTabText, { color: theme.colors.primary.main }]
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Content Area - ScrollView for scrollable content */}
      <ScrollView style={styles.contentContainer}>
        {/* API Keys Tab Content */}
        {activeTab === 'api' && (
          <View>
            <Text style={[styles.settingsTitle, { 
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fontFamily.primary 
            }]}>
              External API Keys
            </Text>
            {/* API keys settings would be implemented here */}
            {/* This would include inputs for OpenAI, ElevenLabs, SerpAPI keys */}
            {isLoading && (
              <Text style={{ color: theme.colors.text.secondary }}>
                Loading API settings...
              </Text>
            )}
          </View>
        )}
        
        {/* Advanced Tab Content */}
        {activeTab === 'advanced' && (
          <View>
            <Text style={[styles.settingsTitle, { 
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fontFamily.primary 
            }]}>
              Advanced Settings
            </Text>
            {/* Advanced settings would be implemented here */}
            {/* This would include LLM settings, voice settings, memory settings */}
            {isLoading && (
              <Text style={{ color: theme.colors.text.secondary }}>
                Loading advanced settings...
              </Text>
            )}
          </View>
        )}
        
        {/* Data Tab Content */}
        {activeTab === 'data' && (
          <View>
            <Text style={[styles.settingsTitle, { 
              color: theme.colors.text.primary,
              fontFamily: theme.typography.fontFamily.primary 
            }]}>
              Data Management
            </Text>
            {/* Data management settings would be implemented here */}
            {/* This would include backup, export, import, and reset options */}
            {isLoading && (
              <Text style={{ color: theme.colors.text.secondary }}>
                Loading data settings...
              </Text>
            )}
          </View>
        )}
        
        {/* Error display */}
        {error && (
          <View style={{ 
            backgroundColor: theme.colors.error.light,
            padding: 16,
            borderRadius: 8,
            marginTop: 16
          }}>
            <Text style={{ color: theme.colors.error.contrastText }}>
              {error.message || "An error occurred while loading settings"}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
  },
  activeTabText: {
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
});

export default SettingsPanel;