import React, { useEffect } from 'react'; // react version ^18.2.0
import { Metadata } from 'next'; // next version ^14.0.0
import styled from 'styled-components';
import SettingsPanel from '../../components/settings/SettingsPanel';
import useSettingsStore from '../../store/settingsStore';

// Define metadata for the settings page
export const metadata: Metadata = {
  title: 'Settings - Personal AI Agent',
  description: 'Customize your Personal AI Agent with voice, personality, privacy, and storage settings',
};

// Define constants for page title and description
const PAGE_TITLE = 'Settings - Personal AI Agent';
const PAGE_DESCRIPTION = 'Customize your Personal AI Agent with voice, personality, privacy, and storage settings';

// Styled component for the main settings container
const SettingsContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  min-height: calc(100vh - 120px);
`;

// Styled component for the loading container
const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
`;

// Styled component for the error container
const ErrorContainer = styled.div`
  padding: 1rem;
  margin: 2rem auto;
  max-width: 600px;
  background-color: #fee2e2;
  border: 1px solid #ef4444;
  border-radius: 0.5rem;
  color: #b91c1c;
`;

/**
 * Main settings page component that renders the SettingsPanel
 * @returns Rendered settings page with SettingsPanel component
 */
const SettingsPage: React.FC = () => {
  // Access loadSettings, isLoading, and error from useSettingsStore
  const loadSettings = useSettingsStore(state => state.loadSettings);
  const isLoading = useSettingsStore(state => state.isLoading);
  const error = useSettingsStore(state => state.error);

  // Use useEffect to load settings when component mounts
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Render loading state if settings are being loaded
  if (isLoading) {
    return (
      <SettingsContainer>
        <LoadingContainer>
          <div>Loading settings...</div>
        </LoadingContainer>
      </SettingsContainer>
    );
  }

  // Render error message if settings failed to load
  if (error) {
    return (
      <SettingsContainer>
        <ErrorContainer>
          Error loading settings: {error.message}
        </ErrorContainer>
      </SettingsContainer>
    );
  }

  // Render the SettingsPanel component as the main content
  return (
    <SettingsContainer>
      <SettingsPanel />
    </SettingsContainer>
  );
};

export default SettingsPage;