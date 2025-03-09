import {
  VoiceProvider,
  PersonalityStyle,
  Formality,
  Verbosity,
  HumorLevel,
  EmpathyLevel,
  CreativityLevel,
  ExpertiseLevel,
  BackupFrequency,
  BackupLocation,
  LLMProvider,
  LocalModelType,
  SearchProvider,
  VoiceSettings,
  PersonalitySettings,
  PrivacySettings,
  StorageSettings,
  LLMSettings,
  SearchSettings,
  MemorySettings,
  UserSettings
} from '../types/settings';

/**
 * Default voice settings with voice features disabled by default for privacy
 */
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: false,
  input_enabled: false,
  output_enabled: false,
  voice_id: 'default',
  speed: 1.0,
  pitch: 1.0,
  provider: VoiceProvider.SYSTEM,
  local_tts_enabled: true,
  local_stt_enabled: true,
  whisper_model: 'base',
  auto_detect_language: true
};

/**
 * Default personality settings with balanced, helpful traits
 */
export const DEFAULT_PERSONALITY_SETTINGS: PersonalitySettings = {
  name: 'Assistant',
  style: PersonalityStyle.HELPFUL,
  formality: Formality.NEUTRAL,
  verbosity: Verbosity.BALANCED,
  humor: HumorLevel.SUBTLE,
  empathy: EmpathyLevel.MODERATE,
  creativity: CreativityLevel.MODERATE,
  expertise: ExpertiseLevel.INTERMEDIATE
};

/**
 * Default privacy settings with maximum privacy protection
 * No data collection or telemetry enabled by default
 */
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  local_storage_only: true,
  analytics_enabled: false,
  error_reporting: false,
  data_collection: false,
  usage_statistics: false,
  content_analysis: false,
  personalization: true,
  data_retention: {
    conversations: 'indefinite',
    documents: 'indefinite',
    web_content: '90days',
    search_history: '30days'
  }
};

/**
 * Default storage settings with local-only storage and no cloud backup
 */
export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  base_path: 'data',
  backup_enabled: false,
  backup_frequency: BackupFrequency.WEEKLY,
  backup_count: 5,
  backup_location: BackupLocation.LOCAL,
  cloud_provider: '',
  cloud_region: '',
  encryption_enabled: true,
  compression_enabled: true,
  auto_cleanup: false,
  cleanup_threshold_gb: 5,
  file_types_allowed: ['pdf', 'txt', 'docx', 'md', 'csv', 'json']
};

/**
 * Default LLM settings using OpenAI with fallback options
 */
export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  provider: LLMProvider.OPENAI,
  model: 'gpt-4o',
  temperature: 0.7,
  max_tokens: 1000,
  top_p: 1.0,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  use_local_llm: false,
  local_model_path: '',
  local_model_type: LocalModelType.LLAMA3,
  embedding_model: 'text-embedding-3-small',
  local_embedding_model: '',
  context_window_size: 10,
  streaming: true,
  fallback_to_local: true
};

/**
 * Default search settings with DuckDuckGo as the preferred provider for privacy
 */
export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  enabled: true,
  provider: SearchProvider.DUCKDUCKGO,
  max_results: 5,
  safe_search: true,
  region: 'wt-wt',
  timeout_seconds: 10,
  auto_search: false,
  cache_results: true,
  cache_expiry_hours: 24
};

/**
 * Default memory settings for vector database and retrieval
 */
export const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  vector_db_path: 'memory/vectors',
  max_memory_items: 10000,
  context_window_size: 10,
  recency_weight: 0.25,
  relevance_weight: 0.65,
  importance_weight: 0.1,
  chunk_size: 1000,
  chunk_overlap: 100,
  auto_summarize: true,
  auto_categorize: true,
  default_categories: ['conversation', 'document', 'web', 'important'],
  similarity_threshold: 0.75,
  auto_prune: false,
  prune_threshold: 50000
};

/**
 * Complete default user settings combining all individual settings
 * These defaults prioritize privacy, security, and local-first operation
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  id: 'default',
  voice_settings: DEFAULT_VOICE_SETTINGS,
  personality_settings: DEFAULT_PERSONALITY_SETTINGS,
  privacy_settings: DEFAULT_PRIVACY_SETTINGS,
  storage_settings: DEFAULT_STORAGE_SETTINGS,
  llm_settings: DEFAULT_LLM_SETTINGS,
  search_settings: DEFAULT_SEARCH_SETTINGS,
  memory_settings: DEFAULT_MEMORY_SETTINGS
};