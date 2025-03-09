from pydantic import BaseModel, Field, UUID4, validator, root_validator
from typing import Optional, List, Dict, Any, Union
from uuid import uuid4

# Global constants for validation
VOICE_PROVIDERS = ["system", "elevenlabs", "coqui"]
PERSONALITY_STYLES = ["helpful", "professional", "friendly", "concise", "detailed"]
FORMALITY_LEVELS = ["casual", "neutral", "formal"]
VERBOSITY_LEVELS = ["minimal", "balanced", "detailed"]
LLM_PROVIDERS = ["openai", "local"]
SEARCH_PROVIDERS = ["duckduckgo", "serpapi"]
CLOUD_STORAGE_PROVIDERS = ["s3", "dropbox", "google_drive"]


class VoiceSettings(BaseModel):
    """Schema for voice-related settings including text-to-speech and speech-to-text configuration"""
    
    enabled: bool = Field(default=False, description="Whether voice features are enabled")
    input_enabled: bool = Field(default=False, description="Whether voice input (speech-to-text) is enabled")
    output_enabled: bool = Field(default=False, description="Whether voice output (text-to-speech) is enabled")
    voice_id: str = Field(default="default", description="Identifier for the selected voice")
    provider: str = Field(default="system", description="Voice provider (system, elevenlabs, coqui)")
    elevenlabs: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": False,
            "api_key": "",
            "voice_id": "default",
            "model_id": "eleven_monolingual_v1"
        },
        description="ElevenLabs provider configuration"
    )
    whisper: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": False,
            "model": "tiny",
            "use_local": True,
            "language": "en"
        },
        description="Whisper speech-to-text configuration"
    )

    @validator("provider")
    def validate_provider(cls, provider):
        """Validates that the provider is supported"""
        if provider not in VOICE_PROVIDERS:
            raise ValueError(f"Provider must be one of {VOICE_PROVIDERS}")
        return provider
    
    @validator("elevenlabs")
    def validate_elevenlabs(cls, elevenlabs):
        """Validates ElevenLabs configuration"""
        if not isinstance(elevenlabs, dict):
            raise ValueError("ElevenLabs configuration must be a dictionary")
            
        required_keys = ["enabled", "api_key"]
        for key in required_keys:
            if key not in elevenlabs:
                elevenlabs[key] = "" if key == "api_key" else False
                
        if "enabled" in elevenlabs and not isinstance(elevenlabs["enabled"], bool):
            raise ValueError("ElevenLabs 'enabled' must be a boolean")
            
        if "voice_id" in elevenlabs and not isinstance(elevenlabs["voice_id"], str):
            raise ValueError("ElevenLabs 'voice_id' must be a string")
            
        if "model_id" in elevenlabs and not isinstance(elevenlabs["model_id"], str):
            raise ValueError("ElevenLabs 'model_id' must be a string")
            
        return elevenlabs
        
    @validator("whisper")
    def validate_whisper(cls, whisper):
        """Validates Whisper configuration"""
        if not isinstance(whisper, dict):
            raise ValueError("Whisper configuration must be a dictionary")
            
        required_keys = ["enabled", "model", "use_local", "language"]
        for key in required_keys:
            if key not in whisper:
                default_values = {
                    "enabled": False,
                    "model": "tiny",
                    "use_local": True,
                    "language": "en"
                }
                whisper[key] = default_values[key]
                
        if "enabled" in whisper and not isinstance(whisper["enabled"], bool):
            raise ValueError("Whisper 'enabled' must be a boolean")
            
        if "model" in whisper and not isinstance(whisper["model"], str):
            raise ValueError("Whisper 'model' must be a string")
            
        if "use_local" in whisper and not isinstance(whisper["use_local"], bool):
            raise ValueError("Whisper 'use_local' must be a boolean")
            
        if "language" in whisper and not isinstance(whisper["language"], str):
            raise ValueError("Whisper 'language' must be a string")
            
        return whisper


