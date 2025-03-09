import React, { useState, useEffect, useCallback } from 'react'; // react version ^18.2.0
import styled from 'styled-components';
import { SPACING } from '../../constants/uiConstants';
import useSettings from '../../hooks/useSettings';
import useVoice from '../../hooks/useVoice';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import Slider from '../ui/Slider';
import Button from '../ui/Button';
import Card from '../ui/Card';
import {
  VoiceProvider,
  VoiceSettings as VoiceSettingsType,
} from '../../types/settings';

// Define the VoiceOption interface
interface VoiceOption {
  value: string;
  label: string;
  provider: string;
}

// Define the ProviderOption interface
interface ProviderOption {
  value: string;
  label: string;
}

// Styled Components for layout and appearance
const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
`;

const SettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: ${props => props.theme.colors.text.primary};
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
`;

const SettingLabel = styled.div`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.primary};
`;

const SettingDescription = styled.div`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 0.25rem;
`;

const SliderContainer = styled.div`
  width: 100%;
  margin: 0.5rem 0;
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 0.25rem;
`;

const TestVoiceContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  background-color: ${props => props.theme.colors.background.paper};
  border-radius: 0.5rem;
`;

const TestInputRow = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const TestInput = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: 0.25rem;
  font-size: 0.875rem;
  &:focus { outline: none; border-color: ${props => props.theme.colors.primary.main}; }
`;

