from pydantic import BaseModel, Field, validator, root_validator
from typing import Optional, List, Dict, Any, Union
from io import BytesIO
import base64

# Global constants
VOICE_PROVIDERS = ['system', 'elevenlabs', 'coqui']
AUDIO_FORMATS = ['mp3', 'wav', 'ogg', 'flac']
DEFAULT_AUDIO_FORMAT = 'mp3'
DEFAULT_VOICE_PROVIDER = 'elevenlabs'
DEFAULT_STT_MODEL = 'whisper'
MAX_AUDIO_SIZE_MB = 10  # Maximum audio size in MB


class TranscriptionRequest(BaseModel):
    """
    Schema for speech-to-text transcription request.
    
    Either audio_data or audio_file_path must be provided.
    """
    audio_data: Optional[str] = Field(
        None, 
        description="Base64-encoded audio data"
    )
    audio_file_path: Optional[str] = Field(
        None, 
        description="Path to audio file on server"
    )
    language: Optional[str] = Field(
        None, 
        description="Language code (e.g., 'en', 'fr', 'es'); if None, auto-detection is used"
    )
    model: Optional[str] = Field(
        None, 
        description="Speech recognition model to use"
    )
    temperature: Optional[float] = Field(
        None, 
        description="Sampling temperature, between 0 and 1"
    )
    word_timestamps: Optional[bool] = Field(
        False, 
        description="Whether to include word-level timestamps"
    )
    
    @root_validator
    def validate_audio_source(cls, values):
        """Validate that at least one audio source is provided."""
        if values.get('audio_data') is None and values.get('audio_file_path') is None:
            raise ValueError("Either audio_data or audio_file_path must be provided")
        return values
    
    @validator('audio_data')
    def validate_audio_data(cls, audio_data):
        """Validate that audio_data is properly base64 encoded."""
        if audio_data is None:
            return None
        
        try:
            # Try to decode to validate it's proper base64
            base64.b64decode(audio_data)
        except Exception:
            raise ValueError("Invalid base64 encoding for audio_data")
        
        return audio_data
    
    @validator('model')
    def validate_model(cls, model):
        """Validate that the model is supported."""
        if model is None:
            return DEFAULT_STT_MODEL
        
        supported_models = ['whisper', 'whisper-small', 'whisper-medium', 'whisper-large']
        if model not in supported_models:
            raise ValueError(f"Unsupported model. Choose from: {', '.join(supported_models)}")
        
        return model
    
    @validator('temperature')
    def validate_temperature(cls, temperature):
        """Validate that temperature is within acceptable range."""
        if temperature is None:
            return 0.0
        
        if not 0.0 <= temperature <= 1.0:
            raise ValueError("Temperature must be between 0.0 and 1.0")
        
        return temperature


class TranscriptionResponse(BaseModel):
    """
    Schema for speech-to-text transcription response.
    """
    text: str = Field(..., description="Transcribed text")
    confidence: float = Field(..., description="Confidence score between 0 and 1")
    language: str = Field(..., description="Detected or specified language code")
    model: str = Field(..., description="Model used for transcription")
    segments: Optional[Dict[str, Any]] = Field(
        None, 
        description="Word-level segments with timestamps if requested"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional metadata about the transcription"
    )


