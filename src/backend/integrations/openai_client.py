import os
import json
import time
import logging
from typing import Dict, List, Optional, Any, Union, Tuple

import openai  # v1.3.0+
import tiktoken  # v0.5.0+
import requests  # v2.31.0+
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential  # v8.2.0+

from ..config.settings import Settings
from ..utils.logging_setup import setup_logging
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Retry configuration
DEFAULT_RETRY_ATTEMPTS = 3
DEFAULT_MIN_RETRY_WAIT = 1
DEFAULT_MAX_RETRY_WAIT = 10

# Default models
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_CHAT_MODEL = "gpt-4o"
DEFAULT_WHISPER_MODEL = "whisper-1"


class OpenAIError(Exception):
    """Base exception class for OpenAI API errors."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class OpenAIAuthError(OpenAIError):
    """Exception for authentication errors with the OpenAI API."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, details)


class OpenAIRateLimitError(OpenAIError):
    """Exception for rate limit errors with the OpenAI API."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, details)


class OpenAIServerError(OpenAIError):
    """Exception for server errors from the OpenAI API."""
    
    def __init__(self, message: str, details: Dict[str, Any] = None):
        super().__init__(message, details)


def get_openai_api_key() -> Optional[str]:
    """
    Retrieves the OpenAI API key from settings, environment variables, or prompts the user.
    
    Returns:
        str: OpenAI API key or None if not found
    """
    # Try to get from settings
    api_key = settings.get_secret('openai_api_key')
    
    # If not in settings, check environment variables
    if not api_key:
        api_key = os.environ.get('OPENAI_API_KEY')
        
    # Log warning if API key not found
    if not api_key:
        logger.warning("OpenAI API key not found in settings or environment variables")
    
    return api_key


def create_openai_client(api_key: Optional[str] = None, base_url: Optional[str] = None) -> openai.Client:
    """
    Creates and configures an OpenAI client with the provided API key.
    
    Args:
        api_key (str, optional): OpenAI API key. If None, will be retrieved from settings.
        base_url (str, optional): Base URL for the OpenAI API. If provided, overrides the default.
        
    Returns:
        openai.Client: Configured OpenAI client
        
    Raises:
        ValueError: If no API key can be found
    """
    if api_key is None:
        api_key = get_openai_api_key()
        
    if api_key is None:
        raise ValueError("OpenAI API key is required but not found")
    
    client = openai.Client(api_key=api_key)
    
    if base_url:
        client.base_url = base_url
        
    return client


def calculate_tokens(text: str, model_name: str = DEFAULT_CHAT_MODEL) -> int:
    """
    Estimates the number of tokens in the provided text for a specific model.
    
    Args:
        text (str): The text to estimate token count for
        model_name (str): The model to use for estimation
        
    Returns:
        int: Estimated token count
    """
    try:
        # Try to get encoding for the model
        encoding = tiktoken.encoding_for_model(model_name)
        return len(encoding.encode(text))
    except KeyError:
        # If model not found, try to use a default encoding
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except Exception as e:
            # Fall back to approximate calculation if encoding fails
            logger.warning(f"Failed to get encoding for model {model_name}: {str(e)}")
            # Approximate calculation (English text averages ~0.75 tokens per word)
            return int(len(text.split()) / 0.75)
    except Exception as e:
        logger.warning(f"Error calculating tokens: {str(e)}")
        # Approximate calculation as fallback
        return int(len(text.split()) / 0.75)


class OpenAIClient:
    """
    Client for interacting with OpenAI API services including chat completions,
    embeddings, and audio transcription.
    """
    
    def __init__(self, api_key: Optional[str] = None, 
                 base_url: Optional[str] = None,
                 default_model: Optional[str] = None,
                 embedding_model: Optional[str] = None):
        """
        Initialize the OpenAI client with API key and default settings.
        
        Args:
            api_key (str, optional): OpenAI API key. If None, will be retrieved from settings.
            base_url (str, optional): Base URL for the OpenAI API. If provided, overrides the default.
            default_model (str, optional): Default model to use for chat completions.
            embedding_model (str, optional): Default model to use for embeddings.
            
        Raises:
            ValueError: If no API key can be found
        """
        if api_key is None:
            api_key = get_openai_api_key()
            
        if api_key is None:
            raise ValueError("OpenAI API key is required but not found")
            
        self.api_key = api_key
        self.client = create_openai_client(api_key, base_url)
        self.default_model = default_model or DEFAULT_CHAT_MODEL
        self.embedding_model = embedding_model or DEFAULT_EMBEDDING_MODEL
        
        # Initialize usage statistics
        self.usage_stats = {
            "chat_completion": {"requests": 0, "tokens": {"prompt": 0, "completion": 0, "total": 0}},
            "embeddings": {"requests": 0, "tokens": 0},
            "audio": {"requests": 0, "seconds": 0},
        }
        
        # Default parameters for API calls
        self.default_params = {
            "temperature": 0.7,
            "top_p": 1.0,
            "max_tokens": 1000,
        }
        
        logger.info(f"OpenAI client initialized with default model: {self.default_model}, "
                   f"embedding model: {self.embedding_model}")
        
        event_bus.publish("openai:initialized", {
            "default_model": self.default_model,
            "embedding_model": self.embedding_model
        })
        
    @retry(
        retry=retry_if_exception_type((requests.exceptions.RequestException, OpenAIServerError, OpenAIRateLimitError)),
        stop=stop_after_attempt(DEFAULT_RETRY_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=DEFAULT_MIN_RETRY_WAIT, max=DEFAULT_MAX_RETRY_WAIT)
    )
    def chat_completion(self, messages: List[Dict[str, str]], 
                        options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generates a chat completion using the OpenAI API.
        
        Args:
            messages (List[Dict[str, str]]): List of messages in the conversation
            options (Dict[str, Any], optional): Additional options for the API call
            
        Returns:
            Dict[str, Any]: Response from the OpenAI API
            
        Raises:
            OpenAIAuthError: If authentication fails
            OpenAIRateLimitError: If rate limits are exceeded
            OpenAIServerError: If the OpenAI API returns a server error
            OpenAIError: For any other OpenAI API errors
        """
        # Merge default parameters with provided options
        params = self.default_params.copy()
        if options:
            params.update(options)
            
        # Get model from options or use default
        model = params.pop('model', self.default_model)
        
        # Log the request
        token_estimate = sum(calculate_tokens(msg.get('content', ''), model) for msg in messages)
        logger.info(f"Generating chat completion with model {model}, "
                   f"{len(messages)} messages, ~{token_estimate} tokens")
        
        # Measure start time for performance tracking
        start_time = time.time()
        
        try:
            # Call the OpenAI API
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                **params
            )
            
            # Update usage statistics
            self._update_usage_stats(response, "chat_completion")
            
            # Log completion time
            elapsed = time.time() - start_time
            logger.info(f"Chat completion generated in {elapsed:.2f}s")
            
            # Publish completion event
            event_bus.publish("openai:completion", {
                "model": model,
                "elapsed_time": elapsed,
                "token_count": token_estimate,
                "message_count": len(messages)
            })
            
            # Convert API response to dict for consistent return type
            return response.model_dump()
            
        except openai.AuthenticationError as e:
            raise OpenAIAuthError("Authentication failed with OpenAI API", {"error": str(e)})
        
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded with OpenAI API: {str(e)}")
            raise OpenAIRateLimitError("Rate limit exceeded with OpenAI API", {"error": str(e)})
        
        except openai.APIStatusError as e:
            if e.status_code >= 500:
                logger.warning(f"Server error from OpenAI API: {str(e)}")
                raise OpenAIServerError(f"Server error from OpenAI API: {str(e)}", 
                                     {"status_code": e.status_code, "error": str(e)})
            else:
                self._handle_api_error(e)
        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error when calling OpenAI API: {str(e)}")
            raise
        
        except Exception as e:
            logger.error(f"Unexpected error when calling OpenAI API: {str(e)}")
            raise OpenAIError(f"Unexpected error: {str(e)}", {"error": str(e)})
            
    @retry(
        retry=retry_if_exception_type((requests.exceptions.RequestException, OpenAIServerError, OpenAIRateLimitError)),
        stop=stop_after_attempt(DEFAULT_RETRY_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=DEFAULT_MIN_RETRY_WAIT, max=DEFAULT_MAX_RETRY_WAIT)
    )
    def generate_embeddings(self, text: Union[str, List[str]], 
                           model: Optional[str] = None) -> Union[List[float], List[List[float]]]:
        """
        Generates embeddings for the provided text using the OpenAI API.
        
        Args:
            text (Union[str, List[str]]): Text to generate embeddings for
            model (str, optional): Model to use for embeddings. Defaults to self.embedding_model.
            
        Returns:
            Union[List[float], List[List[float]]]: Embeddings for the provided text
            
        Raises:
            OpenAIAuthError: If authentication fails
            OpenAIRateLimitError: If rate limits are exceeded
            OpenAIServerError: If the OpenAI API returns a server error
            OpenAIError: For any other OpenAI API errors
        """
        # Use provided model or default to embedding_model
        embedding_model = model or self.embedding_model
        
        # Handle both single string and list of strings
        is_single = isinstance(text, str)
        texts = [text] if is_single else text
        
        # Log the request
        text_lens = [len(t) for t in texts]
        avg_len = sum(text_lens) / len(text_lens)
        logger.info(f"Generating embeddings for {len(texts)} text(s) with model {embedding_model}, "
                   f"average length: {avg_len:.1f} chars")
        
        # Measure start time for performance tracking
        start_time = time.time()
        
        try:
            # Call the OpenAI API
            response = self.client.embeddings.create(
                model=embedding_model,
                input=texts
            )
            
            # Update usage statistics
            self._update_usage_stats(response, "embeddings")
            
            # Extract embeddings from the response
            embeddings = [item.embedding for item in response.data]
            
            # Log completion time
            elapsed = time.time() - start_time
            logger.info(f"Embeddings generated in {elapsed:.2f}s")
            
            # Publish embedding event
            event_bus.publish("openai:embedding", {
                "model": embedding_model,
                "elapsed_time": elapsed,
                "text_count": len(texts)
            })
            
            # Return single embedding or list of embeddings
            return embeddings[0] if is_single else embeddings
            
        except openai.AuthenticationError as e:
            raise OpenAIAuthError("Authentication failed with OpenAI API", {"error": str(e)})
        
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded with OpenAI API: {str(e)}")
            raise OpenAIRateLimitError("Rate limit exceeded with OpenAI API", {"error": str(e)})
        
        except openai.APIStatusError as e:
            if e.status_code >= 500:
                logger.warning(f"Server error from OpenAI API: {str(e)}")
                raise OpenAIServerError(f"Server error from OpenAI API: {str(e)}", 
                                     {"status_code": e.status_code, "error": str(e)})
            else:
                self._handle_api_error(e)
        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error when calling OpenAI API: {str(e)}")
            raise
        
        except Exception as e:
            logger.error(f"Unexpected error when calling OpenAI API: {str(e)}")
            raise OpenAIError(f"Unexpected error: {str(e)}", {"error": str(e)})
    
    @retry(
        retry=retry_if_exception_type((requests.exceptions.RequestException, OpenAIServerError, OpenAIRateLimitError)),
        stop=stop_after_attempt(DEFAULT_RETRY_ATTEMPTS),
        wait=wait_exponential(multiplier=1, min=DEFAULT_MIN_RETRY_WAIT, max=DEFAULT_MAX_RETRY_WAIT)
    )
    def transcribe_audio(self, audio_file_path: str, 
                         model: Optional[str] = None,
                         language: Optional[str] = None,
                         options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Transcribes audio to text using OpenAI's Whisper API.
        
        Args:
            audio_file_path (str): Path to the audio file
            model (str, optional): Model to use for transcription. Defaults to DEFAULT_WHISPER_MODEL.
            language (str, optional): Language code (ISO-639-1) of the audio
            options (Dict[str, Any], optional): Additional options for the API call
            
        Returns:
            Dict[str, Any]: Transcription response from the OpenAI API
            
        Raises:
            OpenAIAuthError: If authentication fails
            OpenAIRateLimitError: If rate limits are exceeded
            OpenAIServerError: If the OpenAI API returns a server error
            OpenAIError: For any other OpenAI API errors
            FileNotFoundError: If the audio file cannot be found
        """
        # Use provided model or default
        whisper_model = model or DEFAULT_WHISPER_MODEL
        
        # Prepare options
        transcription_options = options or {}
        if model:
            transcription_options['model'] = model
        else:
            transcription_options['model'] = whisper_model
            
        if language:
            transcription_options['language'] = language
        
        # Log the request
        logger.info(f"Transcribing audio file {audio_file_path} with model {whisper_model}")
        
        # Measure start time for performance tracking
        start_time = time.time()
        
        try:
            # Open the audio file
            with open(audio_file_path, "rb") as audio_file:
                # Call the OpenAI API
                response = self.client.audio.transcriptions.create(
                    file=audio_file,
                    **transcription_options
                )
            
            # Log completion time
            elapsed = time.time() - start_time
            logger.info(f"Audio transcription completed in {elapsed:.2f}s")
            
            # Publish transcription event
            event_bus.publish("openai:transcription", {
                "model": whisper_model,
                "elapsed_time": elapsed,
                "file_path": audio_file_path
            })
            
            # Convert API response to dict for consistent return type
            return response.model_dump()
            
        except FileNotFoundError as e:
            logger.error(f"Audio file not found: {audio_file_path}")
            raise
            
        except openai.AuthenticationError as e:
            raise OpenAIAuthError("Authentication failed with OpenAI API", {"error": str(e)})
        
        except openai.RateLimitError as e:
            logger.warning(f"Rate limit exceeded with OpenAI API: {str(e)}")
            raise OpenAIRateLimitError("Rate limit exceeded with OpenAI API", {"error": str(e)})
        
        except openai.APIStatusError as e:
            if e.status_code >= 500:
                logger.warning(f"Server error from OpenAI API: {str(e)}")
                raise OpenAIServerError(f"Server error from OpenAI API: {str(e)}", 
                                     {"status_code": e.status_code, "error": str(e)})
            else:
                self._handle_api_error(e)
        
        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error when calling OpenAI API: {str(e)}")
            raise
        
        except Exception as e:
            logger.error(f"Unexpected error when calling OpenAI API: {str(e)}")
            raise OpenAIError(f"Unexpected error: {str(e)}", {"error": str(e)})
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """
        Returns the current API usage statistics.
        
        Returns:
            Dict[str, Any]: Usage statistics for the OpenAI API
        """
        return self.usage_stats.copy()
    
    def check_api_key_validity(self) -> bool:
        """
        Checks if the API key is valid by making a minimal API call.
        
        Returns:
            bool: True if API key is valid, False otherwise
        """
        try:
            # Make a minimal embedding request
            self.generate_embeddings("test", self.embedding_model)
            return True
        except OpenAIAuthError:
            return False
        except Exception as e:
            logger.warning(f"Error checking API key validity: {str(e)}")
            return False
    
    def _handle_api_error(self, error: Exception) -> None:
        """
        Maps OpenAI API errors to appropriate exception types.
        
        Args:
            error (Exception): The exception to handle
            
        Raises:
            OpenAIAuthError: If authentication fails
            OpenAIRateLimitError: If rate limits are exceeded
            OpenAIServerError: If the OpenAI API returns a server error
            OpenAIError: For any other OpenAI API errors
        """
        try:
            # Extract details from the error
            details = {"error": str(error)}
            
            if isinstance(error, openai.APIStatusError):
                details["status_code"] = error.status_code
                
                # Map status codes to specific exceptions
                if error.status_code in (401, 403):
                    raise OpenAIAuthError(f"Authentication error: {str(error)}", details)
                elif error.status_code == 429:
                    raise OpenAIRateLimitError(f"Rate limit exceeded: {str(error)}", details)
                elif error.status_code >= 500:
                    raise OpenAIServerError(f"Server error: {str(error)}", details)
            
            # Default to generic OpenAI error
            raise OpenAIError(f"API error: {str(error)}", details)
            
        except (OpenAIAuthError, OpenAIRateLimitError, OpenAIServerError, OpenAIError):
            # Re-raise exceptions we just created
            raise
        except Exception as e:
            # Handle unexpected errors in the error handler
            logger.error(f"Unexpected error in _handle_api_error: {str(e)}")
            raise OpenAIError(f"Unexpected error: {str(error)}", {"error": str(error)})
    
    def _update_usage_stats(self, response: Dict[str, Any], operation_type: str) -> None:
        """
        Updates usage statistics from API response.
        
        Args:
            response (Dict[str, Any]): Response from the OpenAI API
            operation_type (str): Type of operation ("chat_completion", "embeddings", "audio")
        """
        if operation_type not in self.usage_stats:
            self.usage_stats[operation_type] = {}
        
        # Initialize counters if they don't exist
        if "requests" not in self.usage_stats[operation_type]:
            self.usage_stats[operation_type]["requests"] = 0
        
        # Increment request counter
        self.usage_stats[operation_type]["requests"] += 1
        
        # Extract usage information if available
        usage = None
        
        # The structure of the response depends on the operation type and API version
        if hasattr(response, "usage"):
            usage = response.usage
        elif isinstance(response, dict) and "usage" in response:
            usage = response["usage"]
        
        if usage:
            if operation_type == "chat_completion":
                if "tokens" not in self.usage_stats[operation_type]:
                    self.usage_stats[operation_type]["tokens"] = {
                        "prompt": 0, "completion": 0, "total": 0
                    }
                
                # Update token counts
                prompt_tokens = getattr(usage, "prompt_tokens", 0) if hasattr(usage, "prompt_tokens") else usage.get("prompt_tokens", 0)
                completion_tokens = getattr(usage, "completion_tokens", 0) if hasattr(usage, "completion_tokens") else usage.get("completion_tokens", 0)
                total_tokens = getattr(usage, "total_tokens", 0) if hasattr(usage, "total_tokens") else usage.get("total_tokens", 0)
                
                self.usage_stats[operation_type]["tokens"]["prompt"] += prompt_tokens
                self.usage_stats[operation_type]["tokens"]["completion"] += completion_tokens
                self.usage_stats[operation_type]["tokens"]["total"] += total_tokens
                
            elif operation_type == "embeddings":
                if "tokens" not in self.usage_stats[operation_type]:
                    self.usage_stats[operation_type]["tokens"] = 0
                
                # Update token count
                total_tokens = getattr(usage, "total_tokens", 0) if hasattr(usage, "total_tokens") else usage.get("total_tokens", 0)
                self.usage_stats[operation_type]["tokens"] += total_tokens