class PersonalitySettings(BaseModel):
    """Schema for AI personality settings that affect response style and tone"""
    
    name: str = Field(default="Assistant", description="Name for the AI")
    style: str = Field(default="helpful", description="Overall response style")
    formality: str = Field(default="neutral", description="Level of formality in responses")
    verbosity: str = Field(default="balanced", description="Level of detail in responses")
    empathy: str = Field(default="medium", description="Level of empathy in responses")
    humor: str = Field(default="light", description="Level of humor in responses")
    creativity: str = Field(default="medium", description="Level of creativity in responses")
    
    @validator("style")
    def validate_style(cls, style):
        """Validates that the style is supported"""
        if style not in PERSONALITY_STYLES:
            raise ValueError(f"Style must be one of {PERSONALITY_STYLES}")
        return style
    
    @validator("formality")
    def validate_formality(cls, formality):
        """Validates that the formality level is supported"""
        if formality not in FORMALITY_LEVELS:
            raise ValueError(f"Formality must be one of {FORMALITY_LEVELS}")
        return formality
    
    @validator("verbosity")
    def validate_verbosity(cls, verbosity):
        """Validates that the verbosity level is supported"""
        if verbosity not in VERBOSITY_LEVELS:
            raise ValueError(f"Verbosity must be one of {VERBOSITY_LEVELS}")
        return verbosity
    
    @validator("empathy", "humor", "creativity")
    def validate_level_field(cls, value, values, field):
        """Validates level fields (empathy, humor, creativity)"""
        valid_levels = ["none", "minimal", "light", "medium", "high"]
        if value not in valid_levels:
            raise ValueError(f"{field.name} must be one of {valid_levels}")
        return value


class PrivacySettings(BaseModel):
    """Schema for privacy-related settings including data storage and sharing preferences"""
    
    local_storage_only: bool = Field(default=True, description="Store all data locally only")
    analytics_enabled: bool = Field(default=False, description="Send anonymous usage analytics")
    error_reporting: bool = Field(default=False, description="Send anonymous error reports")
    data_collection: bool = Field(default=False, description="Allow collection of data for product improvement")
    session_timeout: int = Field(default=30, description="Session timeout in minutes (0 for no timeout)")
    
    @validator("session_timeout")
    def validate_session_timeout(cls, timeout):
        """Validates that session timeout is within acceptable range"""
        if timeout < 0 or timeout > 1440:  # Max 24 hours
            raise ValueError("Session timeout must be between 0 and 1440 minutes")
        return timeout
    
    @root_validator
    def validate_privacy_consistency(cls, values):
        """Ensures privacy settings are consistent"""
        if values.get("local_storage_only", True):
            if values.get("analytics_enabled", False) or values.get("error_reporting", False) or values.get("data_collection", False):
                raise ValueError("When local_storage_only is True, analytics_enabled, error_reporting, and data_collection must be False")
        return values


class StorageSettings(BaseModel):
    """Schema for storage-related settings including file storage and backup configuration"""
    
    base_path: str = Field(default="data", description="Base path for all data storage")
    file_storage_path: str = Field(default="data/files", description="Path for file storage")
    max_file_size_mb: int = Field(default=100, description="Maximum file size in MB")
    allowed_file_types: List[str] = Field(
        default=["txt", "pdf", "md", "doc", "docx", "csv", "xlsx"],
        description="List of allowed file extensions"
    )
    backup_enabled: bool = Field(default=False, description="Enable automated backups")
    backup_frequency: str = Field(default="daily", description="Backup frequency")
    backup_count: int = Field(default=7, description="Number of backups to keep")
    cloud_backup: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": False,
            "provider": "s3",
            "auto_sync": False,
            "sync_frequency": "daily",
            "credentials": {}
        },
        description="Cloud backup configuration"
    )
    
    @validator("max_file_size_mb")
    def validate_max_file_size(cls, size):
        """Validates that max file size is within acceptable range"""
        if size < 1 or size > 1000:
            raise ValueError("Max file size must be between 1 and 1000 MB")
        return size
    
    @validator("backup_frequency")
    def validate_backup_frequency(cls, frequency):
        """Validates that backup frequency is supported"""
        valid_frequencies = ["hourly", "daily", "weekly", "monthly"]
        if frequency not in valid_frequencies:
            raise ValueError(f"Backup frequency must be one of {valid_frequencies}")
        return frequency
    
    @validator("cloud_backup")
    def validate_cloud_backup(cls, cloud_backup):
        """Validates cloud backup configuration"""
        if not isinstance(cloud_backup, dict):
            raise ValueError("Cloud backup configuration must be a dictionary")
            
        required_keys = ["enabled", "provider", "auto_sync", "sync_frequency"]
        for key in required_keys:
            if key not in cloud_backup:
                default_values = {
                    "enabled": False,
                    "provider": "s3",
                    "auto_sync": False,
                    "sync_frequency": "daily"
                }
                cloud_backup[key] = default_values[key]
                
        if cloud_backup.get("enabled", False):
            provider = cloud_backup.get("provider")
            if provider not in CLOUD_STORAGE_PROVIDERS:
                raise ValueError(f"Cloud storage provider must be one of {CLOUD_STORAGE_PROVIDERS}")
                
            # Validate provider-specific requirements
            if provider == "s3" and "credentials" in cloud_backup:
                creds = cloud_backup["credentials"]
                if not isinstance(creds, dict):
                    raise ValueError("S3 credentials must be a dictionary")
                    
            if provider == "dropbox" and "credentials" in cloud_backup:
                creds = cloud_backup["credentials"]
                if not isinstance(creds, dict):
                    raise ValueError("Dropbox credentials must be a dictionary")
                    
            if provider == "google_drive" and "credentials" in cloud_backup:
                creds = cloud_backup["credentials"]
                if not isinstance(creds, dict):
                    raise ValueError("Google Drive credentials must be a dictionary")
                
        return cloud_backup


