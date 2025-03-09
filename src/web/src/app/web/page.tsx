import React from 'react'; // react version ^18.2.0
import { Metadata } from 'next'; // next version ^14.0.0

import WebReader from '../../components/web/WebReader';
import useSettingsStore from '../../store/settingsStore';

/**
 * Defines metadata for the web page including title and description
 * @returns {object} Metadata object with title and description
 */
export const metadata: Metadata = {
  title: 'Web Reader - Personal AI Agent',
  description: 'Extract and analyze content from web pages',
};

/**
 * Main page component for the Web Reader interface
 * @returns {JSX.Element} Rendered web page with WebReader component
 */
const WebPage: React.FC = () => {
  // IE1: Access settings from useSettingsStore to get web extraction preferences
  const { settings } = useSettingsStore();

  // IE1: Extract relevant settings like includeImages, maxContentLength, generateSummary
  const { includeImages, maxContentLength, generateSummary } = settings.llm_settings;

  // IE1: Extract privacy settings to determine if external service warnings should be shown
  const { local_storage_only } = settings.privacy_settings;

  // LD1: Set showExternalServiceWarning based on privacy settings
  const showExternalServiceWarning = !local_storage_only;

  // LD1: Apply responsive styling for different screen sizes
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  };

  return (
    <div style={containerStyle} aria-label="Web Reader Interface">
      {/* LD1: Render the WebReader component with settings passed as props */}
      {/* LD1: Configure WebReader with user preferences from settings store */}
      <WebReader
        includeImages={includeImages}
        maxContentLength={maxContentLength}
        generateSummary={generateSummary}
        showExternalServiceWarning={showExternalServiceWarning}
      />
    </div>
  );
};

export default WebPage;