const UnsupportedMessage = styled.div`
  padding: 1rem;
  background-color: ${props => props.theme.colors.warning.light};
  color: ${props => props.theme.colors.warning.dark};
  border-radius: 0.25rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

/**
 * VoiceSettings Component
 *
 * This component provides a user interface for configuring voice-related settings
 * in the Personal AI Agent. It allows users to enable/disable voice features,
 * select voice providers, customize voice characteristics, and test voice output.
 */
const VoiceSettings: React.FC = () => {
  // Access settings and update functions using the useSettings hook
  const { settings, updateVoice } = useSettings();

  // Access voice functionality using the useVoice hook
  const { speak, isSupported } = useVoice();

  // Local state for test message input
  const [testMessage, setTestMessage] = useState('Hello, I am the Personal AI Agent.');

  // Handler for toggling voice features on/off
  const handleVoiceEnabledChange = useCallback((checked: boolean) => {
    updateVoice({ ...settings.voice_settings, enabled: checked });
  }, [settings, updateVoice]);

  // Handler for toggling voice input on/off
  const handleVoiceInputEnabledChange = useCallback((checked: boolean) => {
    updateVoice({ ...settings.voice_settings, input_enabled: checked });
  }, [settings, updateVoice]);

  // Handler for toggling voice output on/off
  const handleVoiceOutputEnabledChange = useCallback((checked: boolean) => {
    updateVoice({ ...settings.voice_settings, output_enabled: checked });
  }, [settings, updateVoice]);

  // Handler for changing voice provider
  const handleVoiceProviderChange = useCallback((provider: string) => {
    updateVoice({ ...settings.voice_settings, provider: provider as VoiceProvider });
  }, [settings, updateVoice]);

  // Handler for changing voice ID
  const handleVoiceIdChange = useCallback((voiceId: string) => {
    updateVoice({ ...settings.voice_settings, voice_id: voiceId });
  }, [settings, updateVoice]);

  // Handler for adjusting voice speed
  const handleVoiceSpeedChange = useCallback((speed: number) => {
    updateVoice({ ...settings.voice_settings, speed: speed });
  }, [settings, updateVoice]);

  // Handler for adjusting voice pitch
  const handleVoicePitchChange = useCallback((pitch: number) => {
    updateVoice({ ...settings.voice_settings, pitch: pitch });
  }, [settings, updateVoice]);

  // Handler for testing voice output with current settings
  const handleTestVoice = useCallback(() => {
    speak(testMessage);
  }, [speak, testMessage]);

  // Handler for toggling local TTS/STT options
  const handleLocalTTSSTTChange = useCallback((localTTS: boolean, localSTT: boolean) => {
    updateVoice({ ...settings.voice_settings, local_tts_enabled: localTTS, local_stt_enabled: localSTT });
  }, [settings, updateVoice]);

  // Define voice provider options
  const providerOptions: ProviderOption[] = [
    { value: VoiceProvider.SYSTEM, label: 'System Default' },
    { value: VoiceProvider.ELEVENLABS, label: 'ElevenLabs' },
    { value: VoiceProvider.COQUI, label: 'Coqui' },
  ];

  // Define voice options based on the selected provider (replace with actual data)
  const voiceOptions: VoiceOption[] = [
    { value: 'default', label: 'Default Voice', provider: VoiceProvider.SYSTEM },
    { value: 'professional', label: 'Professional Voice', provider: VoiceProvider.SYSTEM },
    { value: 'friendly', label: 'Friendly Voice', provider: VoiceProvider.SYSTEM },
  ];

  // Render the settings form with appropriate sections
  return (
    <SettingsContainer>
      <Card title="Voice Settings">
        {/* Main toggle for enabling/disabling voice features */}
        <SettingsSection>
          <SettingRow>
            <SettingLabel>Enable Voice Features</SettingLabel>
            <Toggle
              id="voice-enabled"
              checked={settings.voice_settings.enabled}
              onChange={handleVoiceEnabledChange}
            />
          </SettingRow>
        </SettingsSection>

        {/* Input/Output toggles when voice is enabled */}
        {settings.voice_settings.enabled && (
          <>
            <SettingsSection>
              <SettingRow>
                <SettingLabel>Enable Voice Input</SettingLabel>
                <Toggle
                  id="voice-input-enabled"
                  checked={settings.voice_settings.input_enabled}
                  onChange={handleVoiceInputEnabledChange}
                />
              </SettingRow>

              <SettingRow>
                <SettingLabel>Enable Voice Output</SettingLabel>
                <Toggle
                  id="voice-output-enabled"
                  checked={settings.voice_settings.output_enabled}
                  onChange={handleVoiceOutputEnabledChange}
                />
              </SettingRow>
            </SettingsSection>

            {/* Voice provider selection when output is enabled */}
            {settings.voice_settings.output_enabled && (
              <SettingsSection>
                <SectionTitle>Voice Output Settings</SectionTitle>
                <SettingRow>
                  <SettingLabel>Voice Provider</SettingLabel>
                  <Select
                    id="voice-provider"
                    options={providerOptions}
                    value={settings.voice_settings.provider}
                    onChange={handleVoiceProviderChange}
                  />
                </SettingRow>

                {/* Voice selection dropdown when output is enabled */}
                <SettingRow>
                  <SettingLabel>Voice</SettingLabel>
                  <Select
                    id="voice-id"
                    options={voiceOptions}
                    value={settings.voice_settings.voice_id}
                    onChange={handleVoiceIdChange}
                  />
                </SettingRow>

                {/* Voice characteristic sliders (speed, pitch) when output is enabled */}
                <SettingRow>
                  <SettingLabel>Voice Speed</SettingLabel>
                  <SliderContainer>
                    <Slider
                      id="voice-speed"
                      value={settings.voice_settings.speed}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      onChange={handleVoiceSpeedChange}
                    />
                    <SliderLabels>
                      <span>Slower</span>
                      <span>Faster</span>
                    </SliderLabels>
                  </SliderContainer>
                </SettingRow>

                <SettingRow>
                  <SettingLabel>Voice Pitch</SettingLabel>
                  <SliderContainer>
                    <Slider
                      id="voice-pitch"
                      value={settings.voice_settings.pitch}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      onChange={handleVoicePitchChange}
                    />
                    <SliderLabels>
                      <span>Lower</span>
                      <span>Higher</span>
                    </SliderLabels>
                  </SliderContainer>
                </SettingRow>

                {/* Voice testing section when output is enabled */}
                <TestVoiceContainer>
                  <SectionTitle>Test Voice</SectionTitle>
                  <TestInputRow>
                    <TestInput
                      type="text"
                      placeholder="Enter text to test"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                    <Button onClick={handleTestVoice}>Test</Button>
                  </TestInputRow>
                </TestVoiceContainer>
              </SettingsSection>
            )}
          </>
        )}
      </Card>
    </SettingsContainer>
  );
};

export default VoiceSettings;