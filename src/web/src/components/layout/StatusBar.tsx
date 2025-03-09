import React from 'react';
import styled from 'styled-components';
import { FiInfo, FiAlertTriangle, FiDatabase, FiCloud } from 'react-icons/fi';
import useTheme from '../../hooks/useTheme';
import useSettingsStore from '../../store/settingsStore';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/uiConstants';

// Props interface for the StatusBar component
interface StatusBarProps {
  className?: string;
  showWebStatus?: boolean;
  customMessage?: string;
}

// Styled container for the status bar
const StatusBarContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 ${SPACING.SM};
  font-size: ${FONT_SIZE.XS};
  background-color: ${props => props.theme.colors.background.paper};
  border-top: 1px solid ${props => props.theme.colors.divider};
  z-index: 10;
`;

// Styled container for individual status items
const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${SPACING.XS};
`;

// Styled indicator for status types (local, external, etc.)
const StatusIndicator = styled.span<{
  $type: 'local' | 'external' | 'warning';
}>`
  display: flex;
  align-items: center;
  padding: 2px ${SPACING.XS};
  border-radius: ${BORDER_RADIUS.SMALL};
  background-color: ${props => getIndicatorColor(props)};
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
  gap: 4px;
`;

// Returns the appropriate background color for status indicators based on type
const getIndicatorColor = (props: { $type: 'local' | 'external' | 'warning'; theme: any }) => {
  switch (props.$type) {
    case 'local':
      return props.theme.colors.privacy.local;
    case 'external':
      return props.theme.colors.privacy.external;
    case 'warning':
      return props.theme.colors.privacy.warning;
    default:
      return props.theme.colors.privacy.local;
  }
};

// Returns the appropriate status message based on settings
const getStatusMessage = (settings: any) => {
  if (settings.privacy_settings.local_storage_only) {
    return 'All data stored locally';
  }
  if (settings.storage_settings.backup_enabled) {
    return 'Data stored locally with encrypted backup';
  }
  return 'Data storage';
};

/**
 * StatusBar component that displays privacy and storage information at the bottom of the application.
 * Provides visual indicators for local-only storage, cloud backup status, and external service usage.
 */
const StatusBar: React.FC<StatusBarProps> = ({
  className,
  showWebStatus = true,
  customMessage
}) => {
  const { theme } = useTheme();
  const { settings } = useSettingsStore();
  
  // Determine storage status
  const isLocalOnly = settings.privacy_settings.local_storage_only;
  const hasCloudBackup = settings.storage_settings.backup_enabled;
  
  // Determine if web search is enabled
  const webSearchEnabled = settings.search_settings.enabled;
  
  // Determine if external services are being used
  const usingExternalLLM = !settings.llm_settings.use_local_llm;
  
  // Determine if any external service warning is needed
  const showExternalWarning = usingExternalLLM || webSearchEnabled || hasCloudBackup;
  
  return (
    <StatusBarContainer className={className} aria-label="Privacy and storage status">
      {/* Left side - Storage info */}
      <StatusItem>
        <FiInfo size={14} aria-hidden="true" />
        <span>{customMessage || getStatusMessage(settings)}</span>
      </StatusItem>
      
      {/* Right side - Status indicators */}
      <StatusItem>
        {isLocalOnly && !showExternalWarning && (
          <StatusIndicator $type="local" aria-label="Local storage only">
            <FiDatabase size={12} aria-hidden="true" />
            LOCAL ONLY
          </StatusIndicator>
        )}
        
        {hasCloudBackup && (
          <StatusIndicator $type="external" aria-label="Cloud backup enabled">
            <FiCloud size={12} aria-hidden="true" />
            CLOUD BACKUP
          </StatusIndicator>
        )}
        
        {showWebStatus && (
          <StatusIndicator 
            $type={webSearchEnabled ? 'external' : 'local'} 
            aria-label={`Web search ${webSearchEnabled ? 'enabled' : 'disabled'}`}
          >
            {webSearchEnabled && <FiAlertTriangle size={12} aria-hidden="true" />}
            WEB: {webSearchEnabled ? 'ON' : 'OFF'}
          </StatusIndicator>
        )}
        
        {usingExternalLLM && !webSearchEnabled && (
          <StatusIndicator $type="external" aria-label="Using external AI service">
            <FiAlertTriangle size={12} aria-hidden="true" />
            EXTERNAL AI
          </StatusIndicator>
        )}
      </StatusItem>
    </StatusBarContainer>
  );
};

export default StatusBar;