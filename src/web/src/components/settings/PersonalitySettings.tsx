import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Select from '../ui/Select';
import Slider from '../ui/Slider';
import RadioGroup from '../ui/RadioGroup';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useSettingsStore } from '../../store/settingsStore';
import {
  PersonalitySettings as PersonalitySettingsType,
  PersonalityStyle,
  Formality,
  Verbosity,
  HumorLevel,
  EmpathyLevel,
  CreativityLevel,
  ExpertiseLevel
} from '../../types/settings';
import { SelectOption, RadioOption } from '../../types/ui';
import { SPACING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Interface for local form state
interface PersonalityFormState {
  name: string;
  style: PersonalityStyle;
  formality: Formality;
  verbosity: Verbosity;
  humor: HumorLevel;
  empathy: EmpathyLevel;
  creativity: CreativityLevel;
  expertise: ExpertiseLevel;
}

// Define options for dropdowns and radio buttons
const STYLE_OPTIONS: SelectOption[] = [
  { value: PersonalityStyle.HELPFUL, label: 'Helpful' },
  { value: PersonalityStyle.FRIENDLY, label: 'Friendly' },
  { value: PersonalityStyle.PROFESSIONAL, label: 'Professional' },
  { value: PersonalityStyle.CONCISE, label: 'Concise' },
  { value: PersonalityStyle.CUSTOM, label: 'Custom' }
];

const FORMALITY_OPTIONS: RadioOption[] = [
  { value: Formality.CASUAL, label: 'Casual' },
  { value: Formality.NEUTRAL, label: 'Neutral' },
  { value: Formality.FORMAL, label: 'Formal' }
];

const VERBOSITY_OPTIONS: RadioOption[] = [
  { value: Verbosity.CONCISE, label: 'Concise' },
  { value: Verbosity.BALANCED, label: 'Balanced' },
  { value: Verbosity.DETAILED, label: 'Detailed' }
];

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  width: 100%;
  max-width: 800px;
`;

const SettingSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  margin-bottom: ${SPACING.LG};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
`;

const SettingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.MD};
  margin-bottom: ${SPACING.MD};
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  width: 100%;
`;

const SettingLabel = styled.label`
  font-weight: 500;
  min-width: 120px;
  color: ${props => props.theme.colors.text.primary};
