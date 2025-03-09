from abc import ABC, abstractmethod
import logging
from typing import Dict, List, Optional, Any

from ../../schemas.settings import LLMSettings

# Set up logger
logger = logging.getLogger(__name__)

class BaseLLMModel(ABC):
    """
    Abstract base class that defines the interface for all LLM model implementations.
    This class establishes a common interface for different LLM providers (like OpenAI 
    and local models), ensuring consistent functionality for text generation, embedding 
    creation, token counting, and model information retrieval.
    """
    
    def __init__(self, settings: LLMSettings):
        """
        Initializes the base LLM model with settings.
        
        Args:
            settings: Configuration settings for the LLM
        """
        self.settings = settings
        self.model_name = settings.model
        self.provider = settings.provider
        self.is_local = settings.use_local_llm
        logger.info(f"Initializing base LLM model with provider: {self.provider}, model: {self.model_name}")
    
    @abstractmethod
    def generate_response(self, prompt: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a text response based on the provided prompt.
        
        Args:
            prompt: The input text prompt
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        pass
    
    @abstractmethod
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the provided text.
        
        Args:
            text: The input text to embed
            
        Returns:
            Vector embedding as a list of floats
        """
        pass
    
    @abstractmethod
    def get_token_count(self, text: str) -> int:
        """
        Estimate the number of tokens in the provided text.
        
        Args:
            text: The input text to tokenize
            
        Returns:
            Estimated token count
        """
        pass
    
    @abstractmethod
    def get_max_tokens(self) -> int:
        """
        Get the maximum context window size for the current model.
        
        Returns:
            Maximum token limit
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the model is currently available for use.
        
        Returns:
            True if available, False otherwise
        """
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model details (name, provider, capabilities)
        """
        pass