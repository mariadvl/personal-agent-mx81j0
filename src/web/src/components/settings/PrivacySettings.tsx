import React, { useState } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Toggle from '../ui/Toggle';
import useSettingsStore from '../../store/settingsStore';
import { PrivacySettings as PrivacySettingsType } from '../../types/settings';
import { SPACING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Styled components for layout and styling
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
  width: 100%;
`;

const SettingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${SPACING.MD} 0;
`;

const SettingLabel = styled.div`
  flex: 1;
  font-weight: ${props => props.theme.typography.fontWeightMedium};
`;

const SettingDescription = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: ${props => props.theme.typography.body2.fontSize};
  margin-top: ${SPACING.MD};
`;

const WarningIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  color: ${props => props.theme.colors.warning.main};
  font-size: ${props => props.theme.typography.caption.fontSize};
  margin-left: ${SPACING.MD};
`;

const DataRetentionContainer = styled.div`
  margin-top: ${SPACING.MD};
  border-top: 1px solid ${props => props.theme.colors.divider};
  padding-top: ${SPACING.MD};
`;

const SectionTitle = styled.h3`
  font-size: ${props => props.theme.typography.h6.fontSize};
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
`;

/**
 * PrivacySettings component provides a user interface for configuring privacy-related
 * settings in the application, including data storage, analytics, and data collection
 * preferences.
 */
const PrivacySettings: React.FC = () => {
  const { theme } = useTheme();
  const { settings, updatePrivacySettings } = useSettingsStore();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsType>(settings.privacy_settings);

  // Handler for local storage toggle
  const handleLocalStorageToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      local_storage_only: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for analytics toggle
  const handleAnalyticsToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      analytics_enabled: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for error reporting toggle
  const handleErrorReportingToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      error_reporting: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for data collection toggle
  const handleDataCollectionToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      data_collection: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for usage statistics toggle
  const handleUsageStatisticsToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      usage_statistics: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for content analysis toggle
  const handleContentAnalysisToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      content_analysis: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  // Handler for personalization toggle
  const handlePersonalizationToggle = (checked: boolean) => {
    const updatedSettings = {
      ...privacySettings,
      personalization: checked
    };
    setPrivacySettings(updatedSettings);
    updatePrivacySettings(updatedSettings);
  };

  return (
    <Container>
      <Card title="Data Storage">
        <SettingGroup>
          <SettingRow>
            <SettingLabel>Store all data locally only</SettingLabel>
            <Toggle 
              id="local-storage-toggle"
              checked={privacySettings.local_storage_only}
              onChange={handleLocalStorageToggle}
            />
          </SettingRow>
          <SettingDescription>
            When enabled, all your data will be stored exclusively on your device. 
            No data will be sent to external servers or cloud storage.
          </SettingDescription>
        </SettingGroup>
      </Card>

      <Card title="Analytics & Reporting">
        <SettingGroup>
          <SettingRow>
            <SettingLabel>
              Enable analytics
              {!privacySettings.local_storage_only && (
                <WarningIndicator>
                  ⚠️ Sends data externally
                </WarningIndicator>
              )}
            </SettingLabel>
            <Toggle 
              id="analytics-toggle"
              checked={privacySettings.analytics_enabled}
              onChange={handleAnalyticsToggle}
              disabled={privacySettings.local_storage_only}
            />
          </SettingRow>
          <SettingDescription>
            Allows collection of anonymous usage data to help improve the application.
            This includes features used and performance metrics but no personal content.
          </SettingDescription>

          <SettingRow>
            <SettingLabel>
              Enable error reporting
              {!privacySettings.local_storage_only && (
                <WarningIndicator>
                  ⚠️ Sends data externally
                </WarningIndicator>
              )}
            </SettingLabel>
            <Toggle 
              id="error-reporting-toggle"
              checked={privacySettings.error_reporting}
              onChange={handleErrorReportingToggle}
              disabled={privacySettings.local_storage_only}
            />
          </SettingRow>
          <SettingDescription>
            Automatically send error reports to help identify and fix issues.
            Reports may include technical information about the error but no personal content.
          </SettingDescription>
        </SettingGroup>
      </Card>

      <Card title="Data Collection & Usage">
        <SettingGroup>
          <SettingRow>
            <SettingLabel>
              Allow data collection
              {!privacySettings.local_storage_only && (
                <WarningIndicator>
                  ⚠️ Sends data externally
                </WarningIndicator>
              )}
            </SettingLabel>
            <Toggle 
              id="data-collection-toggle"
              checked={privacySettings.data_collection}
              onChange={handleDataCollectionToggle}
              disabled={privacySettings.local_storage_only}
            />
          </SettingRow>
          <SettingDescription>
            Permits the collection of non-personal data to improve AI capabilities.
            This does not include your conversations or personal information.
          </SettingDescription>

          <SettingRow>
            <SettingLabel>
              Share usage statistics
              {!privacySettings.local_storage_only && (
                <WarningIndicator>
                  ⚠️ Sends data externally
                </WarningIndicator>
              )}
            </SettingLabel>
            <Toggle 
              id="usage-statistics-toggle"
              checked={privacySettings.usage_statistics}
              onChange={handleUsageStatisticsToggle}
              disabled={privacySettings.local_storage_only}
            />
          </SettingRow>
          <SettingDescription>
            Share anonymous statistics about how you use the application to help prioritize features.
          </SettingDescription>

          <SettingRow>
            <SettingLabel>
              Enable content analysis
              {!privacySettings.local_storage_only && (
                <WarningIndicator>
                  ⚠️ Sends data externally
                </WarningIndicator>
              )}
            </SettingLabel>
            <Toggle 
              id="content-analysis-toggle"
              checked={privacySettings.content_analysis}
              onChange={handleContentAnalysisToggle}
              disabled={privacySettings.local_storage_only}
            />
          </SettingRow>
          <SettingDescription>
            Allows analyzing your content to improve AI responses. No personally identifiable 
            information is extracted or stored.
          </SettingDescription>
        </SettingGroup>
      </Card>

      <Card title="Personalization">
        <SettingGroup>
          <SettingRow>
            <SettingLabel>Enable personalization</SettingLabel>
            <Toggle 
              id="personalization-toggle"
              checked={privacySettings.personalization}
              onChange={handlePersonalizationToggle}
            />
          </SettingRow>
          <SettingDescription>
            Allows the AI to learn from your interactions to provide more relevant and personalized 
            responses over time. All personalization data is stored locally on your device.
          </SettingDescription>
          
          <DataRetentionContainer>
            <SectionTitle>Data Retention</SectionTitle>
            <SettingDescription>
              Your conversation history is stored {privacySettings.data_retention.conversations} by default.
              Document data is kept {privacySettings.data_retention.documents}.
              Web content is retained for {privacySettings.data_retention.web_content}.
              Search history is stored for {privacySettings.data_retention.search_history}.
            </SettingDescription>
          </DataRetentionContainer>
        </SettingGroup>
      </Card>
    </Container>
  );
};

export default PrivacySettings;