class LLMSettings(BaseModel):
    """Schema for LLM-related settings including model selection and parameters"""
    
    provider: str = Field(default="openai", description="LLM provider")
    model: str = Field(default="gpt-4o", description="Model name")
    temperature: float = Field(default=0.7, description="Temperature for response generation")
    max_tokens: int = Field(default=1000, description="Maximum tokens for response generation")
    top_p: float = Field(default=1.0, description="Top-p sampling parameter")
    frequency_penalty: float = Field(default=0.0, description="Frequency penalty parameter")
    presence_penalty: float = Field(default=0.0, description="Presence penalty parameter")
    use_local_llm: bool = Field(default=False, description="Use local LLM instead of API")
    local_model_path: str = Field(default="", description="Path to local LLM model")
    fallback_to_local: bool = Field(default=False, description="Fallback to local LLM if API fails")
    openai: Dict[str, Any] = Field(
        default_factory=lambda: {
            "api_key": "",
            "organization": "",
            "base_url": "https://api.openai.com/v1",
            "embedding_model": "text-embedding-3-small"
        },
        description="OpenAI-specific configuration"
    )
    local: Dict[str, Any] = Field(
        default_factory=lambda: {
            "model_type": "llama",
            "context_size": 4096,
            "threads": 4,
            "embedding_model": "BAAI/bge-small-en-v1.5"
        },
        description="Local LLM configuration"
    )
    
    @validator("provider")
    def validate_provider(cls, provider):
        """Validates that the provider is supported"""
        if provider not in LLM_PROVIDERS:
            raise ValueError(f"Provider must be one of {LLM_PROVIDERS}")
        return provider
    
    @validator("temperature")
    def validate_temperature(cls, temperature):
        """Validates that temperature is within acceptable range"""
        if temperature < 0.0 or temperature > 2.0:
            raise ValueError("Temperature must be between 0.0 and 2.0")
        return temperature
    
    @validator("max_tokens")
    def validate_max_tokens(cls, max_tokens):
        """Validates that max_tokens is within acceptable range"""
        if max_tokens < 1 or max_tokens > 32000:
            raise ValueError("max_tokens must be between 1 and 32000")
        return max_tokens
    
    @validator("openai")
    def validate_openai_config(cls, openai):
        """Validates OpenAI configuration"""
        if not isinstance(openai, dict):
            raise ValueError("OpenAI configuration must be a dictionary")
            
        # Validate base_url if provided
        if "base_url" in openai and openai["base_url"]:
            import re
            url_pattern = re.compile(r'^https?://[\w.-]+(?::\d+)?(?:/[\w.-]+)*/?$')
            if not url_pattern.match(openai["base_url"]):
                raise ValueError("OpenAI base_url must be a valid URL")
                
        # Validate embedding model if provided
        if "embedding_model" in openai and not isinstance(openai["embedding_model"], str):
            raise ValueError("OpenAI embedding_model must be a string")
            
        return openai
    
    @validator("local")
    def validate_local_config(cls, local):
        """Validates local LLM configuration"""
        if not isinstance(local, dict):
            raise ValueError("Local LLM configuration must be a dictionary")
            
        # Validate model_type if provided
        if "model_type" in local:
            valid_types = ["llama", "mistral", "phi"]
            if local["model_type"] not in valid_types:
                raise ValueError(f"Local model_type must be one of {valid_types}")
                
        # Validate context_size if provided
        if "context_size" in local:
            if not isinstance(local["context_size"], int) or local["context_size"] < 1024 or local["context_size"] > 32768:
                raise ValueError("Local context_size must be between 1024 and 32768")
                
        # Validate threads if provided
        if "threads" in local:
            if not isinstance(local["threads"], int) or local["threads"] < 1 or local["threads"] > 32:
                raise ValueError("Local threads must be between 1 and 32")
                
        return local
    
    @root_validator
    def validate_local_llm_consistency(cls, values):
        """Ensures local LLM settings are consistent"""
        use_local = values.get("use_local_llm", False)
        provider = values.get("provider", "openai")
        local_model_path = values.get("local_model_path", "")
        
        if use_local and not local_model_path:
            raise ValueError("When use_local_llm is True, local_model_path must be provided")
            
        if provider == "local" and not use_local:
            raise ValueError("When provider is 'local', use_local_llm must be True")
            
        return values


