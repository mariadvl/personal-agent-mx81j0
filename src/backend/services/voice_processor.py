import os
import tempfile
import base64
import logging
from typing import Dict, List, Optional, Any, Union, Tuple, Generator
import io
from io import BytesIO

from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..integrations.openai_client import OpenAIClient
from ..integrations.elevenlabs_client import ElevenLabsClient
from ..schemas.voice import (
    TranscriptionRequest, TranscriptionResponse, 
    SynthesisRequest, SynthesisResponse,
    VoiceInfo, VoiceListResponse,
    VOICE_PROVIDERS, AUDIO_FORMATS, DEFAULT_AUDIO_FORMAT, 
    DEFAULT_VOICE_PROVIDER, DEFAULT_STT_MODEL
)

# Configure logger
logger = logging.getLogger(__name__)

# Define temporary directory for audio files
TEMP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'temp')

class VoiceProcessorError(Exception):
    """Base exception class for voice processing errors."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}

class TranscriptionError(VoiceProcessorError):
    """Exception for speech-to-text transcription errors."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, details)

class SynthesisError(VoiceProcessorError):
    """Exception for text-to-speech synthesis errors."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, details)

class VoiceProcessor:
    """
    Service for handling voice processing operations including speech-to-text and text-to-speech.
    """
    
    def __init__(self, settings: Settings, event_bus: EventBus):
        """
        Initialize the voice processor with required dependencies.
        
        Args:
            settings: Application settings
            event_bus: Event bus for publishing events
        """
        self._settings = settings
        self._event_bus = event_bus
        
        # Initialize API clients
        self._openai_client = OpenAIClient(
            api_key=settings.get_secret("openai_api_key")
        )
        
        self._elevenlabs_client = ElevenLabsClient(settings)
        
        # Initialize voice cache
        self._voices_cache = {}
        
        # Initialize local engines if enabled
        self._local_tts_engine = None
        self._local_stt_engine = None
        
        if settings.get("voice.use_local_tts", False):
            self._initialize_local_tts_engine()
            
        if settings.get("voice.use_local_stt", False):
            self._initialize_local_stt_engine()
        
        # Create temp directory if it doesn't exist
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        logger.info("VoiceProcessor initialized")
    
    def transcribe_audio(self, request: TranscriptionRequest) -> TranscriptionResponse:
        """
        Convert speech to text using the configured provider.
        
        Args:
            request: Transcription request containing audio data or file path
            
        Returns:
            TranscriptionResponse: Transcription result with text and metadata
            
        Raises:
            TranscriptionError: If transcription fails
        """
        logger.info(f"Transcribing audio with model: {request.model or DEFAULT_STT_MODEL}")
        
        try:
            # Determine the source of audio
            audio_file_path = None
            
            if request.audio_data:
                # Save base64 audio data to temporary file
                file_ext = ".wav"  # Default extension
                if request.audio_data.startswith("data:audio/"):
                    # Extract file extension from mime type
                    mime_parts = request.audio_data.split(";")[0].split("/")
                    if len(mime_parts) > 1:
                        file_ext = f".{mime_parts[1]}"
                
                # Extract base64 data if it includes the data URL prefix
                base64_data = request.audio_data
                if "base64," in base64_data:
                    base64_data = base64_data.split("base64,")[1]
                
                audio_file_path = self._save_base64_to_temp_file(base64_data, file_ext)
            elif request.audio_file_path:
                audio_file_path = request.audio_file_path
            else:
                raise TranscriptionError("No audio data or file path provided", 
                                        {"request": request})
            
            # Determine which transcription service to use
            use_openai = self._settings.get("voice.use_openai_whisper", True)
            
            result = None
            if use_openai:
                # Use OpenAI Whisper API
                result = self._transcribe_with_openai(
                    audio_file_path, 
                    request.language, 
                    request.model
                )
            elif self._local_stt_engine:
                # Use local transcription engine
                result = self._transcribe_with_local_engine(
                    audio_file_path, 
                    request.language, 
                    request.model
                )
            else:
                raise TranscriptionError(
                    "No transcription service available. Enable OpenAI Whisper or local STT engine.",
                    {"request": request}
                )
            
            # Clean up temporary file if we created one
            if request.audio_data and audio_file_path:
                try:
                    os.remove(audio_file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary audio file: {str(e)}")
            
            # Publish transcription event
            self._event_bus.publish("voice:transcribed", {
                "success": True,
                "language": result.get("language", request.language),
                "model": result.get("model", request.model or DEFAULT_STT_MODEL),
                "text_length": len(result.get("text", "")),
                "confidence": result.get("confidence", 0)
            })
            
            # Return response
            return TranscriptionResponse(
                text=result.get("text", ""),
                confidence=result.get("confidence", 0),
                language=result.get("language", request.language or "en"),
                model=result.get("model", request.model or DEFAULT_STT_MODEL),
                segments=result.get("segments"),
                metadata=result.get("metadata")
            )
            
        except Exception as e:
            error_message = f"Transcription failed: {str(e)}"
            logger.error(error_message)
            
            # Publish error event
            self._event_bus.publish("voice:transcription_error", {
                "error": str(e),
                "model": request.model or DEFAULT_STT_MODEL
            })
            
            raise TranscriptionError(error_message, {"error": str(e)})
    
    def _transcribe_with_openai(self, audio_file_path: str,
                               language: Optional[str] = None,
                               model: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio using OpenAI Whisper API.
        
        Args:
            audio_file_path: Path to the audio file
            language: Optional language code
            model: Optional model name
            
        Returns:
            Dict containing transcription result
            
        Raises:
            TranscriptionError: If transcription fails
        """
        logger.info(f"Transcribing audio with OpenAI Whisper, model: {model or DEFAULT_STT_MODEL}")
        
        try:
            # If model not specified, use default
            if not model:
                model = DEFAULT_STT_MODEL
            
            # Configure additional options
            options = {}
            if language:
                options["language"] = language
            
            # Call OpenAI client to transcribe
            response = self._openai_client.transcribe_audio(
                audio_file_path=audio_file_path,
                model=model,
                options=options
            )
            
            # Extract relevant information from response
            result = {
                "text": response.get("text", ""),
                "model": model,
                "confidence": 0.9,  # OpenAI doesn't provide confidence scores, using default
                "language": language or response.get("language", "en")
            }
            
            # Add segments if available
            if "segments" in response:
                result["segments"] = response["segments"]
            
            return result
            
        except Exception as e:
            error_message = f"OpenAI transcription failed: {str(e)}"
            logger.error(error_message)
            raise TranscriptionError(error_message, {"error": str(e)})
    
    def _transcribe_with_local_engine(self, audio_file_path: str,
                                     language: Optional[str] = None,
                                     model: Optional[str] = None) -> Dict[str, Any]:
        """
        Transcribe audio using local STT engine.
        
        Args:
            audio_file_path: Path to the audio file
            language: Optional language code
            model: Optional model name
            
        Returns:
            Dict containing transcription result
            
        Raises:
            TranscriptionError: If transcription fails or local engine not available
        """
        logger.info(f"Transcribing audio with local engine, model: {model}")
        
        if not self._local_stt_engine:
            raise TranscriptionError(
                "Local STT engine not initialized",
                {"audio_file_path": audio_file_path}
            )
        
        try:
            # Configure options
            options = {}
            if language:
                options["language"] = language
            if model:
                options["model"] = model
            
            # Call local engine
            result = self._local_stt_engine.transcribe(audio_file_path, **options)
            
            # Format result to match expected structure
            formatted_result = {
                "text": result.get("text", ""),
                "model": result.get("model", model or "local"),
                "confidence": result.get("confidence", 0.8),
                "language": result.get("language", language or "en")
            }
            
            # Add segments if available
            if "segments" in result:
                formatted_result["segments"] = result["segments"]
            
            return formatted_result
            
        except Exception as e:
            error_message = f"Local transcription failed: {str(e)}"
            logger.error(error_message)
            raise TranscriptionError(error_message, {"error": str(e)})
    
    def synthesize_speech(self, request: SynthesisRequest) -> SynthesisResponse:
        """
        Convert text to speech using the configured provider.
        
        Args:
            request: Synthesis request containing text and voice options
            
        Returns:
            SynthesisResponse: Synthesis result with audio data
            
        Raises:
            SynthesisError: If synthesis fails
        """
        logger.info(f"Synthesizing speech, provider: {request.provider or DEFAULT_VOICE_PROVIDER}, "
                   f"text length: {len(request.text)}")
        
        try:
            # Determine which synthesis service to use
            provider = request.provider or DEFAULT_VOICE_PROVIDER
            
            audio_data = None
            content_type = None
            voice_id = request.voice_id
            
            if provider == "elevenlabs":
                # Use ElevenLabs API
                audio_bytes, content_type = self._synthesize_with_elevenlabs(
                    text=request.text,
                    voice_id=voice_id,
                    speed=request.speed,
                    pitch=request.pitch,
                    output_format=request.output_format
                )
                audio_data = base64.b64encode(audio_bytes).decode('utf-8')
                
            elif provider == "coqui" and self._local_tts_engine:
                # Use local Coqui TTS engine
                audio_bytes, content_type = self._synthesize_with_local_engine(
                    text=request.text,
                    voice_id=voice_id,
                    speed=request.speed,
                    pitch=request.pitch,
                    output_format=request.output_format
                )
                audio_data = base64.b64encode(audio_bytes).decode('utf-8')
                
            elif provider == "system":
                # Use system TTS
                audio_bytes, content_type = self._synthesize_with_system_tts(
                    text=request.text,
                    voice_id=voice_id,
                    speed=request.speed,
                    pitch=request.pitch,
                    output_format=request.output_format
                )
                audio_data = base64.b64encode(audio_bytes).decode('utf-8')
                
            else:
                raise SynthesisError(
                    f"Unsupported provider '{provider}' or provider not available",
                    {"provider": provider, "available_providers": VOICE_PROVIDERS}
                )
            
            # Publish synthesis event
            self._event_bus.publish("voice:synthesized", {
                "success": True,
                "provider": provider,
                "voice_id": voice_id,
                "text_length": len(request.text),
                "audio_size": len(audio_data) if audio_data else 0
            })
            
            # Return response
            return SynthesisResponse(
                audio_data=audio_data,
                content_type=content_type,
                provider=provider,
                voice_id=voice_id or "default",
                metadata={
                    "text_length": len(request.text),
                    "speed": request.speed,
                    "pitch": request.pitch,
                    "format": request.output_format or DEFAULT_AUDIO_FORMAT
                }
            )
            
        except Exception as e:
            error_message = f"Speech synthesis failed: {str(e)}"
            logger.error(error_message)
            
            # Publish error event
            self._event_bus.publish("voice:synthesis_error", {
                "error": str(e),
                "provider": request.provider or DEFAULT_VOICE_PROVIDER,
                "text_length": len(request.text)
            })
            
            raise SynthesisError(error_message, {"error": str(e)})
    
    def _synthesize_with_elevenlabs(self, text: str,
                                  voice_id: Optional[str] = None,
                                  speed: Optional[float] = None,
                                  pitch: Optional[float] = None,
                                  output_format: Optional[str] = None) -> Tuple[bytes, str]:
        """
        Synthesize speech using ElevenLabs API.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID
            speed: Optional speech speed (0.5-2.0)
            pitch: Optional voice pitch (0.5-2.0)
            output_format: Optional output format
            
        Returns:
            Tuple containing audio data (bytes) and content type (str)
            
        Raises:
            SynthesisError: If synthesis fails
        """
        logger.info(f"Synthesizing speech with ElevenLabs, voice_id: {voice_id}")
        
        try:
            # Map speed and pitch to ElevenLabs parameters
            stability = 0.5
            similarity_boost = 0.75
            
            if speed is not None:
                # Invert speed to stability (higher speed = lower stability)
                stability = max(0.1, min(1.0, 1.5 - (speed - 0.5)))
            
            if pitch is not None:
                # Map pitch to similarity_boost (arbitrary mapping)
                similarity_boost = max(0.0, min(1.0, 0.5 + (pitch - 1.0)))
            
            # Call ElevenLabs client
            audio_data, content_type = self._elevenlabs_client.text_to_speech(
                text=text,
                voice_id=voice_id,
                stability=stability,
                similarity_boost=similarity_boost,
                output_format=output_format
            )
            
            return audio_data, content_type
            
        except Exception as e:
            error_message = f"ElevenLabs synthesis failed: {str(e)}"
            logger.error(error_message)
            raise SynthesisError(error_message, {"error": str(e)})
    
    def _synthesize_with_local_engine(self, text: str,
                                    voice_id: Optional[str] = None,
                                    speed: Optional[float] = None,
                                    pitch: Optional[float] = None,
                                    output_format: Optional[str] = None) -> Tuple[bytes, str]:
        """
        Synthesize speech using local TTS engine.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID
            speed: Optional speech speed (0.5-2.0)
            pitch: Optional voice pitch (0.5-2.0)
            output_format: Optional output format
            
        Returns:
            Tuple containing audio data (bytes) and content type (str)
            
        Raises:
            SynthesisError: If synthesis fails or local engine not available
        """
        logger.info(f"Synthesizing speech with local engine, voice_id: {voice_id}")
        
        if not self._local_tts_engine:
            raise SynthesisError(
                "Local TTS engine not initialized",
                {"text_length": len(text)}
            )
        
        try:
            # Configure options
            options = {}
            if voice_id:
                options["voice_id"] = voice_id
            if speed:
                options["speed"] = speed
            if pitch:
                options["pitch"] = pitch
            if output_format:
                options["output_format"] = output_format
            
            # Call local engine
            audio_data, content_type = self._local_tts_engine.synthesize(text, **options)
            
            return audio_data, content_type
            
        except Exception as e:
            error_message = f"Local synthesis failed: {str(e)}"
            logger.error(error_message)
            raise SynthesisError(error_message, {"error": str(e)})
    
    def _synthesize_with_system_tts(self, text: str,
                                  voice_id: Optional[str] = None,
                                  speed: Optional[float] = None,
                                  pitch: Optional[float] = None,
                                  output_format: Optional[str] = None) -> Tuple[bytes, str]:
        """
        Synthesize speech using system TTS.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID
            speed: Optional speech speed (0.5-2.0)
            pitch: Optional voice pitch (0.5-2.0)
            output_format: Optional output format
            
        Returns:
            Tuple containing audio data (bytes) and content type (str)
            
        Raises:
            SynthesisError: If synthesis fails
        """
        logger.info(f"Synthesizing speech with system TTS, voice_id: {voice_id}")
        
        try:
            # This is a placeholder for system TTS implementation
            # Actual implementation would depend on the platform (Windows, macOS, Linux)
            
            # For example, on Windows we could use the win32com.client to access SAPI
            # On macOS, we could use subprocess to call the 'say' command
            # On Linux, we could use subprocess to call 'espeak' or another TTS engine
            
            # For this example, we'll just raise an error
            raise NotImplementedError("System TTS not implemented yet")
            
            # In a real implementation, we would:
            # 1. Generate audio using the system TTS
            # 2. Save it to a temporary file
            # 3. Read the file into memory
            # 4. Delete the temporary file
            # 5. Return the audio data and content type
            
        except Exception as e:
            error_message = f"System TTS synthesis failed: {str(e)}"
            logger.error(error_message)
            raise SynthesisError(error_message, {"error": str(e)})
    
    def synthesize_speech_stream(self, request: SynthesisRequest) -> Generator[bytes, None, None]:
        """
        Stream audio data from text using the configured provider.
        
        Args:
            request: Synthesis request containing text and voice options
            
        Returns:
            Generator yielding audio data chunks
            
        Raises:
            SynthesisError: If synthesis fails
        """
        logger.info(f"Streaming speech synthesis, provider: {request.provider or DEFAULT_VOICE_PROVIDER}, "
                   f"text length: {len(request.text)}")
        
        try:
            # Determine which synthesis service to use
            provider = request.provider or DEFAULT_VOICE_PROVIDER
            
            if provider == "elevenlabs":
                # Use ElevenLabs API streaming
                yield from self._stream_with_elevenlabs(
                    text=request.text,
                    voice_id=request.voice_id,
                    speed=request.speed,
                    pitch=request.pitch,
                    output_format=request.output_format
                )
                
            elif provider == "coqui" and self._local_tts_engine:
                # Use local Coqui TTS engine streaming
                yield from self._stream_with_local_engine(
                    text=request.text,
                    voice_id=request.voice_id,
                    speed=request.speed,
                    pitch=request.pitch,
                    output_format=request.output_format
                )
                
            else:
                # If streaming not supported, synthesize in one go and stream the chunks
                response = self.synthesize_speech(request)
                audio_bytes = base64.b64decode(response.audio_data)
                
                # Stream in 32KB chunks
                chunk_size = 32 * 1024
                for i in range(0, len(audio_bytes), chunk_size):
                    yield audio_bytes[i:i+chunk_size]
            
            # Publish synthesis event
            self._event_bus.publish("voice:stream_complete", {
                "success": True,
                "provider": provider,
                "voice_id": request.voice_id,
                "text_length": len(request.text)
            })
            
        except Exception as e:
            error_message = f"Speech synthesis streaming failed: {str(e)}"
            logger.error(error_message)
            
            # Publish error event
            self._event_bus.publish("voice:stream_error", {
                "error": str(e),
                "provider": request.provider or DEFAULT_VOICE_PROVIDER,
                "text_length": len(request.text)
            })
            
            raise SynthesisError(error_message, {"error": str(e)})
    
    def _stream_with_elevenlabs(self, text: str,
                              voice_id: Optional[str] = None,
                              speed: Optional[float] = None,
                              pitch: Optional[float] = None,
                              output_format: Optional[str] = None) -> Generator[bytes, None, None]:
        """
        Stream speech using ElevenLabs API.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID
            speed: Optional speech speed (0.5-2.0)
            pitch: Optional voice pitch (0.5-2.0)
            output_format: Optional output format
            
        Returns:
            Generator yielding audio data chunks
            
        Raises:
            SynthesisError: If streaming fails
        """
        logger.info(f"Streaming speech with ElevenLabs, voice_id: {voice_id}")
        
        try:
            # Map speed and pitch to ElevenLabs parameters
            stability = 0.5
            similarity_boost = 0.75
            
            if speed is not None:
                # Invert speed to stability (higher speed = lower stability)
                stability = max(0.1, min(1.0, 1.5 - (speed - 0.5)))
            
            if pitch is not None:
                # Map pitch to similarity_boost (arbitrary mapping)
                similarity_boost = max(0.0, min(1.0, 0.5 + (pitch - 1.0)))
            
            # Call ElevenLabs client streaming method
            for chunk in self._elevenlabs_client.text_to_speech_stream(
                text=text,
                voice_id=voice_id,
                stability=stability,
                similarity_boost=similarity_boost,
                output_format=output_format
            ):
                yield chunk
                
        except Exception as e:
            error_message = f"ElevenLabs streaming failed: {str(e)}"
            logger.error(error_message)
            raise SynthesisError(error_message, {"error": str(e)})
    
    def _stream_with_local_engine(self, text: str,
                                voice_id: Optional[str] = None,
                                speed: Optional[float] = None,
                                pitch: Optional[float] = None,
                                output_format: Optional[str] = None) -> Generator[bytes, None, None]:
        """
        Stream speech using local TTS engine.
        
        Args:
            text: Text to synthesize
            voice_id: Optional voice ID
            speed: Optional speech speed (0.5-2.0)
            pitch: Optional voice pitch (0.5-2.0)
            output_format: Optional output format
            
        Returns:
            Generator yielding audio data chunks
            
        Raises:
            SynthesisError: If streaming fails or local engine not available
        """
        logger.info(f"Streaming speech with local engine, voice_id: {voice_id}")
        
        if not self._local_tts_engine:
            raise SynthesisError(
                "Local TTS engine not initialized",
                {"text_length": len(text)}
            )
        
        try:
            # Configure options
            options = {}
            if voice_id:
                options["voice_id"] = voice_id
            if speed:
                options["speed"] = speed
            if pitch:
                options["pitch"] = pitch
            if output_format:
                options["output_format"] = output_format
            
            # Check if local engine supports streaming
            if hasattr(self._local_tts_engine, "synthesize_stream"):
                # Use streaming interface
                for chunk in self._local_tts_engine.synthesize_stream(text, **options):
                    yield chunk
            else:
                # Fallback to non-streaming and chunk the result
                audio_data, _ = self._local_tts_engine.synthesize(text, **options)
                
                # Stream in 32KB chunks
                chunk_size = 32 * 1024
                for i in range(0, len(audio_data), chunk_size):
                    yield audio_data[i:i+chunk_size]
                    
        except Exception as e:
            error_message = f"Local engine streaming failed: {str(e)}"
            logger.error(error_message)
            raise SynthesisError(error_message, {"error": str(e)})
    
    def get_available_voices(self, provider: Optional[str] = None, 
                           force_refresh: Optional[bool] = False) -> VoiceListResponse:
        """
        Get list of available voices from all providers or a specific provider.
        
        Args:
            provider: Provider to get voices from, or 'all' for all providers
            force_refresh: Whether to force a refresh of the voice list from providers
            
        Returns:
            VoiceListResponse containing list of available voices
        """
        logger.info(f"Getting available voices, provider: {provider or 'all'}, "
                   f"force_refresh: {force_refresh}")
        
        provider = provider or "all"
        voices = []
        
        # Get voices from ElevenLabs
        if provider == "all" or provider == "elevenlabs":
            try:
                elevenlabs_voices = self._get_elevenlabs_voices(force_refresh)
                voices.extend(elevenlabs_voices)
            except Exception as e:
                logger.warning(f"Failed to get ElevenLabs voices: {str(e)}")
        
        # Get voices from local TTS engine
        if provider == "all" or provider == "coqui":
            try:
                local_voices = self._get_local_voices(force_refresh)
                voices.extend(local_voices)
            except Exception as e:
                logger.warning(f"Failed to get local TTS voices: {str(e)}")
        
        # Get voices from system TTS
        if provider == "all" or provider == "system":
            try:
                system_voices = self._get_system_voices(force_refresh)
                voices.extend(system_voices)
            except Exception as e:
                logger.warning(f"Failed to get system TTS voices: {str(e)}")
        
        # Count voices by provider
        count_by_provider = {}
        for voice in voices:
            if voice.provider not in count_by_provider:
                count_by_provider[voice.provider] = 0
            count_by_provider[voice.provider] += 1
        
        return VoiceListResponse(voices=voices, count_by_provider=count_by_provider)
    
    def _get_elevenlabs_voices(self, force_refresh: bool) -> List[VoiceInfo]:
        """
        Get available voices from ElevenLabs.
        
        Args:
            force_refresh: Whether to force a refresh of the voice list
            
        Returns:
            List of VoiceInfo objects
        """
        # Check if we have cached voices and don't need to refresh
        if not force_refresh and "elevenlabs" in self._voices_cache:
            return list(self._voices_cache["elevenlabs"].values())
        
        try:
            # Get voices from ElevenLabs client
            voices = self._elevenlabs_client.get_voices()
            
            # Initialize cache if needed
            if "elevenlabs" not in self._voices_cache:
                self._voices_cache["elevenlabs"] = {}
            
            # Cache voices
            for voice in voices:
                self._voices_cache["elevenlabs"][voice.voice_id] = voice
            
            return voices
            
        except Exception as e:
            logger.warning(f"Failed to get ElevenLabs voices: {str(e)}")
            return []
    
    def _get_local_voices(self, force_refresh: bool) -> List[VoiceInfo]:
        """
        Get available voices from local TTS engine.
        
        Args:
            force_refresh: Whether to force a refresh of the voice list
            
        Returns:
            List of VoiceInfo objects
        """
        # Check if local TTS engine is available
        if not self._local_tts_engine:
            logger.warning("Local TTS engine not initialized")
            return []
        
        # Check if we have cached voices and don't need to refresh
        if not force_refresh and "coqui" in self._voices_cache:
            return list(self._voices_cache["coqui"].values())
        
        try:
            # Get voices from local TTS engine
            voices_data = self._local_tts_engine.list_voices()
            
            # Initialize cache if needed
            if "coqui" not in self._voices_cache:
                self._voices_cache["coqui"] = {}
            
            # Convert to VoiceInfo objects
            voices = []
            for voice_data in voices_data:
                voice_info = VoiceInfo(
                    voice_id=voice_data.get("id", f"local_{len(voices)}"),
                    name=voice_data.get("name", f"Local Voice {len(voices)}"),
                    provider="coqui",
                    gender=voice_data.get("gender"),
                    language=voice_data.get("language"),
                    accent=voice_data.get("accent"),
                    description=voice_data.get("description", "Local TTS voice"),
                    preview_url=None,
                    additional_info=voice_data.get("additional_info", {})
                )
                voices.append(voice_info)
                self._voices_cache["coqui"][voice_info.voice_id] = voice_info
            
            return voices
            
        except Exception as e:
            logger.warning(f"Failed to get local TTS voices: {str(e)}")
            return []
    
    def _get_system_voices(self, force_refresh: bool) -> List[VoiceInfo]:
        """
        Get available voices from system TTS.
        
        Args:
            force_refresh: Whether to force a refresh of the voice list
            
        Returns:
            List of VoiceInfo objects
        """
        # Check if we have cached voices and don't need to refresh
        if not force_refresh and "system" in self._voices_cache:
            return list(self._voices_cache["system"].values())
        
        try:
            # This is a placeholder for system TTS implementation
            # Actual implementation would depend on the platform (Windows, macOS, Linux)
            
            # Initialize cache
            if "system" not in self._voices_cache:
                self._voices_cache["system"] = {}
            
            # For demonstration, return a single system voice
            voice_info = VoiceInfo(
                voice_id="system_default",
                name="System Default",
                provider="system",
                gender=None,
                language="en",
                accent=None,
                description="Default system TTS voice",
                preview_url=None,
                additional_info={}
            )
            
            self._voices_cache["system"]["system_default"] = voice_info
            
            return [voice_info]
            
        except Exception as e:
            logger.warning(f"Failed to get system TTS voices: {str(e)}")
            return []
    
    def is_voice_available(self, voice_id: str, provider: Optional[str] = None) -> bool:
        """
        Check if a specific voice is available from a provider.
        
        Args:
            voice_id: Voice ID to check
            provider: Provider to check, or None to check all providers
            
        Returns:
            True if voice is available, False otherwise
        """
        logger.info(f"Checking if voice {voice_id} is available from provider {provider or 'any'}")
        
        if provider:
            # Check specific provider
            providers = [provider]
        else:
            # Check all providers
            providers = VOICE_PROVIDERS
        
        for p in providers:
            # Get voices for this provider
            try:
                if p == "elevenlabs":
                    voices = self._get_elevenlabs_voices(False)
                elif p == "coqui":
                    voices = self._get_local_voices(False)
                elif p == "system":
                    voices = self._get_system_voices(False)
                else:
                    continue
                
                # Check if voice ID exists
                for voice in voices:
                    if voice.voice_id == voice_id:
                        return True
                        
            except Exception as e:
                logger.warning(f"Error checking voices for provider {p}: {str(e)}")
        
        return False
    
    def _initialize_local_tts_engine(self) -> bool:
        """
        Initialize the local text-to-speech engine if enabled.
        
        Returns:
            True if initialized successfully, False otherwise
        """
        # Check if local TTS is enabled
        if not self._settings.get("voice.use_local_tts", False):
            logger.info("Local TTS engine disabled in settings")
            return False
        
        try:
            # Check which local TTS engine to use
            engine_type = self._settings.get("voice.local_tts_engine", "coqui")
            
            if engine_type == "coqui":
                # Try to import Coqui TTS
                try:
                    from TTS.api import TTS
                    
                    # Initialize TTS
                    model_name = self._settings.get("voice.local_tts_model", "tts_models/en/ljspeech/tacotron2-DDC")
                    self._local_tts_engine = TTS(model_name)
                    
                    logger.info(f"Local Coqui TTS engine initialized with model {model_name}")
                    return True
                    
                except ImportError:
                    logger.error("Coqui TTS not installed. Install with: pip install TTS")
                    return False
                    
            else:
                logger.warning(f"Unsupported local TTS engine type: {engine_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing local TTS engine: {str(e)}")
            return False
    
    def _initialize_local_stt_engine(self) -> bool:
        """
        Initialize the local speech-to-text engine if enabled.
        
        Returns:
            True if initialized successfully, False otherwise
        """
        # Check if local STT is enabled
        if not self._settings.get("voice.use_local_stt", False):
            logger.info("Local STT engine disabled in settings")
            return False
        
        try:
            # Check which local STT engine to use
            engine_type = self._settings.get("voice.local_stt_engine", "whisper")
            
            if engine_type == "whisper":
                # Try to import Whisper
                try:
                    import whisper
                    
                    # Initialize Whisper
                    model_name = self._settings.get("voice.local_stt_model", "base")
                    self._local_stt_engine = whisper.load_model(model_name)
                    
                    logger.info(f"Local Whisper STT engine initialized with model {model_name}")
                    return True
                    
                except ImportError:
                    logger.error("Whisper not installed. Install with: pip install -U openai-whisper")
                    return False
                    
            else:
                logger.warning(f"Unsupported local STT engine type: {engine_type}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing local STT engine: {str(e)}")
            return False
    
    def _save_base64_to_temp_file(self, base64_data: str, file_extension: str) -> str:
        """
        Save base64-encoded audio data to a temporary file.
        
        Args:
            base64_data: Base64-encoded audio data
            file_extension: File extension for the temporary file
            
        Returns:
            Path to the temporary file
        """
        try:
            # Decode base64 data
            binary_data = base64.b64decode(base64_data)
            
            # Create a temporary file
            fd, temp_path = tempfile.mkstemp(suffix=file_extension, dir=TEMP_DIR)
            
            # Write data to file
            with os.fdopen(fd, 'wb') as file:
                file.write(binary_data)
            
            return temp_path
            
        except Exception as e:
            logger.error(f"Error saving base64 data to temp file: {str(e)}")
            raise ValueError(f"Failed to save audio data: {str(e)}")
    
    def _get_content_type_from_format(self, format: str) -> str:
        """
        Get MIME content type from audio format.
        
        Args:
            format: Audio format (mp3, wav, etc.)
            
        Returns:
            MIME content type
        """
        format = format.lower().strip()
        content_types = {
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "flac": "audio/flac",
            "aac": "audio/aac",
            "m4a": "audio/mp4",
            "webm": "audio/webm"
        }
        
        return content_types.get(format, "audio/mpeg")