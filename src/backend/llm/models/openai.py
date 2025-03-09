import logging
import time
from typing import Dict, List, Optional, Any

from .base import BaseLLMModel
from ...integrations.openai_client import (
    OpenAIClient, OpenAIError, OpenAIAuthError, OpenAIRateLimitError,
    calculate_tokens
)
from ..prompt_templates import format_chat_messages, build_system_prompt
from ...utils.event_bus import EventBus

# Set up logger
logger = logging.getLogger(__name__)

# Initialize event bus
event_bus = EventBus()

# Default model settings
DEFAULT_MODEL = "gpt-4o"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"

# Token limits for different models
MODEL_TOKEN_LIMITS = {
    "gpt-4o": 128000, 
    "gpt-4-turbo": 128000,
    "gpt-4": 8192, 
    "gpt-3.5-turbo": 16385,
    "gpt-3.5-turbo-16k": 16385
}

class OpenAIModel(BaseLLMModel):
    """
    Implementation of BaseLLMModel using OpenAI's API for text generation and embeddings.
    
    This class handles communication with OpenAI's API, including authentication,
    response generation, embedding creation, error handling, and fallback mechanisms.
    """
    
    def __init__(self, settings):
        """
        Initialize the OpenAI model with settings and establish the API client.
        
        Args:
            settings: Configuration settings for the LLM
        """
        super().__init__(settings)
        
        # Set model name from settings or use default
        self.model_name = settings.model or DEFAULT_MODEL
        
        # Set embedding model from settings or use default
        self.embedding_model = settings.openai.get("embedding_model", DEFAULT_EMBEDDING_MODEL)
        
        # Set default parameters for API calls
        self.default_params = {
            "temperature": settings.temperature,
            "max_tokens": settings.max_tokens,
            "top_p": settings.top_p,
            "frequency_penalty": settings.frequency_penalty,
            "presence_penalty": settings.presence_penalty
        }
        
        # Initialize OpenAI client
        api_key = settings.openai.get("api_key", "")
        base_url = settings.openai.get("base_url", None)
        self.client = OpenAIClient(
            api_key=api_key,
            base_url=base_url,
            default_model=self.model_name,
            embedding_model=self.embedding_model
        )
        
        logger.info(f"Initialized OpenAI model: {self.model_name}, embedding model: {self.embedding_model}")
        event_bus.publish("llm:initialized", {
            "provider": "openai",
            "model": self.model_name,
            "embedding_model": self.embedding_model
        })
    
    def generate_response(self, prompt: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a text response using OpenAI's API.
        
        Args:
            prompt: The input text prompt
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        # Merge default parameters with provided options
        params = self.default_params.copy()
        if options:
            params.update(options)
        
        # Format the prompt into chat messages
        messages = format_chat_messages(build_system_prompt(self.settings.personality_settings), prompt)
        
        # Log the request
        token_estimate = sum(calculate_tokens(msg.get('content', ''), self.model_name) 
                          for msg in messages)
        logger.info(f"Generating response with model {self.model_name}, "
                   f"{len(messages)} messages, ~{token_estimate} tokens")
        
        # Measure start time for performance tracking
        start_time = time.time()
        
        try:
            # Call the OpenAI API
            response = self.client.chat_completion(messages, params)
            
            # Extract the response text
            if isinstance(response, dict) and "choices" in response:
                text = response["choices"][0]["message"]["content"]
            else:
                text = response.choices[0].message.content
            
            # Log successful completion with timing information
            elapsed = time.time() - start_time
            logger.info(f"Response generated in {elapsed:.2f}s")
            
            # Publish response generation event
            event_bus.publish("llm:response_generated", {
                "model": self.model_name,
                "elapsed_time": elapsed,
                "token_count": token_estimate
            })
            
            return text
        
        except OpenAIAuthError as e:
            logger.error(f"Authentication error with OpenAI API: {str(e)}")
            return "I'm having trouble authenticating with my language service. Please check your API settings."
        
        except OpenAIRateLimitError as e:
            logger.warning(f"Rate limit exceeded with OpenAI API: {str(e)}")
            return "I've reached my limit with the language service. Please try again in a moment."
        
        except OpenAIError as e:
            logger.error(f"Error generating response with OpenAI API: {str(e)}")
            return "I'm having trouble generating a response right now. Please try again later."
        
        except Exception as e:
            logger.error(f"Unexpected error during response generation: {str(e)}")
            return "An unexpected error occurred. Please try again or check the application logs."
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the provided text.
        
        Args:
            text: The input text to embed
            
        Returns:
            Vector embedding as a list of floats
        """
        # Validate that text is not empty
        if not text or not text.strip():
            logger.warning("Attempted to generate embedding for empty text")
            return []
        
        # Log the request
        logger.info(f"Generating embedding with model {self.embedding_model}, "
                   f"text length: {len(text)} chars")
        
        # Measure start time for performance tracking
        start_time = time.time()
        
        try:
            # Call the OpenAI API
            embedding = self.client.generate_embeddings(text, self.embedding_model)
            
            # Log successful embedding generation with timing information
            elapsed = time.time() - start_time
            logger.info(f"Embedding generated in {elapsed:.2f}s")
            
            # Publish embedding generation event
            event_bus.publish("llm:embedding_generated", {
                "model": self.embedding_model,
                "elapsed_time": elapsed,
                "text_length": len(text)
            })
            
            return embedding
        
        except OpenAIAuthError as e:
            logger.error(f"Authentication error with OpenAI API: {str(e)}")
            return []
        
        except OpenAIRateLimitError as e:
            logger.warning(f"Rate limit exceeded with OpenAI API: {str(e)}")
            return []
        
        except OpenAIError as e:
            logger.error(f"Error generating embedding with OpenAI API: {str(e)}")
            return []
        
        except Exception as e:
            logger.error(f"Unexpected error during embedding generation: {str(e)}")
            return []
    
    def get_token_count(self, text: str) -> int:
        """
        Estimate the number of tokens in the provided text.
        
        Args:
            text: The input text to tokenize
            
        Returns:
            Estimated token count
        """
        try:
            return calculate_tokens(text, self.model_name)
        except Exception as e:
            logger.warning(f"Error calculating token count: {str(e)}")
            # Fall back to approximate calculation
            return int(len(text.split()) / 0.75)
    
    def get_max_tokens(self) -> int:
        """
        Get the maximum context window size for the current model.
        
        Returns:
            Maximum token limit
        """
        max_tokens = MODEL_TOKEN_LIMITS.get(self.model_name, 4096)
        logger.debug(f"Max tokens for model {self.model_name}: {max_tokens}")
        return max_tokens
    
    def is_available(self) -> bool:
        """
        Check if the OpenAI API is available and the API key is valid.
        
        Returns:
            True if available, False otherwise
        """
        try:
            return self.client.check_api_key_validity()
        except Exception as e:
            logger.warning(f"Error checking OpenAI API availability: {str(e)}")
            return False
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model details
        """
        info = {
            "model_name": self.model_name,
            "provider": self.provider,
            "embedding_model": self.embedding_model,
            "max_tokens": self.get_max_tokens(),
            "is_available": self.is_available(),
        }
        
        # Add usage statistics if available
        try:
            usage_stats = self.client.get_usage_statistics()
            info["usage"] = usage_stats
        except Exception as e:
            logger.warning(f"Error getting usage statistics: {str(e)}")
        
        return info