class SearchSettings(BaseModel):
    """Schema for web search settings including provider selection and parameters"""
    
    enabled: bool = Field(default=True, description="Enable web search")
    provider: str = Field(default="duckduckgo", description="Search provider")
    max_results: int = Field(default=5, description="Maximum number of search results")
    safe_search: bool = Field(default=True, description="Enable safe search filtering")
    serpapi: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": False,
            "api_key": ""
        },
        description="SerpAPI configuration"
    )
    duckduckgo: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": True,
            "region": "wt-wt",
            "time_period": "m"  # m = past month
        },
        description="DuckDuckGo configuration"
    )
    
    @validator("provider")
    def validate_provider(cls, provider):
        """Validates that the provider is supported"""
        if provider not in SEARCH_PROVIDERS:
            raise ValueError(f"Provider must be one of {SEARCH_PROVIDERS}")
        return provider
    
    @validator("max_results")
    def validate_max_results(cls, max_results):
        """Validates that max_results is within acceptable range"""
        if max_results < 1 or max_results > 20:
            raise ValueError("max_results must be between 1 and 20")
        return max_results
    
    @validator("serpapi")
    def validate_serpapi_config(cls, serpapi):
        """Validates SerpAPI configuration"""
        if not isinstance(serpapi, dict):
            raise ValueError("SerpAPI configuration must be a dictionary")
            
        # Ensure required keys exist
        if "enabled" not in serpapi:
            serpapi["enabled"] = False
            
        if "api_key" not in serpapi:
            serpapi["api_key"] = ""
            
        if not isinstance(serpapi["enabled"], bool):
            raise ValueError("SerpAPI 'enabled' must be a boolean")
            
        return serpapi
    
    @validator("duckduckgo")
    def validate_duckduckgo_config(cls, duckduckgo):
        """Validates DuckDuckGo configuration"""
        if not isinstance(duckduckgo, dict):
            raise ValueError("DuckDuckGo configuration must be a dictionary")
            
        # Ensure required keys exist
        if "enabled" not in duckduckgo:
            duckduckgo["enabled"] = True
            
        if not isinstance(duckduckgo["enabled"], bool):
            raise ValueError("DuckDuckGo 'enabled' must be a boolean")
            
        # Validate region if provided
        if "region" in duckduckgo and not isinstance(duckduckgo["region"], str):
            raise ValueError("DuckDuckGo region must be a string")
            
        # Validate time_period if provided
        if "time_period" in duckduckgo:
            valid_periods = ["d", "w", "m", "y"]  # day, week, month, year
            if duckduckgo["time_period"] not in valid_periods:
                raise ValueError(f"DuckDuckGo time_period must be one of {valid_periods}")
                
        return duckduckgo
    
    @root_validator
    def validate_search_consistency(cls, values):
        """Ensures search settings are consistent"""
        enabled = values.get("enabled", True)
        provider = values.get("provider", "duckduckgo")
        serpapi = values.get("serpapi", {})
        duckduckgo = values.get("duckduckgo", {})
        
        # If search is disabled, no further validation needed
        if not enabled:
            return values
            
        # If search is enabled, ensure at least one provider is enabled
        if provider == "serpapi" and not serpapi.get("enabled", False):
            raise ValueError("When provider is 'serpapi', serpapi['enabled'] must be True")
            
        if provider == "duckduckgo" and not duckduckgo.get("enabled", True):
            raise ValueError("When provider is 'duckduckgo', duckduckgo['enabled'] must be True")
            
        return values