class SynthesisRequest(BaseModel):
    """
    Schema for text-to-speech synthesis request.
    """
    text: str = Field(..., description="Text to synthesize")
    voice_id: Optional[str] = Field(
        None, 
        description="Voice ID to use for synthesis"
    )
    provider: Optional[str] = Field(
        None, 
        description="Voice provider to use"
    )
    speed: Optional[float] = Field(
        None, 
        description="Speech speed, between 0.5 and 2.0"
    )
    pitch: Optional[float] = Field(
        None, 
        description="Voice pitch, between 0.5 and 2.0"
    )
    output_format: Optional[str] = Field(
        None, 
        description="Audio output format"
    )
    stream: Optional[bool] = Field(
        None, 
        description="Whether to stream the audio response"
    )
    provider_options: Optional[Dict[str, Any]] = Field(
        None, 
        description="Provider-specific options"
    )
    
    @validator('text')
    def validate_text(cls, text):
        """Validate that text is not empty."""
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        return text
    
    @validator('provider')
    def validate_provider(cls, provider):
        """Validate that the provider is supported."""
        if provider is None:
            return DEFAULT_VOICE_PROVIDER
        
        if provider not in VOICE_PROVIDERS:
            raise ValueError(f"Unsupported provider. Choose from: {', '.join(VOICE_PROVIDERS)}")
        
        return provider
    
    @validator('speed')
    def validate_speed(cls, speed):
        """Validate that speed is within acceptable range."""
        if speed is None:
            return 1.0
        
        if not 0.5 <= speed <= 2.0:
            raise ValueError("Speed must be between 0.5 and 2.0")
        
        return speed
    
    @validator('pitch')
    def validate_pitch(cls, pitch):
        """Validate that pitch is within acceptable range."""
        if pitch is None:
            return 1.0
        
        if not 0.5 <= pitch <= 2.0:
            raise ValueError("Pitch must be between 0.5 and 2.0")
        
        return pitch
    
    @validator('output_format')
    def validate_output_format(cls, output_format):
        """Validate that output format is supported."""
        if output_format is None:
            return DEFAULT_AUDIO_FORMAT
        
        if output_format not in AUDIO_FORMATS:
            raise ValueError(f"Unsupported output format. Choose from: {', '.join(AUDIO_FORMATS)}")
        
        return output_format
    
    @validator('stream')
    def validate_stream(cls, stream):
        """Validate stream flag."""
        if stream is None:
            return False
        return stream


class SynthesisResponse(BaseModel):
    """
    Schema for text-to-speech synthesis response.
    """
    audio_data: str = Field(..., description="Base64-encoded audio data")
    content_type: str = Field(..., description="Content type of audio (e.g., 'audio/mp3')")
    provider: str = Field(..., description="Provider used for synthesis")
    voice_id: str = Field(..., description="Voice ID used for synthesis")
    metadata: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional metadata about the synthesis"
    )
    
    @validator('audio_data')
    def validate_audio_data(cls, audio_data):
        """Validate that audio_data is properly base64 encoded."""
        try:
            # Try to decode to validate it's proper base64
            base64.b64decode(audio_data)
        except Exception:
            raise ValueError("Invalid base64 encoding for audio_data")
        
        return audio_data
    
    @validator('content_type')
    def validate_content_type(cls, content_type):
        """Validate content type format."""
        if not content_type.startswith('audio/'):
            raise ValueError("Content type must be an audio format (e.g., 'audio/mp3')")
        
        return content_type


class VoiceInfo(BaseModel):
    """
    Schema for voice information.
    """
    voice_id: str = Field(..., description="Unique identifier for the voice")
    name: str = Field(..., description="Display name of the voice")
    provider: str = Field(..., description="Provider of the voice")
    gender: Optional[str] = Field(None, description="Gender of the voice (if applicable)")
    language: Optional[str] = Field(None, description="Primary language of the voice")
    accent: Optional[str] = Field(None, description="Accent of the voice (if applicable)")
    description: Optional[str] = Field(None, description="Description of the voice")
    preview_url: Optional[str] = Field(None, description="URL to a preview audio sample")
    additional_info: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional provider-specific information"
    )
    
    @validator('provider')
    def validate_provider(cls, provider):
        """Validate that the provider is supported."""
        if provider not in VOICE_PROVIDERS:
            raise ValueError(f"Unsupported provider. Choose from: {', '.join(VOICE_PROVIDERS)}")
        
        return provider


class VoiceListRequest(BaseModel):
    """
    Schema for requesting available voices.
    """
    provider: Optional[str] = Field(
        None, 
        description="Provider to filter voices by, or 'all' for all providers"
    )
    force_refresh: Optional[bool] = Field(
        None, 
        description="Whether to force a refresh of the voice list from providers"
    )
    
    @validator('provider')
    def validate_provider(cls, provider):
        """Validate that the provider is supported."""
        if provider is None:
            return 'all'
        
        if provider != 'all' and provider not in VOICE_PROVIDERS:
            raise ValueError(f"Unsupported provider. Choose from: 'all', {', '.join(VOICE_PROVIDERS)}")
        
        return provider
    
    @validator('force_refresh')
    def validate_force_refresh(cls, force_refresh):
        """Validate force_refresh flag."""
        if force_refresh is None:
            return False
        return force_refresh


class VoiceListResponse(BaseModel):
    """
    Schema for response containing available voices.
    """
    voices: List[VoiceInfo] = Field(..., description="List of available voices")
    count_by_provider: Dict[str, int] = Field(
        ..., 
        description="Count of voices per provider"
    )