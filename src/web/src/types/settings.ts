/**
 * TypeScript interfaces and enums for the Personal AI Agent application settings.
 * This file contains type definitions for all configurable aspects of the application
 * including voice, personality, privacy, storage, LLM, search, and memory settings.
 */

// Voice-related enums
export enum VoiceProvider {
  ELEVENLABS = 'elevenlabs',
  COQUI = 'coqui',
  SYSTEM = 'system'
}

// Personality-related enums
export enum PersonalityStyle {
  HELPFUL = 'helpful',
  FRIENDLY = 'friendly',
  PROFESSIONAL = 'professional',
  CONCISE = 'concise',
  CUSTOM = 'custom'
}

export enum Formality {
  CASUAL = 'casual',
  NEUTRAL = 'neutral',
  FORMAL = 'formal'
}

export enum Verbosity {
  CONCISE = 'concise',
  BALANCED = 'balanced',
  DETAILED = 'detailed'
}

export enum HumorLevel {
  NONE = 'none',
  SUBTLE = 'subtle',
  MODERATE = 'moderate',
  HIGH = 'high'
}

export enum EmpathyLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high'
}

export enum CreativityLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high'
}

export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  EXPERT = 'expert'
}

// Storage-related enums
export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual'
}

export enum BackupLocation {
  LOCAL = 'local',
  CLOUD = 'cloud',
  BOTH = 'both'
}

// LLM-related enums
export enum LLMProvider {
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai',
  LOCAL = 'local'
}

export enum LocalModelType {
  LLAMA3 = 'llama3',
  MISTRAL = 'mistral',
  PHI3 = 'phi3',
  CUSTOM = 'custom'
}

// Search-related enums
export enum SearchProvider {
  SERPAPI = 'serpapi',
  DUCKDUCKGO = 'duckduckgo'
}

// Interface definitions
export interface VoiceSettings {
  enabled: boolean;
  input_enabled: boolean;
  output_enabled: boolean;
  voice_id: string;
  speed: number;
  pitch: number;
  provider: VoiceProvider;
  local_tts_enabled: boolean;
  local_stt_enabled: boolean;
  whisper_model: string;
  auto_detect_language: boolean;
}

export interface PersonalitySettings {
  name: string;
  style: PersonalityStyle;
  formality: Formality;
  verbosity: Verbosity;
  humor: HumorLevel;
  empathy: EmpathyLevel;
  creativity: CreativityLevel;
  expertise: ExpertiseLevel;
}

export interface PrivacySettings {
  local_storage_only: boolean;
  analytics_enabled: boolean;
  error_reporting: boolean;
  data_collection: boolean;
  usage_statistics: boolean;
  content_analysis: boolean;
  personalization: boolean;
  data_retention: Record<string, string>; // category -> retention period
}

export interface StorageSettings {
  base_path: string;
  backup_enabled: boolean;
  backup_frequency: BackupFrequency;
  backup_count: number;
  backup_location: BackupLocation;
  cloud_provider: string;
  cloud_region: string;
  encryption_enabled: boolean;
  compression_enabled: boolean;
  auto_cleanup: boolean;
  cleanup_threshold_gb: number;
  file_types_allowed: string[];
}

export interface LLMSettings {
  provider: LLMProvider;
  model: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  use_local_llm: boolean;
  local_model_path: string;
  local_model_type: LocalModelType;
  embedding_model: string;
  local_embedding_model: string;
  context_window_size: number;
  streaming: boolean;
  fallback_to_local: boolean;
}

export interface SearchSettings {
  enabled: boolean;
  provider: SearchProvider;
  max_results: number;
  safe_search: boolean;
  region: string;
  timeout_seconds: number;
  auto_search: boolean;
  cache_results: boolean;
  cache_expiry_hours: number;
}

export interface MemorySettings {
  vector_db_path: string;
  max_memory_items: number;
  context_window_size: number;
  recency_weight: number;
  relevance_weight: number;
  importance_weight: number;
  chunk_size: number;
  chunk_overlap: number;
  auto_summarize: boolean;
  auto_categorize: boolean;
  default_categories: string[];
  similarity_threshold: number;
  auto_prune: boolean;
  prune_threshold: number;
}

export interface UserSettings {
  id: string;
  voice_settings: VoiceSettings;
  personality_settings: PersonalitySettings;
  privacy_settings: PrivacySettings;
  storage_settings: StorageSettings;
  llm_settings: LLMSettings;
  search_settings: SearchSettings;
  memory_settings: MemorySettings;
}