import logging
from typing import Dict, List, Optional, Any, Union
import time
import os

from llama_cpp import Llama  # v0.2.11
from sentence_transformers import SentenceTransformer  # v2.2.2

from .base import BaseLLMModel
from ...utils.text_processing import count_tokens, clean_text
from ...utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize event bus
event_bus = EventBus()

# Model context sizes
MODEL_CONTEXT_SIZES = {
    "llama": 4096,
    "llama2": 4096,
    "llama3": 8192,
    "mistral": 8192,
    "phi": 2048
}

# Default embedding model
DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"


def format_prompt(prompt: str, model_type: str, options: Optional[Dict[str, Any]] = None) -> str:
    """
    Formats a prompt for the local LLM based on the model type.
    
    Args:
        prompt: The user input prompt
        model_type: Type of model (llama, llama2, llama3, mistral, phi, etc.)
        options: Additional options including system prompts
    
    Returns:
        Formatted prompt string
    """
    if options is None:
        options = {}
    
    # Clean the input prompt
    prompt = clean_text(prompt)
    
    system_prompt = options.get("system_prompt", "")
    
    # Format based on model type
    if model_type.lower() in ["llama", "llama2"]:
        if system_prompt:
            return f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]"
        return f"<s>[INST] {prompt} [/INST]"
    
    elif model_type.lower() == "llama3":
        if system_prompt:
            return f"<|begin_of_text|><|system|>\n{system_prompt}<|end_of_turn|>\n<|user|>\n{prompt}<|end_of_turn|>\n<|assistant|>\n"
        return f"<|begin_of_text|><|user|>\n{prompt}<|end_of_turn|>\n<|assistant|>\n"
    
    elif model_type.lower() == "mistral":
        if system_prompt:
            return f"<s>[INST] <<SYS>>\n{system_prompt}\n<</SYS>>\n\n{prompt} [/INST]"
        return f"<s>[INST] {prompt} [/INST]"
    
    elif model_type.lower() == "phi":
        if system_prompt:
            return f"<|system|>{system_prompt}<|user|>{prompt}<|assistant|>"
        return f"<|user|>{prompt}<|assistant|>"
    
    # Default: return the prompt as is
    return prompt


