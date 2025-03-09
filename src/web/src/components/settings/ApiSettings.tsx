import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import useSettings from '../../hooks/useSettings';
import useTheme from '../../hooks/useTheme';
import { SPACING, MD, LG } from '../../constants/uiConstants';
import { ButtonVariant, InputType } from '../../types/ui';

// Interfaces for component state
interface ApiKeyState {
  value: string;
  isVisible: boolean;
  isConnected: boolean;
  isTesting: boolean;
  error: string;
}

interface CloudCredentialsState {
  provider: string;
  accessKey: string;
  secretKey: string;
  region: string;
  bucket: string;
  isConnected: boolean;
  isTesting: boolean;
  error: string;
}

// Styled components
const ApiSettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
  width: 100%;
`;

const ApiSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

const SectionTitle = styled.h2`
  font-size: 1.2rem;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  font-size: 0.9rem;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.MD};
`;

const StatusIndicator = styled.div<{ connected: boolean }>`
  display: flex;
  align-items: center;
  gap: ${SPACING.MD};
  margin-top: ${SPACING.MD};
  font-size: 0.9rem;
  color: ${props => props.connected ? props.theme.colors.success.main : props.theme.colors.error.main};
`;

const PrivacyNote = styled.div`
  font-size: 0.8rem;
  margin-top: ${SPACING.MD};
  padding: ${SPACING.MD};
  background-color: ${props => props.theme.colors.background.default};
  border-radius: 4px;
  color: ${props => props.theme.colors.text.secondary};