class MemorySettings(BaseModel):
    """Schema for memory system settings including vector database and context retrieval configuration"""
    
    vector_db_path: str = Field(default="data/vector_db", description="Path to vector database")
    sqlite_db_path: str = Field(default="data/sqlite_db", description="Path to SQLite database")
    max_memory_items: int = Field(default=10000, description="Maximum number of memory items to store")
    context_window_size: int = Field(default=10, description="Number of items to include in context window")
    search_limit: int = Field(default=100, description="Maximum number of items to search")
    importance_weight: float = Field(default=0.1, description="Weight for item importance in retrieval")
    recency_weight: float = Field(default=0.25, description="Weight for item recency in retrieval")
    similarity_weight: float = Field(default=0.65, description="Weight for vector similarity in retrieval")
    backup: Dict[str, Any] = Field(
        default_factory=lambda: {
            "enabled": True,
            "auto_backup": True,
            "backup_frequency": "daily",
            "backup_count": 7
        },
        description="Memory backup configuration"
    )
    optimization: Dict[str, Any] = Field(
        default_factory=lambda: {
            "auto_optimize": True,
            "optimization_frequency": "weekly"
        },
        description="Memory optimization configuration"
    )
    
    @validator("max_memory_items")
    def validate_max_memory_items(cls, max_items):
        """Validates that max_memory_items is within acceptable range"""
        if max_items < 100 or max_items > 1000000:
            raise ValueError("max_memory_items must be between 100 and 1,000,000")
        return max_items
    
    @validator("context_window_size")
    def validate_context_window_size(cls, window_size):
        """Validates that context_window_size is within acceptable range"""
        if window_size < 1 or window_size > 100:
            raise ValueError("context_window_size must be between 1 and 100")
        return window_size
    
    @root_validator
    def validate_weights(cls, values):
        """Validates that weights sum to approximately 1.0"""
        importance_weight = values.get("importance_weight", 0.1)
        recency_weight = values.get("recency_weight", 0.25)
        similarity_weight = values.get("similarity_weight", 0.65)
        
        sum_weights = importance_weight + recency_weight + similarity_weight
        
        # Allow for small floating point differences (0.99 to 1.01)
        if sum_weights < 0.99 or sum_weights > 1.01:
            raise ValueError(f"Weights must sum to 1.0, got {sum_weights}")
            
        return values
    
    @validator("backup")
    def validate_backup_config(cls, backup):
        """Validates backup configuration"""
        if not isinstance(backup, dict):
            raise ValueError("Backup configuration must be a dictionary")
            
        # Ensure required keys exist with proper types
        required_bool_keys = ["enabled", "auto_backup"]
        for key in required_bool_keys:
            if key not in backup:
                backup[key] = True
            elif not isinstance(backup[key], bool):
                raise ValueError(f"Backup '{key}' must be a boolean")
                
        # Validate backup_frequency if provided
        if "backup_frequency" in backup:
            valid_frequencies = ["hourly", "daily", "weekly", "monthly"]
            if backup["backup_frequency"] not in valid_frequencies:
                raise ValueError(f"Backup frequency must be one of {valid_frequencies}")
                
        # Validate backup_count if provided
        if "backup_count" in backup:
            if not isinstance(backup["backup_count"], int) or backup["backup_count"] < 1 or backup["backup_count"] > 100:
                raise ValueError("Backup count must be between 1 and 100")
                
        return backup
    
    @validator("optimization")
    def validate_optimization_config(cls, optimization):
        """Validates optimization configuration"""
        if not isinstance(optimization, dict):
            raise ValueError("Optimization configuration must be a dictionary")
            
        # Ensure required keys exist with proper types
        if "auto_optimize" not in optimization:
            optimization["auto_optimize"] = True
        elif not isinstance(optimization["auto_optimize"], bool):
            raise ValueError("Optimization 'auto_optimize' must be a boolean")
            
        # Validate optimization_frequency if provided
        if "optimization_frequency" in optimization:
            valid_frequencies = ["daily", "weekly", "monthly"]
            if optimization["optimization_frequency"] not in valid_frequencies:
                raise ValueError(f"Optimization frequency must be one of {valid_frequencies}")
                
        return optimization


class UserSettings(BaseModel):
    """Schema for complete user settings combining all settings categories"""
    
    id: UUID4 = Field(default=None, description="Unique identifier for settings")
    voice_settings: VoiceSettings = Field(default_factory=VoiceSettings, description="Voice-related settings")
    personality_settings: PersonalitySettings = Field(default_factory=PersonalitySettings, description="Personality settings")
    privacy_settings: PrivacySettings = Field(default_factory=PrivacySettings, description="Privacy settings")
    storage_settings: StorageSettings = Field(default_factory=StorageSettings, description="Storage settings")
    llm_settings: LLMSettings = Field(default_factory=LLMSettings, description="LLM settings")
    search_settings: SearchSettings = Field(default_factory=SearchSettings, description="Search settings")
    memory_settings: MemorySettings = Field(default_factory=MemorySettings, description="Memory settings")
    
    @validator("id", pre=True, always=True)
    def generate_id(cls, id):
        """Generates a UUID if not provided"""
        if id is None:
            return uuid4()
        return id