import requests
import logging
import json
import base64
import io
from typing import List, Dict, Any, Optional, Tuple, Generator

from ..config.settings import Settings
from ..schemas.voice import VoiceInfo

# Configure logger
logger = logging.getLogger(__name__)

# Constants
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"
DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"  # Default ElevenLabs voice ID
DEFAULT_MODEL_ID = "eleven_monolingual_v1"  # Default ElevenLabs model


class ElevenLabsClient:
    """Client for interacting with the ElevenLabs API for text-to-speech functionality"""
    
    def __init__(self, settings: Settings):
        """
        Initialize the ElevenLabs client with settings
        
        Args:
            settings: Application settings
        """
        self._settings = settings
        self._api_key = settings.get_secret("elevenlabs_api_key")
        self._api_url = settings.get("voice.elevenlabs_api_url", ELEVENLABS_API_URL)
        self._default_voice_id = settings.get("voice.elevenlabs_default_voice_id", DEFAULT_VOICE_ID)
        self._default_model_id = settings.get("voice.elevenlabs_default_model_id", DEFAULT_MODEL_ID)
        self._headers = {"xi-api-key": self._api_key} if self._api_key else {}
        self._voices_cache = {}
        
        logger.info(f"Initialized ElevenLabs client with API URL: {self._api_url}")
        if not self._api_key:
            logger.warning("ElevenLabs API key not found in settings")
    
    def text_to_speech(self, text: str, voice_id: Optional[str] = None, 
                       stability: float = 0.5, similarity_boost: float = 0.75,
                       model_id: Optional[str] = None, 
                       output_format: Optional[str] = None) -> Tuple[bytes, str]:
        """
        Convert text to speech using ElevenLabs API
        
        Args:
            text: Text to convert to speech
            voice_id: ID of the voice to use (defaults to the default voice)
            stability: Voice stability (0-1)
            similarity_boost: Voice similarity boost (0-1)
            model_id: ID of the TTS model to use
            output_format: Output audio format (mp3, wav, etc.)
        
        Returns:
            Tuple containing audio data (bytes) and content type (str)
        
        Raises:
            ValueError: If the API key is not available
            requests.RequestException: If the API request fails
        """
        if not self._validate_api_key():
            raise ValueError("ElevenLabs API key is required for text-to-speech")
        
        voice_id = voice_id or self._default_voice_id
        model_id = model_id or self._default_model_id
        
        url = f"{self._api_url}/text-to-speech/{voice_id}"
        
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost
            }
        }
        
        headers = self._headers.copy()
        if output_format:
            headers["Accept"] = f"audio/{output_format}"
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                self._handle_error_response(response)
                
            content_type = response.headers.get("Content-Type", "audio/mpeg")
            return response.content, content_type
            
        except requests.RequestException as e:
            logger.error(f"Error in text_to_speech: {str(e)}")
            raise
    
    def text_to_speech_stream(self, text: str, voice_id: Optional[str] = None,
                             stability: float = 0.5, similarity_boost: float = 0.75,
                             model_id: Optional[str] = None,
                             output_format: Optional[str] = None) -> Generator[bytes, None, None]:
        """
        Stream audio data from text using ElevenLabs API
        
        Args:
            text: Text to convert to speech
            voice_id: ID of the voice to use (defaults to the default voice)
            stability: Voice stability (0-1)
            similarity_boost: Voice similarity boost (0-1)
            model_id: ID of the TTS model to use
            output_format: Output audio format (mp3, wav, etc.)
        
        Returns:
            Generator yielding chunks of audio data
        
        Raises:
            ValueError: If the API key is not available
            requests.RequestException: If the API request fails
        """
        if not self._validate_api_key():
            raise ValueError("ElevenLabs API key is required for text-to-speech streaming")
        
        voice_id = voice_id or self._default_voice_id
        model_id = model_id or self._default_model_id
        
        url = f"{self._api_url}/text-to-speech/{voice_id}/stream"
        
        payload = {
            "text": text,
            "model_id": model_id,
            "voice_settings": {
                "stability": stability,
                "similarity_boost": similarity_boost
            }
        }
        
        headers = self._headers.copy()
        if output_format:
            headers["Accept"] = f"audio/{output_format}"
        else:
            headers["Accept"] = "audio/mpeg"
        
        try:
            response = requests.post(url, json=payload, headers=headers, stream=True)
            
            if response.status_code != 200:
                self._handle_error_response(response)
            
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    yield chunk
                    
        except requests.RequestException as e:
            logger.error(f"Error in text_to_speech_stream: {str(e)}")
            raise
    
    def get_voices(self, force_refresh: bool = False) -> List[VoiceInfo]:
        """
        Get list of available voices from ElevenLabs
        
        Args:
            force_refresh: Force refresh the voices cache
        
        Returns:
            List of VoiceInfo objects
        
        Raises:
            ValueError: If the API key is not available
            requests.RequestException: If the API request fails
        """
        if not self._validate_api_key():
            raise ValueError("ElevenLabs API key is required to get voices")
        
        # Return cached voices if available and not forcing refresh
        if not force_refresh and self._voices_cache:
            return list(self._voices_cache.values())
        
        url = f"{self._api_url}/voices"
        
        try:
            response = requests.get(url, headers=self._headers)
            
            if response.status_code != 200:
                self._handle_error_response(response)
            
            data = response.json()
            voices = []
            
            for voice_data in data.get("voices", []):
                voice_info = VoiceInfo(
                    voice_id=voice_data.get("voice_id"),
                    name=voice_data.get("name"),
                    provider="elevenlabs",
                    gender=None,  # ElevenLabs doesn't provide gender info directly
                    language=voice_data.get("labels", {}).get("language"),
                    accent=None,
                    description=voice_data.get("description", ""),
                    preview_url=voice_data.get("preview_url"),
                    additional_info={
                        "category": voice_data.get("category"),
                        "fine_tuning": voice_data.get("fine_tuning", {}),
                        "labels": voice_data.get("labels", {})
                    }
                )
                voices.append(voice_info)
                self._voices_cache[voice_info.voice_id] = voice_info
            
            return voices
            
        except requests.RequestException as e:
            logger.error(f"Error in get_voices: {str(e)}")
            raise
    
    def get_voice_settings(self, voice_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get settings for a specific voice
        
        Args:
            voice_id: ID of the voice (defaults to the default voice)
        
        Returns:
            Voice settings including default stability and similarity_boost
        
        Raises:
            ValueError: If the API key is not available
            requests.RequestException: If the API request fails
        """
        if not self._validate_api_key():
            raise ValueError("ElevenLabs API key is required to get voice settings")
        
        voice_id = voice_id or self._default_voice_id
        url = f"{self._api_url}/voices/{voice_id}/settings"
        
        try:
            response = requests.get(url, headers=self._headers)
            
            if response.status_code != 200:
                self._handle_error_response(response)
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Error in get_voice_settings: {str(e)}")
            raise
    
    def get_models(self) -> List[Dict[str, Any]]:
        """
        Get list of available TTS models from ElevenLabs
        
        Returns:
            List of available TTS models
        
        Raises:
            ValueError: If the API key is not available
            requests.RequestException: If the API request fails
        """
        if not self._validate_api_key():
            raise ValueError("ElevenLabs API key is required to get models")
        
        url = f"{self._api_url}/models"
        
        try:
            response = requests.get(url, headers=self._headers)
            
            if response.status_code != 200:
                self._handle_error_response(response)
            
            return response.json()
            
        except requests.RequestException as e:
            logger.error(f"Error in get_models: {str(e)}")
            raise
    
    def _validate_api_key(self) -> bool:
        """
        Validate that API key is available
        
        Returns:
            True if API key is available, False otherwise
        """
        if not self._api_key:
            logger.error("ElevenLabs API key not available")
            return False
        return True
    
    def _handle_error_response(self, response: requests.Response) -> None:
        """
        Handle error responses from ElevenLabs API
        
        Args:
            response: Response object from the API request
        
        Raises:
            requests.HTTPError: With appropriate error message
        """
        try:
            error_data = response.json()
            error_message = error_data.get("detail", {}).get("message", "Unknown error")
            logger.error(f"ElevenLabs API error ({response.status_code}): {error_message}")
        except json.JSONDecodeError:
            error_message = response.text
            logger.error(f"ElevenLabs API error ({response.status_code}): {error_message}")
        
        if response.status_code == 401:
            raise requests.HTTPError(f"Authentication error: {error_message}")
        elif response.status_code == 400:
            raise requests.HTTPError(f"Bad request: {error_message}")
        elif response.status_code == 429:
            raise requests.HTTPError(f"Rate limit exceeded: {error_message}")
        else:
            raise requests.HTTPError(f"API error ({response.status_code}): {error_message}")