`;

/**
 * Component for managing API keys and external service configurations
 * for the Personal AI Agent application.
 * 
 * This component provides a secure interface for users to store and manage 
 * API credentials for OpenAI, ElevenLabs, SerpAPI, and cloud storage services.
 */
const ApiSettings: React.FC = () => {
  // State for OpenAI API key
  const [openAiKey, setOpenAiKey] = useState<ApiKeyState>({
    value: '',
    isVisible: false,
    isConnected: false,
    isTesting: false,
    error: ''
  });

  // State for ElevenLabs API key
  const [elevenLabsKey, setElevenLabsKey] = useState<ApiKeyState>({
    value: '',
    isVisible: false,
    isConnected: false,
    isTesting: false,
    error: ''
  });

  // State for SerpAPI key
  const [serpApiKey, setSerpApiKey] = useState<ApiKeyState>({
    value: '',
    isVisible: false,
    isConnected: false,
    isTesting: false,
    error: ''
  });

  // State for cloud storage credentials
  const [cloudCredentials, setCloudCredentials] = useState<CloudCredentialsState>({
    provider: 'aws',
    accessKey: '',
    secretKey: '',
    region: '',
    bucket: '',
    isConnected: false,
    isTesting: false,
    error: ''
  });

  // Get settings and theme
  const { settings, updateLLM, updateVoice, updateSearch, updateStorage } = useSettings();
  const { theme } = useTheme();

  // Load existing API keys from settings
  useEffect(() => {
    if (settings) {
      // Load OpenAI key if it exists in LLM settings
      const llmSettings = settings.llm_settings;
      if (llmSettings && 'api_key' in llmSettings) {
        setOpenAiKey(prev => ({
          ...prev,
          value: llmSettings.api_key || '',
          isConnected: !!llmSettings.api_key
        }));
      }

      // Load ElevenLabs key if it exists in voice settings
      const voiceSettings = settings.voice_settings;
      if (voiceSettings && 'api_key' in voiceSettings) {
        setElevenLabsKey(prev => ({
          ...prev,
          value: voiceSettings.api_key || '',
          isConnected: !!voiceSettings.api_key
        }));
      }

      // Load SerpAPI key if it exists in search settings
      const searchSettings = settings.search_settings;
      if (searchSettings && 'api_key' in searchSettings) {
        setSerpApiKey(prev => ({
          ...prev,
          value: searchSettings.api_key || '',
          isConnected: !!searchSettings.api_key
        }));
      }

      // Load cloud storage settings if they exist
      const storageSettings = settings.storage_settings;
      if (storageSettings && storageSettings.cloud_provider) {
        setCloudCredentials(prev => ({
          ...prev,
          provider: storageSettings.cloud_provider || 'aws',
          accessKey: storageSettings.cloud_access_key || '',
          secretKey: storageSettings.cloud_secret_key || '',
          region: storageSettings.cloud_region || '',
          bucket: storageSettings.cloud_bucket || '',
          isConnected: !!storageSettings.cloud_access_key && 
                      !!storageSettings.cloud_secret_key
        }));
      }
    }
  }, [settings]);

  // Handle input changes
  const handleOpenAiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenAiKey(prev => ({ ...prev, value: e.target.value }));
  };

  const handleElevenLabsKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setElevenLabsKey(prev => ({ ...prev, value: e.target.value }));
  };

  const handleSerpApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerpApiKey(prev => ({ ...prev, value: e.target.value }));
  };

  const handleCloudCredentialsChange = (field: string, value: string) => {
    setCloudCredentials(prev => ({ ...prev, [field]: value }));
  };

  // Toggle visibility handlers
  const toggleOpenAiKeyVisibility = () => {
    setOpenAiKey(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  const toggleElevenLabsKeyVisibility = () => {
    setElevenLabsKey(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  const toggleSerpApiKeyVisibility = () => {
    setSerpApiKey(prev => ({ ...prev, isVisible: !prev.isVisible }));
  };

  // Save API keys to settings
  const saveOpenAiKey = async () => {
    try {
      // Update LLM settings with new API key
      if (settings.llm_settings) {
        const updatedSettings = {
          ...settings.llm_settings,
          api_key: openAiKey.value
        };
        await updateLLM(updatedSettings);
        setOpenAiKey(prev => ({ ...prev, error: '', isConnected: true }));
      }
    } catch (error) {
      setOpenAiKey(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to save API key',
        isConnected: false
      }));
    }
  };

  const saveElevenLabsKey = async () => {
    try {
      // Update voice settings with new API key
      if (settings.voice_settings) {
        const updatedSettings = {
          ...settings.voice_settings,
          api_key: elevenLabsKey.value
        };
        await updateVoice(updatedSettings);
        setElevenLabsKey(prev => ({ ...prev, error: '', isConnected: true }));
      }
    } catch (error) {
      setElevenLabsKey(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to save API key',
        isConnected: false
      }));
    }
  };

  const saveSerpApiKey = async () => {
    try {
      // Update search settings with new API key
      if (settings.search_settings) {
        const updatedSettings = {
          ...settings.search_settings,
          api_key: serpApiKey.value
        };
        await updateSearch(updatedSettings);
        setSerpApiKey(prev => ({ ...prev, error: '', isConnected: true }));
      }
    } catch (error) {
      setSerpApiKey(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to save API key',
        isConnected: false
      }));
    }
  };

  const saveCloudCredentials = async () => {
    try {
      // Update storage settings with new cloud credentials
      if (settings.storage_settings) {
        const updatedSettings = {
          ...settings.storage_settings,
          cloud_provider: cloudCredentials.provider,
          cloud_access_key: cloudCredentials.accessKey,
          cloud_secret_key: cloudCredentials.secretKey,
          cloud_region: cloudCredentials.region,
          cloud_bucket: cloudCredentials.bucket
        };
        await updateStorage(updatedSettings);
        setCloudCredentials(prev => ({ ...prev, error: '', isConnected: true }));
      }
    } catch (error) {
      setCloudCredentials(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to save cloud credentials',
        isConnected: false
      }));
    }
  };

  // Test API connections
  const testOpenAiConnection = async () => {
    setOpenAiKey(prev => ({ ...prev, isTesting: true, error: '' }));
    try {
      // Implement API call to test OpenAI connection
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${openAiKey.value}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }
      
      // Successful connection
      setOpenAiKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: true 
      }));
    } catch (error) {
      setOpenAiKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }));
    }
  };

  const testElevenLabsConnection = async () => {
    setElevenLabsKey(prev => ({ ...prev, isTesting: true, error: '' }));
    try {
      // Implement API call to test ElevenLabs connection
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': elevenLabsKey.value,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }
      
      // Successful connection
      setElevenLabsKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: true 
      }));
    } catch (error) {
      setElevenLabsKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }));
    }
  };

  const testSerpApiConnection = async () => {
    setSerpApiKey(prev => ({ ...prev, isTesting: true, error: '' }));
    try {
      // Implement API call to test SerpAPI connection
      const response = await fetch(
        `https://serpapi.com/search.json?engine=google&q=test&api_key=${serpApiKey.value}`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${await response.text()}`);
      }
      
      // Successful connection
      setSerpApiKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: true 
      }));
    } catch (error) {
      setSerpApiKey(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }));
    }
  };

  const testCloudConnection = async () => {
    setCloudCredentials(prev => ({ ...prev, isTesting: true, error: '' }));
    try {
      // Implementation would vary based on cloud provider
      // This would typically be handled by the backend API
      // For now, we'll simulate a successful connection after a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Placeholder for actual implementation
      if (!cloudCredentials.accessKey || !cloudCredentials.secretKey) {
        throw new Error('Access key and secret key are required');
      }
      
      // Successful connection
      setCloudCredentials(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: true 
      }));
    } catch (error) {
      setCloudCredentials(prev => ({ 
        ...prev, 
        isTesting: false, 
        isConnected: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      }));
    }
  };

  return (
    <ApiSettingsContainer>
      <Card title="API Settings">
        {/* OpenAI API Key */}
        <ApiSection>
          <SectionTitle>OpenAI API Key</SectionTitle>
          <SectionDescription>
            Required for LLM responses and text embeddings. 
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
              {' Get your API key here'}
            </a>.
          </SectionDescription>
          
          <Input
            id="openai-api-key"
            type={openAiKey.isVisible ? InputType.TEXT : InputType.PASSWORD}
            value={openAiKey.value}
            onChange={handleOpenAiKeyChange}
            placeholder="Enter your OpenAI API key"
            label="OpenAI API Key"
            error={openAiKey.error}
            endIcon={
              <Button 
                variant={ButtonVariant.ICON} 
                onClick={toggleOpenAiKeyVisibility}
                ariaLabel="Toggle visibility"
              >
                {openAiKey.isVisible ? 'Hide' : 'Show'}
              </Button>
            }
          />
          
          <ButtonGroup>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              onClick={saveOpenAiKey}
            >
              Save Key
            </Button>
            <Button 
              variant={ButtonVariant.SECONDARY} 
              onClick={testOpenAiConnection}
              disabled={!openAiKey.value || openAiKey.isTesting}
            >
              {openAiKey.isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </ButtonGroup>
          
          {(openAiKey.isConnected || openAiKey.error) && (
            <StatusIndicator connected={openAiKey.isConnected}>
              {openAiKey.isConnected ? '✓ Connected successfully' : `✗ ${openAiKey.error || 'Connection failed'}`}
            </StatusIndicator>
          )}
        </ApiSection>

        {/* ElevenLabs API Key */}
        <ApiSection>
          <SectionTitle>ElevenLabs API Key</SectionTitle>
          <SectionDescription>
            Required for high-quality text-to-speech voices.
            <a href="https://elevenlabs.io/subscription" target="_blank" rel="noopener noreferrer">
              {' Get your API key here'}
            </a>.
          </SectionDescription>
          
          <Input
            id="elevenlabs-api-key"
            type={elevenLabsKey.isVisible ? InputType.TEXT : InputType.PASSWORD}
            value={elevenLabsKey.value}
            onChange={handleElevenLabsKeyChange}
            placeholder="Enter your ElevenLabs API key"
            label="ElevenLabs API Key"
            error={elevenLabsKey.error}
            endIcon={
              <Button 
                variant={ButtonVariant.ICON} 
                onClick={toggleElevenLabsKeyVisibility}
                ariaLabel="Toggle visibility"
              >
                {elevenLabsKey.isVisible ? 'Hide' : 'Show'}
              </Button>
            }
          />
          
          <ButtonGroup>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              onClick={saveElevenLabsKey}
            >
              Save Key
            </Button>
            <Button 
              variant={ButtonVariant.SECONDARY} 
              onClick={testElevenLabsConnection}
              disabled={!elevenLabsKey.value || elevenLabsKey.isTesting}
            >
              {elevenLabsKey.isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </ButtonGroup>
          
          {(elevenLabsKey.isConnected || elevenLabsKey.error) && (
            <StatusIndicator connected={elevenLabsKey.isConnected}>
              {elevenLabsKey.isConnected ? '✓ Connected successfully' : `✗ ${elevenLabsKey.error || 'Connection failed'}`}
            </StatusIndicator>
          )}
        </ApiSection>

        {/* SerpAPI Key */}
        <ApiSection>
          <SectionTitle>SerpAPI Key</SectionTitle>
          <SectionDescription>
            Required for web search capabilities.
            <a href="https://serpapi.com/dashboard" target="_blank" rel="noopener noreferrer">
              {' Get your API key here'}
            </a>.
          </SectionDescription>
          
          <Input
            id="serpapi-key"
            type={serpApiKey.isVisible ? InputType.TEXT : InputType.PASSWORD}
            value={serpApiKey.value}
            onChange={handleSerpApiKeyChange}
            placeholder="Enter your SerpAPI key"
            label="SerpAPI Key"
            error={serpApiKey.error}
            endIcon={
              <Button 
                variant={ButtonVariant.ICON} 
                onClick={toggleSerpApiKeyVisibility}
                ariaLabel="Toggle visibility"
              >
                {serpApiKey.isVisible ? 'Hide' : 'Show'}
              </Button>
            }
          />
          
          <ButtonGroup>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              onClick={saveSerpApiKey}
            >
              Save Key
            </Button>
            <Button 
              variant={ButtonVariant.SECONDARY} 
              onClick={testSerpApiConnection}
              disabled={!serpApiKey.value || serpApiKey.isTesting}
            >
              {serpApiKey.isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </ButtonGroup>
          
          {(serpApiKey.isConnected || serpApiKey.error) && (
            <StatusIndicator connected={serpApiKey.isConnected}>
              {serpApiKey.isConnected ? '✓ Connected successfully' : `✗ ${serpApiKey.error || 'Connection failed'}`}
            </StatusIndicator>
          )}
        </ApiSection>

        {/* Cloud Storage Credentials */}
        <ApiSection>
          <SectionTitle>Cloud Storage Credentials</SectionTitle>
          <SectionDescription>
            Optional for encrypted backup and sync features.
          </SectionDescription>
          
          <Input
            id="cloud-provider"
            type={InputType.TEXT}
            value={cloudCredentials.provider}
            onChange={(e) => handleCloudCredentialsChange('provider', e.target.value)}
            placeholder="Cloud provider (aws, gcp, azure)"
            label="Cloud Provider"
          />
          
          <Input
            id="cloud-access-key"
            type={InputType.PASSWORD}
            value={cloudCredentials.accessKey}
            onChange={(e) => handleCloudCredentialsChange('accessKey', e.target.value)}
            placeholder="Enter your access key"
            label="Access Key"
          />
          
          <Input
            id="cloud-secret-key"
            type={InputType.PASSWORD}
            value={cloudCredentials.secretKey}
            onChange={(e) => handleCloudCredentialsChange('secretKey', e.target.value)}
            placeholder="Enter your secret key"
            label="Secret Key"
          />
          
          <Input
            id="cloud-region"
            type={InputType.TEXT}
            value={cloudCredentials.region}
            onChange={(e) => handleCloudCredentialsChange('region', e.target.value)}
            placeholder="Enter cloud region"
            label="Region"
          />
          
          <Input
            id="cloud-bucket"
            type={InputType.TEXT}
            value={cloudCredentials.bucket}
            onChange={(e) => handleCloudCredentialsChange('bucket', e.target.value)}
            placeholder="Enter bucket name"
            label="Bucket"
          />
          
          <ButtonGroup>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              onClick={saveCloudCredentials}
            >
              Save Credentials
            </Button>
            <Button 
              variant={ButtonVariant.SECONDARY} 
              onClick={testCloudConnection}
              disabled={!cloudCredentials.accessKey || !cloudCredentials.secretKey || cloudCredentials.isTesting}
            >
              {cloudCredentials.isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
          </ButtonGroup>
          
          {(cloudCredentials.isConnected || cloudCredentials.error) && (
            <StatusIndicator connected={cloudCredentials.isConnected}>
              {cloudCredentials.isConnected ? '✓ Connected successfully' : `✗ ${cloudCredentials.error || 'Connection failed'}`}
            </StatusIndicator>
          )}
        </ApiSection>

        <PrivacyNote>
          <strong>Privacy Note:</strong> All API keys are stored securely on your device and are only used to authenticate with the respective services.
          Your keys are never shared with third parties.
        </PrivacyNote>
      </Card>
    </ApiSettingsContainer>
  );
};

export default ApiSettings;