class LocalLLMModel(BaseLLMModel):
    """
    Implementation of BaseLLMModel using locally-hosted language models.
    This class provides integration with Llama, Mistral, Phi and other local LLMs
    for privacy-focused operation.
    """
    
    def __init__(self, settings):
        """
        Initializes the local LLM model with settings.
        
        Args:
            settings: Configuration settings for the LLM
        """
        super().__init__(settings)
        
        # Local model settings
        self.model_path = settings.local_model_path
        self.model_type = settings.local.get("model_type", "llama")
        self.context_size = settings.local.get("context_size", MODEL_CONTEXT_SIZES.get(self.model_type, 4096))
        self.threads = settings.local.get("threads", 4)
        
        # Default generation parameters
        self.default_params = {
            "temperature": settings.temperature,
            "top_p": settings.top_p,
            "frequency_penalty": settings.frequency_penalty,
            "presence_penalty": settings.presence_penalty,
            "max_tokens": settings.max_tokens
        }
        
        # Embedding model
        self.embedding_model_name = settings.local.get("embedding_model", DEFAULT_EMBEDDING_MODEL)
        
        # Initialize models to None (lazy loading)
        self.llm = None
        self.embedding_model = None
        
        logger.info(f"Initialized LocalLLMModel with model_type={self.model_type}, "
                   f"model_path={self.model_path}")
        
        # Publish initialization event
        event_bus.publish("llm:initialized", {
            "provider": "local",
            "model_type": self.model_type,
            "model_path": self.model_path
        })
    
    def load_model(self) -> bool:
        """
        Loads the local LLM model into memory.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        # Check if model is already loaded
        if self.llm is not None:
            return True
        
        # Check if model path exists
        if not os.path.exists(self.model_path):
            logger.error(f"Model path not found: {self.model_path}")
            event_bus.publish("llm:error", {
                "error": "Model path not found",
                "model_path": self.model_path
            })
            return False
        
        try:
            logger.info(f"Loading model from {self.model_path}...")
            start_time = time.time()
            
            # Initialize Llama model
            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=self.context_size,
                n_threads=self.threads
            )
            
            load_time = time.time() - start_time
            logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
            
            # Publish model loaded event
            event_bus.publish("llm:loaded", {
                "model_type": self.model_type,
                "model_path": self.model_path,
                "load_time": load_time
            })
            
            return True
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            event_bus.publish("llm:error", {
                "error": f"Failed to load model: {str(e)}",
                "model_path": self.model_path
            })
            return False
    
    def load_embedding_model(self) -> bool:
        """
        Loads the embedding model for generating vector representations.
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        # Check if model is already loaded
        if self.embedding_model is not None:
            return True
        
        try:
            logger.info(f"Loading embedding model {self.embedding_model_name}...")
            start_time = time.time()
            
            # Initialize SentenceTransformer model
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            
            load_time = time.time() - start_time
            logger.info(f"Embedding model loaded successfully in {load_time:.2f} seconds")
            
            # Publish embedding model loaded event
            event_bus.publish("embedding:loaded", {
                "model": self.embedding_model_name,
                "load_time": load_time
            })
            
            return True
        except Exception as e:
            logger.error(f"Error loading embedding model: {str(e)}")
            event_bus.publish("embedding:error", {
                "error": f"Failed to load embedding model: {str(e)}",
                "model": self.embedding_model_name
            })
            return False
    
    def generate_response(self, prompt: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a text response using the local LLM.
        
        Args:
            prompt: The input text prompt
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        # Merge default parameters with provided options
        if options is None:
            options = {}
        params = {**self.default_params, **options}
        
        # Format the prompt based on model type
        formatted_prompt = format_prompt(prompt, self.model_type, options)
        
        # Log the request
        token_estimate = self.get_token_count(formatted_prompt)
        logger.info(f"Generating response for prompt with ~{token_estimate} tokens")
        
        # Ensure model is loaded
        if not self.load_model():
            error_msg = "Failed to load local LLM model"
            logger.error(error_msg)
            return f"Error: {error_msg}"
        
        try:
            start_time = time.time()
            
            # Generate text using the local LLM
            result = self.llm(
                formatted_prompt,
                max_tokens=params.get("max_tokens", 1000),
                temperature=params.get("temperature", 0.7),
                top_p=params.get("top_p", 1.0),
                frequency_penalty=params.get("frequency_penalty", 0.0),
                presence_penalty=params.get("presence_penalty", 0.0),
                stop=params.get("stop", None),
                echo=False
            )
            
            # Extract the generated text from the result
            if isinstance(result, dict) and "choices" in result and len(result["choices"]) > 0:
                response = result["choices"][0]["text"]
            else:
                response = str(result)
            
            # Clean the response
            response = clean_text(response)
            
            generation_time = time.time() - start_time
            logger.info(f"Response generated in {generation_time:.2f} seconds")
            
            # Publish response generated event
            event_bus.publish("llm:response_generated", {
                "model_type": self.model_type,
                "generation_time": generation_time,
                "prompt_tokens": token_estimate,
                "completion_tokens": self.get_token_count(response),
                "total_tokens": token_estimate + self.get_token_count(response)
            })
            
            return response
        except Exception as e:
            error_msg = f"Error generating response: {str(e)}"
            logger.error(error_msg)
            event_bus.publish("llm:error", {
                "error": error_msg
            })
            return f"Error: {error_msg}"
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the provided text.
        
        Args:
            text: The input text to embed
            
        Returns:
            Vector embedding as a list of floats
        """
        # Validate input
        if not text or text.strip() == "":
            logger.warning("Empty text provided for embedding")
            return []
        
        logger.info(f"Generating embedding for text ({len(text)} chars)")
        
        # Ensure embedding model is loaded
        if not self.load_embedding_model():
            logger.error("Failed to load embedding model")
            return []
        
        try:
            start_time = time.time()
            
            # Generate embedding using SentenceTransformer
            embedding = self.embedding_model.encode(text)
            
            # Convert to list of floats
            embedding_list = embedding.tolist()
            
            generation_time = time.time() - start_time
            logger.info(f"Embedding generated in {generation_time:.2f} seconds")
            
            # Publish embedding generated event
            event_bus.publish("embedding:generated", {
                "model": self.embedding_model_name,
                "generation_time": generation_time,
                "vector_dimensions": len(embedding_list)
            })
            
            return embedding_list
        except Exception as e:
            error_msg = f"Error generating embedding: {str(e)}"
            logger.error(error_msg)
            event_bus.publish("embedding:error", {
                "error": error_msg
            })
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
            return count_tokens(text)
        except Exception as e:
            logger.error(f"Error counting tokens: {str(e)}")
            # Approximate token count based on characters
            return len(text) // 4  # Very rough approximation
    
    def get_max_tokens(self) -> int:
        """
        Get the maximum context window size for the current model.
        
        Returns:
            Maximum token limit
        """
        # Return the context size from model type or default
        context_size = MODEL_CONTEXT_SIZES.get(self.model_type.lower(), 4096)
        logger.debug(f"Max tokens for model type {self.model_type}: {context_size}")
        return context_size
    
    def is_available(self) -> bool:
        """
        Check if the local LLM is available for use.
        
        Returns:
            True if available, False otherwise
        """
        # Check if model path exists
        if not os.path.isfile(self.model_path):
            logger.warning(f"Model file not found: {self.model_path}")
            return False
        
        # Try to load the model if not already loaded
        if self.llm is None:
            if not self.load_model():
                return False
        
        return True
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current model.
        
        Returns:
            Dictionary with model details
        """
        return {
            "model_name": self.model_name,
            "provider": self.provider,
            "model_type": self.model_type,
            "model_path": self.model_path,
            "context_size": self.context_size,
            "threads": self.threads,
            "is_loaded": self.llm is not None,
            "embedding_model": self.embedding_model_name,
            "embedding_model_loaded": self.embedding_model is not None
        }
    
    def unload_model(self) -> bool:
        """
        Unload the model from memory to free resources.
        
        Returns:
            True if unloaded successfully, False otherwise
        """
        if self.llm is not None:
            self.llm = None
            
        if self.embedding_model is not None:
            self.embedding_model = None
            
        logger.info(f"Unloaded local model {self.model_type}")
        
        # Publish model unloaded event
        event_bus.publish("llm:unloaded", {
            "model_type": self.model_type,
            "model_path": self.model_path
        })
        
        return True