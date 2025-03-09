import React, { useState } from 'react'; // react version ^18.2.0
import styled from 'styled-components';
import VoiceSettings from './VoiceSettings';
import PersonalitySettings from './PersonalitySettings';
import PrivacySettings from './PrivacySettings';
import StorageSettings from './StorageSettings';
import ApiSettings from './ApiSettings';
import AdvancedSettings from './AdvancedSettings';
import DataManagement from './DataManagement';
import Tabs from '../ui/Tabs';
import Card from '../ui/Card';
import { TabOrientation, Tab } from '../../types/ui';
import { SPACING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';
import useMediaQuery from '../../hooks/useMediaQuery';
import { FiUser, FiVolume2, FiLock, FiDatabase, FiKey, FiSettings, FiHardDrive } from 'react-icons/fi'; // react-icons/fi version ^4.8.0

// Interface for configuration of settings tabs
interface SettingsTabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// Styled component for the main settings panel container
const SettingsPanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${SPACING.MD};

  @media (min-width: 768px) {
    flex-direction: row;
    gap: ${SPACING.LG};
  }
`;

// Styled component for the tabs container
const TabsContainer = styled.div`
  flex-shrink: 0;

  @media (min-width: 768px) {
    width: 220px;
  }
`;

// Styled component for the content container
const ContentContainer = styled.div`
  flex: 1;
  padding: ${SPACING.MD};
  overflow-y: auto;
  max-height: calc(100vh - 200px);

  @media (max-width: 767px) {
    margin-top: ${SPACING.MD};
  }
`;

// Styled component for the tab content
const TabContent = styled.div`
  animation: fadeIn 0.3s ease-in-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

// Styled component for the settings title
const SettingsTitle = styled.h1`
  font-size: 1.5rem;
  margin-bottom: ${SPACING.LG};
  color: ${props => props.theme.colors.text.primary};
  font-weight: 600;
`;

/**
 * Main settings panel component with tabbed navigation
 * @returns Rendered settings panel component
 */
const SettingsPanel: React.FC = () => {
  // State for the currently active tab
  const [activeTab, setActiveTab] = useState<string>('voice');

  // Get the current theme
  const { theme } = useTheme();

  // Check if the screen is mobile-sized
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Configuration for the settings tabs
  const SETTINGS_TABS: Tab[] = [
    { id: 'voice', label: 'Voice', icon: <FiVolume2 /> },
    { id: 'personality', label: 'Personality', icon: <FiUser /> },
    { id: 'privacy', label: 'Privacy', icon: <FiLock /> },
    { id: 'storage', label: 'Storage', icon: <FiDatabase /> },
    { id: 'api', label: 'API Keys', icon: <FiKey /> },
    { id: 'advanced', label: 'Advanced', icon: <FiSettings /> },
    { id: 'data', label: 'Data Management', icon: <FiHardDrive /> },
  ];

  // Handler for tab selection change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <SettingsPanelContainer theme={theme}>
      <TabsContainer theme={theme}>
        <Tabs
          tabs={SETTINGS_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          orientation={isMobile ? TabOrientation.HORIZONTAL : TabOrientation.VERTICAL}
        />
      </TabsContainer>
      <ContentContainer theme={theme}>
        <TabContent>
          <SettingsTitle theme={theme}>Settings</SettingsTitle>
          {activeTab === 'voice' && <VoiceSettings />}
          {activeTab === 'personality' && <PersonalitySettings />}
          {activeTab === 'privacy' && <PrivacySettings />}
          {activeTab === 'storage' && <StorageSettings />}
          {activeTab === 'api' && <ApiSettings />}
          {activeTab === 'advanced' && <AdvancedSettings />}
          {activeTab === 'data' && <DataManagement />}
        </TabContent>
      </ContentContainer>
    </SettingsPanelContainer>
  );
};

export default SettingsPanel;