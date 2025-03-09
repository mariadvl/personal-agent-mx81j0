import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import Input from '../ui/Input';
import useSettings from '../../hooks/useSettings';
import useTheme from '../../hooks/useTheme';
import { 
  StorageSettings as StorageSettingsType,
  BackupFrequency,
  BackupLocation
} from '../../types/settings';
import { SelectOption, InputType } from '../../types/ui';
import { SPACING } from '../../constants/uiConstants';

// Styled components
const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
`;

const SettingsSection = styled.div`
  margin-bottom: ${SPACING.LG};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${SPACING.MD};
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SettingRow = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: ${SPACING.MD};
`;

const SettingLabel = styled.label`
  font-size: 0.9rem;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${SPACING.LG};
`;

const SaveButton = styled.button`
  background-color: ${props => props.theme.colors.primary.main};
  color: ${props => props.theme.colors.common.white};
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  &:hover {
    background-color: ${props => props.theme.colors.primary.dark};
  }
`;

const StorageSettings: React.FC = () => {
  const { settings, updateStorage } = useSettings();
  const { theme } = useTheme();
  
  // Form state
  const [formValues, setFormValues] = useState<StorageSettingsType>(settings.storage_settings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloudOptions, setShowCloudOptions] = useState(false);
  
  // Initialize form values from settings
  useEffect(() => {
    setFormValues(settings.storage_settings);
  }, [settings.storage_settings]);
  
  // Update cloud options visibility based on backup settings
  useEffect(() => {
    setShowCloudOptions(
      formValues.backup_enabled && 
      (formValues.backup_location === BackupLocation.CLOUD || 
       formValues.backup_location === BackupLocation.BOTH)
    );
  }, [formValues.backup_location, formValues.backup_enabled]);
  
  // Handle toggle change
  const handleToggleChange = (field: string, value: boolean) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle select change
  const handleSelectChange = (field: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle input change
  const handleInputChange = (field: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'number' 
      ? parseFloat(event.target.value) 
      : event.target.value;
      
    setFormValues(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      await updateStorage(formValues);
    } catch (error) {
      console.error('Failed to update storage settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Define select options
  const backupFrequencyOptions: SelectOption[] = [
    { value: BackupFrequency.DAILY, label: 'Daily' },
    { value: BackupFrequency.WEEKLY, label: 'Weekly' },
    { value: BackupFrequency.MONTHLY, label: 'Monthly' },
    { value: BackupFrequency.MANUAL, label: 'Manual only' }
  ];
  
  const backupLocationOptions: SelectOption[] = [
    { value: BackupLocation.LOCAL, label: 'Local only' },
    { value: BackupLocation.CLOUD, label: 'Cloud only' },
    { value: BackupLocation.BOTH, label: 'Local and cloud' }
  ];
  
  const cloudProviderOptions: SelectOption[] = [
    { value: 's3', label: 'S3 Compatible' },
    { value: 'dropbox', label: 'Dropbox' },
    { value: 'google', label: 'Google Drive' }
  ];
  
  const cloudRegionOptions: SelectOption[] = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'eu-west-1', label: 'EU (Ireland)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' }
  ];
  
  return (
    <Card title="Storage & Backup">
      <form onSubmit={handleSubmit}>
        <SettingsContainer>
          {/* Basic Storage Settings */}
          <SettingsSection>
            <SectionTitle>Basic Storage Settings</SectionTitle>
            <SettingsGrid>
              <SettingRow>
                <Input
                  id="base_path"
                  label="Storage Location"
                  value={formValues.base_path}
                  onChange={(e) => handleInputChange('base_path', e)}
                  type={InputType.TEXT}
                />
              </SettingRow>
              
              <SettingRow>
                <Toggle
                  id="auto_cleanup"
                  label="Automatic Storage Cleanup"
                  checked={formValues.auto_cleanup}
                  onChange={(value) => handleToggleChange('auto_cleanup', value)}
                />
                
                {formValues.auto_cleanup && (
                  <Input
                    id="cleanup_threshold_gb"
                    label="Cleanup Threshold (GB)"
                    value={formValues.cleanup_threshold_gb.toString()}
                    onChange={(e) => handleInputChange('cleanup_threshold_gb', e)}
                    type={InputType.NUMBER}
                  />
                )}
              </SettingRow>
            </SettingsGrid>
          </SettingsSection>
          
          {/* Backup Settings */}
          <SettingsSection>
            <SectionTitle>Backup Settings</SectionTitle>
            <SettingsGrid>
              <SettingRow>
                <Toggle
                  id="backup_enabled"
                  label="Enable Automatic Backup"
                  checked={formValues.backup_enabled}
                  onChange={(value) => handleToggleChange('backup_enabled', value)}
                />
              </SettingRow>
              
              {formValues.backup_enabled && (
                <>
                  <SettingRow>
                    <Select
                      id="backup_frequency"
                      label="Backup Frequency"
                      options={backupFrequencyOptions}
                      value={formValues.backup_frequency}
                      onChange={(value) => handleSelectChange('backup_frequency', value)}
                    />
                  </SettingRow>
                  
                  <SettingRow>
                    <Input
                      id="backup_count"
                      label="Number of Backups to Keep"
                      value={formValues.backup_count.toString()}
                      onChange={(e) => handleInputChange('backup_count', e)}
                      type={InputType.NUMBER}
                    />
                  </SettingRow>
                  
                  <SettingRow>
                    <Select
                      id="backup_location"
                      label="Backup Location"
                      options={backupLocationOptions}
                      value={formValues.backup_location}
                      onChange={(value) => handleSelectChange('backup_location', value)}
                    />
                  </SettingRow>
                </>
              )}
            </SettingsGrid>
          </SettingsSection>
          
          {/* Cloud Settings */}
          {showCloudOptions && (
            <SettingsSection>
              <SectionTitle>Cloud Settings</SectionTitle>
              <SettingsGrid>
                <SettingRow>
                  <Select
                    id="cloud_provider"
                    label="Cloud Provider"
                    options={cloudProviderOptions}
                    value={formValues.cloud_provider}
                    onChange={(value) => handleSelectChange('cloud_provider', value)}
                  />
                </SettingRow>
                
                <SettingRow>
                  <Select
                    id="cloud_region"
                    label="Cloud Region"
                    options={cloudRegionOptions}
                    value={formValues.cloud_region}
                    onChange={(value) => handleSelectChange('cloud_region', value)}
                  />
                </SettingRow>
                
                <SettingRow>
                  <Toggle
                    id="encryption_enabled"
                    label="Enable End-to-End Encryption"
                    checked={formValues.encryption_enabled}
                    onChange={(value) => handleToggleChange('encryption_enabled', value)}
                  />
                </SettingRow>
                
                <SettingRow>
                  <Toggle
                    id="compression_enabled"
                    label="Enable Compression"
                    checked={formValues.compression_enabled}
                    onChange={(value) => handleToggleChange('compression_enabled', value)}
                  />
                </SettingRow>
              </SettingsGrid>
            </SettingsSection>
          )}
          
          <ButtonContainer>
            <SaveButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </SaveButton>
          </ButtonContainer>
        </SettingsContainer>
      </form>
    </Card>
  );
};

export default StorageSettings;