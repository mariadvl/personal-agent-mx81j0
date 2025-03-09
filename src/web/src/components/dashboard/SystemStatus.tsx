import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import ProgressBar from '../ui/ProgressBar';
import { useSettingsStore } from '../../store/settingsStore';
import { getDatabaseSize } from '../../services/storageService';
import useTheme from '../../hooks/useTheme';
import { SPACING } from '../../constants/uiConstants';

// Define interface for status indicator props
interface StatusIndicatorProps {
  active: boolean;
  theme: any;
}

// Define interface for system metrics state
interface SystemMetrics {
  databaseSize: number;
  storageUsage: number;
  memoryItems: number;
  apiCalls: number;
  apiQuotaRemaining: number;
}

// Container for all status sections
const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  width: 100%;
`;

// Container for individual status sections
const StatusSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.SM};
  width: 100%;
`;

// Title for each status section
const SectionTitle = styled.h4`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0;
`;

// Container for label and value pairs
const StatusItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.SM};
`;

// Label for status items
const StatusLabel = styled.span`
  font-size: 0.85rem;
  color: ${props => props.theme.colors.text.secondary};
`;

// Value display for status items
const StatusValue = styled.span`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${props => props.theme.colors.text.primary};
`;

// Visual indicator for enabled/disabled status
const StatusIndicator = styled.span<StatusIndicatorProps>`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  background-color: ${props => props.active ? props.theme.colors.success.light : props.theme.colors.error.light};
  color: ${props => props.active ? props.theme.colors.success.dark : props.theme.colors.error.dark};
`;

/**
 * Component that displays system health and resource usage information
 * Shows storage usage, memory status, external services usage, and privacy indicators
 */
const SystemStatus = (): JSX.Element => {
  // Get the theme and settings
  const { theme } = useTheme();
  const { settings } = useSettingsStore();
  
  // Set up state for system metrics
  const [metrics, setMetrics] = useState<SystemMetrics>({
    databaseSize: 0,
    storageUsage: 0,
    memoryItems: 0,
    apiCalls: 0,
    apiQuotaRemaining: 100
  });
  
  // Fetch database size on mount and periodically
  useEffect(() => {
    const fetchDatabaseSize = async () => {
      try {
        const size = await getDatabaseSize();
        // Convert bytes to MB
        const sizeInMB = size / (1024 * 1024);
        // Calculate storage usage percentage (based on 1GB maximum for example)
        const usagePercentage = Math.min(100, (sizeInMB / 1024) * 100);
        
        setMetrics(prev => ({
          ...prev,
          databaseSize: parseFloat(sizeInMB.toFixed(2)),
          storageUsage: parseFloat(usagePercentage.toFixed(1))
        }));
      } catch (error) {
        console.error('Error fetching database size:', error);
      }
    };
    
    // Fetch immediately on mount
    fetchDatabaseSize();
    
    // Then fetch periodically (every 30 seconds)
    const interval = setInterval(fetchDatabaseSize, 30000);
    
    // Clean up the interval on unmount
    return () => clearInterval(interval);
  }, []);
  
  // Fetch memory metrics on mount
  useEffect(() => {
    // This would be replaced with actual API calls in a production environment
    const fetchMemoryMetrics = async () => {
      try {
        // For demonstration, using static values
        // In production, these would come from the backend
        setMetrics(prev => ({
          ...prev,
          memoryItems: settings.memory_settings.max_memory_items > 10000 ? 
            Math.floor(settings.memory_settings.max_memory_items * 0.3) : 245,
          apiCalls: 52,
          apiQuotaRemaining: 88
        }));
      } catch (error) {
        console.error('Error fetching memory metrics:', error);
      }
    };
    
    fetchMemoryMetrics();
    
    // Refresh periodically
    const interval = setInterval(fetchMemoryMetrics, 60000);
    return () => clearInterval(interval);
  }, [settings.memory_settings.max_memory_items]);
  
  return (
    <Card title="System Status">
      <StatusContainer>
        {/* Storage Usage Section */}
        <StatusSection>
          <SectionTitle>Storage Usage</SectionTitle>
          <ProgressBar 
            value={metrics.storageUsage} 
            max={100} 
            showPercentage
          />
          <StatusItem>
            <StatusLabel>Database Size:</StatusLabel>
            <StatusValue>{metrics.databaseSize} MB</StatusValue>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Free Space:</StatusLabel>
            <StatusValue>
              {(1024 - metrics.databaseSize).toFixed(2)} MB
            </StatusValue>
          </StatusItem>
        </StatusSection>
        
        {/* Memory Status Section */}
        <StatusSection>
          <SectionTitle>Memory Status</SectionTitle>
          <StatusItem>
            <StatusLabel>Vector Database:</StatusLabel>
            <StatusValue>{metrics.memoryItems} items</StatusValue>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Context Window:</StatusLabel>
            <StatusValue>{settings.memory_settings.context_window_size} items</StatusValue>
          </StatusItem>
        </StatusSection>
        
        {/* External Services Section */}
        <StatusSection>
          <SectionTitle>External Services</SectionTitle>
          <StatusItem>
            <StatusLabel>LLM API:</StatusLabel>
            <StatusIndicator 
              active={settings.llm_settings.provider !== 'local'} 
              theme={theme}
            >
              {settings.llm_settings.provider !== 'local' ? 'Enabled' : 'Disabled'}
            </StatusIndicator>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Voice Services:</StatusLabel>
            <StatusIndicator 
              active={settings.voice_settings.enabled} 
              theme={theme}
            >
              {settings.voice_settings.enabled ? 'Enabled' : 'Disabled'}
            </StatusIndicator>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Web Search:</StatusLabel>
            <StatusIndicator 
              active={settings.search_settings.enabled} 
              theme={theme}
            >
              {settings.search_settings.enabled ? 'Enabled' : 'Disabled'}
            </StatusIndicator>
          </StatusItem>
          {(settings.llm_settings.provider !== 'local' || 
            settings.voice_settings.enabled || 
            settings.search_settings.enabled) && (
            <StatusItem>
              <StatusLabel>API Calls Today:</StatusLabel>
              <StatusValue>{metrics.apiCalls}</StatusValue>
            </StatusItem>
          )}
        </StatusSection>
        
        {/* Privacy Status Section */}
        <StatusSection>
          <SectionTitle>Privacy Status</SectionTitle>
          <StatusItem>
            <StatusLabel>Data Storage:</StatusLabel>
            <StatusIndicator 
              active={settings.privacy_settings.local_storage_only} 
              theme={theme}
            >
              {settings.privacy_settings.local_storage_only ? 'Local Only' : 'Cloud Backup'}
            </StatusIndicator>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Analytics:</StatusLabel>
            <StatusIndicator 
              active={!settings.privacy_settings.analytics_enabled} 
              theme={theme}
            >
              {settings.privacy_settings.analytics_enabled ? 'Enabled' : 'Disabled'}
            </StatusIndicator>
          </StatusItem>
          <StatusItem>
            <StatusLabel>Error Reporting:</StatusLabel>
            <StatusIndicator 
              active={!settings.privacy_settings.error_reporting} 
              theme={theme}
            >
              {settings.privacy_settings.error_reporting ? 'Enabled' : 'Disabled'}
            </StatusIndicator>
          </StatusItem>
        </StatusSection>
      </StatusContainer>
    </Card>
  );
};

export default SystemStatus;