`;

const SettingControl = styled.div`
  flex: 1;
  max-width: 100%;
  
  @media (min-width: 768px) {
    max-width: 400px;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 4px;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.secondary};
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${SPACING.LG};
`;

const Description = styled.p`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 4px;
`;

const PersonalitySettings: React.FC = () => {
  const { theme } = useTheme();
  const { settings, updatePersonalitySettings, isLoading } = useSettingsStore();
  
  // Local state for form values
  const [formState, setFormState] = useState<PersonalityFormState>({
    name: settings.personality_settings.name,
    style: settings.personality_settings.style,
    formality: settings.personality_settings.formality,
    verbosity: settings.personality_settings.verbosity,
    humor: settings.personality_settings.humor,
    empathy: settings.personality_settings.empathy,
    creativity: settings.personality_settings.creativity,
    expertise: settings.personality_settings.expertise
  });
  
  // Update local state when settings change
  useEffect(() => {
    setFormState({
      name: settings.personality_settings.name,
      style: settings.personality_settings.style,
      formality: settings.personality_settings.formality,
      verbosity: settings.personality_settings.verbosity,
      humor: settings.personality_settings.humor,
      empathy: settings.personality_settings.empathy,
      creativity: settings.personality_settings.creativity,
      expertise: settings.personality_settings.expertise
    });
  }, [settings.personality_settings]);
  
  // Handler functions for form changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prev => ({ ...prev, name: e.target.value }));
  };
  
  const handleStyleChange = (value: string) => {
    setFormState(prev => ({ ...prev, style: value as PersonalityStyle }));
  };
  
  const handleFormalityChange = (value: string) => {
    setFormState(prev => ({ ...prev, formality: value as Formality }));
  };
  
  const handleVerbosityChange = (value: string) => {
    setFormState(prev => ({ ...prev, verbosity: value as Verbosity }));
  };
  
  const handleHumorChange = (value: number) => {
    const humorValues = [HumorLevel.NONE, HumorLevel.SUBTLE, HumorLevel.MODERATE, HumorLevel.HIGH];
    setFormState(prev => ({ ...prev, humor: humorValues[value] }));
  };
  
  const handleEmpathyChange = (value: number) => {
    const empathyValues = [EmpathyLevel.LOW, EmpathyLevel.MODERATE, EmpathyLevel.HIGH];
    setFormState(prev => ({ ...prev, empathy: empathyValues[value] }));
  };
  
  const handleCreativityChange = (value: number) => {
    const creativityValues = [CreativityLevel.LOW, CreativityLevel.MODERATE, CreativityLevel.HIGH];
    setFormState(prev => ({ ...prev, creativity: creativityValues[value] }));
  };
  
  const handleExpertiseChange = (value: number) => {
    const expertiseValues = [ExpertiseLevel.BEGINNER, ExpertiseLevel.INTERMEDIATE, ExpertiseLevel.EXPERT];
    setFormState(prev => ({ ...prev, expertise: expertiseValues[value] }));
  };
  
  // Convert enum values to slider values (for rendering)
  const getHumorSliderValue = (): number => {
    switch (formState.humor) {
      case HumorLevel.NONE: return 0;
      case HumorLevel.SUBTLE: return 1;
      case HumorLevel.MODERATE: return 2;
      case HumorLevel.HIGH: return 3;
      default: return 1;
    }
  };
  
  const getEmpathySliderValue = (): number => {
    switch (formState.empathy) {
      case EmpathyLevel.LOW: return 0;
      case EmpathyLevel.MODERATE: return 1;
      case EmpathyLevel.HIGH: return 2;
      default: return 1;
    }
  };
  
  const getCreativitySliderValue = (): number => {
    switch (formState.creativity) {
      case CreativityLevel.LOW: return 0;
      case CreativityLevel.MODERATE: return 1;
      case CreativityLevel.HIGH: return 2;
      default: return 1;
    }
  };
  
  const getExpertiseSliderValue = (): number => {
    switch (formState.expertise) {
      case ExpertiseLevel.BEGINNER: return 0;
      case ExpertiseLevel.INTERMEDIATE: return 1;
      case ExpertiseLevel.EXPERT: return 2;
      default: return 1;
    }
  };
  
  // Save handler
  const handleSave = async () => {
    const updatedSettings: PersonalitySettingsType = {
      name: formState.name,
      style: formState.style,
      formality: formState.formality,
      verbosity: formState.verbosity,
      humor: formState.humor,
      empathy: formState.empathy,
      creativity: formState.creativity,
      expertise: formState.expertise
    };
    
    await updatePersonalitySettings(updatedSettings);
  };
  
  return (
    <Card title="Personality Settings">
      <SettingsContainer>
        <SettingSection>
          <SectionTitle>Basic Settings</SectionTitle>
          
          <SettingRow>
            <SettingLabel htmlFor="ai-name">AI Name</SettingLabel>
            <SettingControl>
              <Input
                id="ai-name"
                value={formState.name}
                onChange={handleNameChange}
                placeholder="Enter a name for your AI assistant"
              />
              <Description>This name will be used when the AI refers to itself</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel htmlFor="personality-style">Personality Style</SettingLabel>
            <SettingControl>
              <Select
                id="personality-style"
                options={STYLE_OPTIONS}
                value={formState.style}
                onChange={handleStyleChange}
              />
              <Description>Select a predefined style or customize individual traits below</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Formality</SettingLabel>
            <SettingControl>
              <RadioGroup
                name="formality"
                options={FORMALITY_OPTIONS}
                value={formState.formality}
                onChange={handleFormalityChange}
              />
              <Description>How formal or casual the AI's responses should be</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Verbosity</SettingLabel>
            <SettingControl>
              <RadioGroup
                name="verbosity"
                options={VERBOSITY_OPTIONS}
                value={formState.verbosity}
                onChange={handleVerbosityChange}
              />
              <Description>How detailed the AI's responses should be</Description>
            </SettingControl>
          </SettingRow>
        </SettingSection>
        
        <SettingSection>
          <SectionTitle>Advanced Personality Traits</SectionTitle>
          
          <SettingRow>
            <SettingLabel>Humor</SettingLabel>
            <SettingControl>
              <SliderContainer>
                <Slider
                  id="humor-slider"
                  value={getHumorSliderValue()}
                  onChange={handleHumorChange}
                  min={0}
                  max={3}
                  step={1}
                />
                <SliderLabels>
                  <span>None</span>
                  <span>Subtle</span>
                  <span>Moderate</span>
                  <span>High</span>
                </SliderLabels>
              </SliderContainer>
              <Description>How much humor should be included in responses</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Empathy</SettingLabel>
            <SettingControl>
              <SliderContainer>
                <Slider
                  id="empathy-slider"
                  value={getEmpathySliderValue()}
                  onChange={handleEmpathyChange}
                  min={0}
                  max={2}
                  step={1}
                />
                <SliderLabels>
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                </SliderLabels>
              </SliderContainer>
              <Description>How empathetic the AI should be to emotional content</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Creativity</SettingLabel>
            <SettingControl>
              <SliderContainer>
                <Slider
                  id="creativity-slider"
                  value={getCreativitySliderValue()}
                  onChange={handleCreativityChange}
                  min={0}
                  max={2}
                  step={1}
                />
                <SliderLabels>
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                </SliderLabels>
              </SliderContainer>
              <Description>How creative and varied the AI's responses should be</Description>
            </SettingControl>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Expertise</SettingLabel>
            <SettingControl>
              <SliderContainer>
                <Slider
                  id="expertise-slider"
                  value={getExpertiseSliderValue()}
                  onChange={handleExpertiseChange}
                  min={0}
                  max={2}
                  step={1}
                />
                <SliderLabels>
                  <span>Beginner</span>
                  <span>Intermediate</span>
                  <span>Expert</span>
                </SliderLabels>
              </SliderContainer>
              <Description>The level of expertise or depth in AI responses</Description>
            </SettingControl>
          </SettingRow>
        </SettingSection>
        
        <ButtonContainer>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </ButtonContainer>
      </SettingsContainer>
    </Card>
  );
};

export default PersonalitySettings;