import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Card from '../ui/Card';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import Slider from '../ui/Slider';
import Input from '../ui/Input';
import useSettings from '../../hooks/useSettings';
import { LLMProvider, LocalModelType, LLMSettings, MemorySettings } from '../../types/settings';
import { SPACING } from '../../constants/uiConstants';
import useTheme from '../../hooks/useTheme';

// Styled components for the settings layout
const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${SPACING.LG};
`;

const SectionTitle = styled.h3`
  font-size: 1.1rem;
  margin-bottom: ${SPACING.MD};
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
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

const SettingDescription = styled.p`
  font-size: 0.8rem;
  margin-top: ${SPACING.MD};
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;
`;

const SettingGroup = styled.div`
  padding: ${SPACING.MD};
  border: 1px solid ${props => props.theme.colors.border.main};
  border-radius: 8px;
  margin-bottom: ${SPACING.LG};
`;

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${SPACING.MD};
`;

const SliderContainer = styled.div`
  width: 100%;
  padding: 0 ${SPACING.MD};
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: ${SPACING.MD};
`;

/**
 * Component for configuring advanced settings of the Personal AI Agent
 * Provides control over LLM settings, memory management, and performance optimizations
 */
const AdvancedSettings: React.FC = () => {
  const { settings, updateLLM, updateMemory } = useSettings();
  const { theme } = useTheme();
  
  // Local state to track form values
  const [llmSettings, setLlmSettings] = useState<LLMSettings>(settings.llm_settings);
  const [memorySettings, setMemorySettings] = useState<MemorySettings>(settings.memory_settings);
  const [showLocalModelPath, setShowLocalModelPath] = useState(settings.llm_settings.use_local_llm);
  const [showCustomModelOptions, setShowCustomModelOptions] = useState(
    settings.llm_settings.local_model_type === 'CUSTOM'
  );
  
  // Initialize local state when settings change
  useEffect(() => {
    setLlmSettings(settings.llm_settings);
    setMemorySettings(settings.memory_settings);
    setShowLocalModelPath(settings.llm_settings.use_local_llm);
    setShowCustomModelOptions(settings.llm_settings.local_model_type === 'CUSTOM');
  }, [settings]);
  
  // Handler for LLM settings changes
  const handleLLMSettingsChange = (updates: Partial<LLMSettings>) => {
    const updatedSettings = { ...llmSettings, ...updates };
    setLlmSettings(updatedSettings);
    updateLLM(updatedSettings);
  };
  
  // Handler for Memory settings changes
  const handleMemorySettingsChange = (updates: Partial<MemorySettings>) => {
    const updatedSettings = { ...memorySettings, ...updates };
    setMemorySettings(updatedSettings);
    updateMemory(updatedSettings);
  };
  
  // Handler for provider change
  const handleProviderChange = (provider: string) => {
    // When provider changes, we need to set an appropriate default model
    let defaultModel = '';
    
    switch (provider) {
      case LLMProvider.OPENAI:
        defaultModel = 'gpt-4o';
        break;
      case LLMProvider.AZURE_OPENAI:
        defaultModel = 'gpt-4';
        break;
      case LLMProvider.LOCAL:
        defaultModel = 'llama3';
        break;
      default:
        defaultModel = 'gpt-4o';
    }
    
    handleLLMSettingsChange({ 
      provider: provider as LLMProvider,
      model: defaultModel
    });
  };
  
  // Handler for local model type change
  const handleLocalModelTypeChange = (modelType: string) => {
    setShowCustomModelOptions(modelType === 'CUSTOM');
    handleLLMSettingsChange({ local_model_type: modelType as LocalModelType });
  };
  
  // Define provider options
  const providerOptions = [
    { value: 'OPENAI', label: 'OpenAI' },
    { value: 'AZURE_OPENAI', label: 'Azure OpenAI' },
    { value: 'LOCAL', label: 'Local LLM' }
  ];
  
  // Define model options based on selected provider
  const getModelOptions = () => {
    switch (llmSettings.provider) {
      case LLMProvider.OPENAI:
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case LLMProvider.AZURE_OPENAI:
        return [
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }
        ];
      case LLMProvider.LOCAL:
        return [
          { value: 'LLAMA3', label: 'Llama 3' },
          { value: 'MISTRAL', label: 'Mistral' },
          { value: 'PHI3', label: 'Phi-3' },
          { value: 'CUSTOM', label: 'Custom Model' }
        ];
      default:
        return [];
    }
  };
  
  // Define embedding model options
  const embeddingModelOptions = [
    { value: 'text-embedding-3-small', label: 'OpenAI Embedding (Small)' },
    { value: 'text-embedding-3-large', label: 'OpenAI Embedding (Large)' },
    { value: 'bge-small-en-v1.5', label: 'BGE Small (Local)' },
    { value: 'all-MiniLM-L6-v2', label: 'MiniLM (Local)' }
  ];
  
  // Define vector database options
  const vectorDBOptions = [
    { value: 'chromadb', label: 'ChromaDB' },
    { value: 'faiss', label: 'FAISS' },
    { value: 'qdrant', label: 'Qdrant' }
  ];
  
  return (
    <SettingsContainer>
      <Card title="Advanced Settings">
        {/* LLM Settings Section */}
        <SettingGroup>
          <SectionTitle>LLM Settings</SectionTitle>
          
          <SettingRow>
            <SettingLabel>LLM Provider</SettingLabel>
            <Select
              id="llm-provider"
              options={providerOptions}
              value={llmSettings.provider}
              onChange={handleProviderChange}
            />
            <SettingDescription>
              Select the AI model provider for generating responses.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Model</SettingLabel>
            <Select
              id="llm-model"
              options={getModelOptions()}
              value={llmSettings.model}
              onChange={(value) => handleLLMSettingsChange({ model: value })}
            />
            <SettingDescription>
              Select the language model to use for generating responses.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Use Local LLM</SettingLabel>
              <Toggle
                id="use-local-llm"
                checked={llmSettings.use_local_llm}
                onChange={(checked) => {
                  setShowLocalModelPath(checked);
                  handleLLMSettingsChange({ use_local_llm: checked });
                }}
              />
            </ControlRow>
            <SettingDescription>
              Run AI models locally instead of using cloud APIs for enhanced privacy.
            </SettingDescription>
          </SettingRow>
          
          {llmSettings.use_local_llm && (
            <>
              <SettingRow>
                <SettingLabel>Local Model Type</SettingLabel>
                <Select
                  id="local-model-type"
                  options={[
                    { value: 'LLAMA3', label: 'Llama 3' },
                    { value: 'MISTRAL', label: 'Mistral' },
                    { value: 'PHI3', label: 'Phi-3' },
                    { value: 'CUSTOM', label: 'Custom Model' }
                  ]}
                  value={llmSettings.local_model_type}
                  onChange={handleLocalModelTypeChange}
                />
                <SettingDescription>
                  Select the type of local language model to use.
                </SettingDescription>
              </SettingRow>
              
              <SettingRow>
                <SettingLabel>Local Model Path</SettingLabel>
                <Input
                  id="local-model-path"
                  value={llmSettings.local_model_path}
                  onChange={(e) => handleLLMSettingsChange({ local_model_path: e.target.value })}
                  placeholder="/path/to/model/weights"
                />
                <SettingDescription>
                  File path to the local model weights on your device.
                </SettingDescription>
              </SettingRow>
            </>
          )}
          
          <SettingRow>
            <SettingLabel>Temperature: {llmSettings.temperature}</SettingLabel>
            <SliderContainer>
              <Slider
                id="temperature"
                value={llmSettings.temperature}
                onChange={(value) => handleLLMSettingsChange({ temperature: value })}
                min={0}
                max={1}
                step={0.1}
              />
              <SliderLabels>
                <span>More predictable</span>
                <span>More random</span>
              </SliderLabels>
            </SliderContainer>
            <SettingDescription>
              Controls randomness in responses. Lower values are more predictable; higher values are more creative.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Max Tokens: {llmSettings.max_tokens}</SettingLabel>
            <SliderContainer>
              <Slider
                id="max-tokens"
                value={llmSettings.max_tokens}
                onChange={(value) => handleLLMSettingsChange({ max_tokens: value })}
                min={100}
                max={4000}
                step={100}
              />
            </SliderContainer>
            <SettingDescription>
              Maximum length of generated responses in tokens (roughly ~0.75 words per token).
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Embedding Model</SettingLabel>
            <Select
              id="embedding-model"
              options={embeddingModelOptions}
              value={llmSettings.embedding_model}
              onChange={(value) => handleLLMSettingsChange({ embedding_model: value })}
            />
            <SettingDescription>
              Model used for creating vector embeddings of text for similarity search.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Context Window Size: {llmSettings.context_window_size}</SettingLabel>
            <SliderContainer>
              <Slider
                id="context-window"
                value={llmSettings.context_window_size}
                onChange={(value) => handleLLMSettingsChange({ context_window_size: value })}
                min={1}
                max={20}
                step={1}
              />
            </SliderContainer>
            <SettingDescription>
              Number of relevant items to include in the context window for each conversation.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Enable Streaming</SettingLabel>
              <Toggle
                id="streaming"
                checked={llmSettings.streaming}
                onChange={(checked) => handleLLMSettingsChange({ streaming: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Show AI responses as they are generated instead of waiting for the complete response.
            </SettingDescription>
          </SettingRow>
          
          {!llmSettings.use_local_llm && (
            <SettingRow>
              <ControlRow>
                <SettingLabel>Fallback to Local LLM</SettingLabel>
                <Toggle
                  id="fallback-local"
                  checked={llmSettings.fallback_to_local}
                  onChange={(checked) => handleLLMSettingsChange({ fallback_to_local: checked })}
                />
              </ControlRow>
              <SettingDescription>
                Automatically use local model if cloud API is unavailable.
              </SettingDescription>
            </SettingRow>
          )}
        </SettingGroup>
        
        {/* Memory Settings Section */}
        <SettingGroup>
          <SectionTitle>Memory Settings</SectionTitle>
          
          <SettingRow>
            <SettingLabel>Vector Database Path</SettingLabel>
            <Input
              id="vector-db-path"
              value={memorySettings.vector_db_path}
              onChange={(e) => handleMemorySettingsChange({ vector_db_path: e.target.value })}
              placeholder="memory/vectors"
            />
            <SettingDescription>
              Directory path where vector embeddings will be stored.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Maximum Memory Items: {memorySettings.max_memory_items}</SettingLabel>
            <SliderContainer>
              <Slider
                id="max-memory-items"
                value={memorySettings.max_memory_items}
                onChange={(value) => handleMemorySettingsChange({ max_memory_items: value })}
                min={1000}
                max={100000}
                step={1000}
              />
            </SliderContainer>
            <SettingDescription>
              Maximum number of memory items to store before pruning oldest items.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Recency Weight: {memorySettings.recency_weight}</SettingLabel>
            <SliderContainer>
              <Slider
                id="recency-weight"
                value={memorySettings.recency_weight}
                onChange={(value) => handleMemorySettingsChange({ recency_weight: value })}
                min={0}
                max={1}
                step={0.05}
              />
            </SliderContainer>
            <SettingDescription>
              Weight given to recency when retrieving memories. Higher values prioritize recent memories.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Relevance Weight: {memorySettings.relevance_weight}</SettingLabel>
            <SliderContainer>
              <Slider
                id="relevance-weight"
                value={memorySettings.relevance_weight}
                onChange={(value) => handleMemorySettingsChange({ relevance_weight: value })}
                min={0}
                max={1}
                step={0.05}
              />
            </SliderContainer>
            <SettingDescription>
              Weight given to semantic relevance when retrieving memories. Higher values prioritize relevant content.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Importance Weight: {memorySettings.importance_weight}</SettingLabel>
            <SliderContainer>
              <Slider
                id="importance-weight"
                value={memorySettings.importance_weight}
                onChange={(value) => handleMemorySettingsChange({ importance_weight: value })}
                min={0}
                max={1}
                step={0.05}
              />
            </SliderContainer>
            <SettingDescription>
              Weight given to marked importance when retrieving memories. Higher values prioritize important items.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Chunk Size: {memorySettings.chunk_size}</SettingLabel>
            <SliderContainer>
              <Slider
                id="chunk-size"
                value={memorySettings.chunk_size}
                onChange={(value) => handleMemorySettingsChange({ chunk_size: value })}
                min={100}
                max={2000}
                step={100}
              />
            </SliderContainer>
            <SettingDescription>
              Size of text chunks when processing documents (in characters).
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Chunk Overlap: {memorySettings.chunk_overlap}</SettingLabel>
            <SliderContainer>
              <Slider
                id="chunk-overlap"
                value={memorySettings.chunk_overlap}
                onChange={(value) => handleMemorySettingsChange({ chunk_overlap: value })}
                min={0}
                max={500}
                step={10}
              />
            </SliderContainer>
            <SettingDescription>
              Amount of overlap between adjacent chunks to maintain context (in characters).
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Auto Summarize</SettingLabel>
              <Toggle
                id="auto-summarize"
                checked={memorySettings.auto_summarize}
                onChange={(checked) => handleMemorySettingsChange({ auto_summarize: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Automatically generate summaries of stored memories for more efficient retrieval.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Auto Categorize</SettingLabel>
              <Toggle
                id="auto-categorize"
                checked={memorySettings.auto_categorize}
                onChange={(checked) => handleMemorySettingsChange({ auto_categorize: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Automatically assign categories to memories based on content.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Similarity Threshold: {memorySettings.similarity_threshold}</SettingLabel>
            <SliderContainer>
              <Slider
                id="similarity-threshold"
                value={memorySettings.similarity_threshold}
                onChange={(value) => handleMemorySettingsChange({ similarity_threshold: value })}
                min={0}
                max={1}
                step={0.05}
              />
            </SliderContainer>
            <SettingDescription>
              Minimum similarity score required for retrieving related memories. Higher values are more strict.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Auto Prune</SettingLabel>
              <Toggle
                id="auto-prune"
                checked={memorySettings.auto_prune}
                onChange={(checked) => handleMemorySettingsChange({ auto_prune: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Automatically remove oldest memories when the total exceeds the threshold.
            </SettingDescription>
          </SettingRow>
          
          {memorySettings.auto_prune && (
            <SettingRow>
              <SettingLabel>Prune Threshold: {memorySettings.prune_threshold}</SettingLabel>
              <SliderContainer>
                <Slider
                  id="prune-threshold"
                  value={memorySettings.prune_threshold}
                  onChange={(value) => handleMemorySettingsChange({ prune_threshold: value })}
                  min={1000}
                  max={50000}
                  step={1000}
                />
              </SliderContainer>
              <SettingDescription>
                Number of memory items that triggers automatic pruning.
              </SettingDescription>
            </SettingRow>
          )}
        </SettingGroup>
        
        {/* Performance Settings Section */}
        <SettingGroup>
          <SectionTitle>Performance Settings</SectionTitle>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Cache API Responses</SettingLabel>
              <Toggle
                id="cache-results"
                checked={llmSettings.cache_results}
                onChange={(checked) => handleLLMSettingsChange({ cache_results: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Store API responses to avoid repeated queries for the same content.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>CPU Thread Limit: {llmSettings.thread_limit || 4}</SettingLabel>
            <SliderContainer>
              <Slider
                id="thread-limit"
                value={llmSettings.thread_limit || 4}
                onChange={(value) => handleLLMSettingsChange({ thread_limit: value })}
                min={1}
                max={16}
                step={1}
              />
            </SliderContainer>
            <SettingDescription>
              Maximum number of CPU threads to use for local processing.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <ControlRow>
              <SettingLabel>Background Processing</SettingLabel>
              <Toggle
                id="background-processing"
                checked={memorySettings.background_processing}
                onChange={(checked) => handleMemorySettingsChange({ background_processing: checked })}
              />
            </ControlRow>
            <SettingDescription>
              Process documents and update memory in the background to avoid UI lag.
            </SettingDescription>
          </SettingRow>
          
          <SettingRow>
            <SettingLabel>Memory Usage Limit: {memorySettings.memory_limit_percent || 50}%</SettingLabel>
            <SliderContainer>
              <Slider
                id="memory-limit"
                value={memorySettings.memory_limit_percent || 50}
                onChange={(value) => handleMemorySettingsChange({ memory_limit_percent: value })}
                min={10}
                max={90}
                step={5}
              />
            </SliderContainer>
            <SettingDescription>
              Maximum percentage of system memory the application can use.
            </SettingDescription>
          </SettingRow>
        </SettingGroup>
      </Card>
    </SettingsContainer>
  );
};

export default AdvancedSettings;