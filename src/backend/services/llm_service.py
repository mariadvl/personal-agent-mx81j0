import logging
import time
from typing import Dict, List, Optional, Any, Union

from ..llm.models.base import BaseLLMModel
from ..llm.models.openai import OpenAIModel
from ..llm.models.local_llm import LocalLLMModel
from ..llm.context_manager import ContextManager
from ..schemas.settings import LLMSettings, PersonalitySettings
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Set up logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

class LLMService:
    """
    Service that provides a unified interface for language model operations,
    managing model selection and fallback mechanisms between cloud-based and local LLMs,
    ensuring reliable text generation and embedding creation while respecting user
    privacy preferences.
    """
    
    def __init__(self, llm_settings: LLMSettings, personality_settings: PersonalitySettings, config: Optional[Dict[str, Any]] = None):
        """
        Initializes the LLM service with settings and configuration.
        
        Args:
            llm_settings: Configuration settings for the LLM
            personality_settings: Personality settings for response styling
            config: Optional additional configuration
        """
        self.llm_settings = llm_settings
        self.personality_settings = personality_settings
        self.config = config or {}
        self.primary_model = None
        self.fallback_model = None
        self.context_manager = None
        self.initialized = False
        
        logger.info("Initializing LLMService")
        self.initialize()
    
    def initialize(self) -> bool:
        """
        Initializes the LLM models based on settings.
        
        Returns:
            True if initialization successful, False otherwise
        """
        if self.initialized:
            return True
            
        try:
            # Initialize primary model based on provider setting
            if self.llm_settings.provider == "openai":
                self.primary_model = OpenAIModel(self.llm_settings)
            elif self.llm_settings.provider == "local":
                self.primary_model = LocalLLMModel(self.llm_settings)
            else:
                logger.error(f"Unsupported LLM provider: {self.llm_settings.provider}")
                return False
                
            # Initialize fallback model if enabled
            if self.llm_settings.fallback_to_local:
                if self.primary_model.__class__.__name__ != "LocalLLMModel":
                    self.fallback_model = LocalLLMModel(self.llm_settings)
                    logger.info("Initialized local LLM as fallback model")
            
            # Initialize context manager
            if self.primary_model:
                self.context_manager = ContextManager(self.primary_model)
                
            # Set initialized flag if primary model is available
            self.initialized = self.primary_model is not None and self.primary_model.is_available()
            
            logger.info(f"LLM service initialization {'successful' if self.initialized else 'failed'}")
            event_bus.publish("llm:service_initialized", {
                "initialized": self.initialized,
                "provider": self.llm_settings.provider,
                "model": self.llm_settings.model,
                "has_fallback": self.fallback_model is not None
            })
            
            return self.initialized
            
        except Exception as e:
            logger.error(f"Error initializing LLM service: {str(e)}")
            return False
    
    def generate_response(self, prompt: str, memory_items: Optional[List[Dict[str, Any]]] = None, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a text response based on the provided prompt and context.
        
        Args:
            prompt: The input text prompt
            memory_items: Optional relevant memory items for context
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return "I'm sorry, but I'm not fully initialized yet. Please try again in a moment."
            
        options = options or {}
        start_time = time.time()
        
        try:
            # Build prompt with context using context manager
            prompt_data = self.context_manager.build_prompt_with_context(
                prompt, memory_items or [], self.personality_settings, options
            )
            
            # Try primary model first
            response = self._try_generate_response(self.primary_model, prompt_data["system_prompt"], options)
            
            # Fall back to secondary model if available and primary fails
            if response is None and self.fallback_model:
                logger.warning("Primary model failed, trying fallback model")
                response = self._try_generate_response(self.fallback_model, prompt_data["system_prompt"], options)
                
            # If both models fail, return a generic error message
            if response is None:
                response = "I'm sorry, but I'm having trouble generating a response right now. Please try again later."
                
            # Log response time
            elapsed = time.time() - start_time
            logger.info(f"Generated response in {elapsed:.2f}s")
            
            # Publish response generation event
            event_bus.publish("llm:response_generated", {
                "elapsed_time": elapsed,
                "prompt_length": len(prompt),
                "response_length": len(response),
                "with_memory": memory_items is not None and len(memory_items) > 0
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return f"I'm sorry, but an error occurred: {str(e)}"
    
    def generate_response_with_document(self, prompt: str, document_content: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a response based on document content.
        
        Args:
            prompt: The input text prompt
            document_content: Document content to use as context
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return "I'm sorry, but I'm not fully initialized yet. Please try again in a moment."
            
        options = options or {}
        start_time = time.time()
        
        try:
            # Build prompt with document context
            prompt_data = self.context_manager.build_document_context_prompt(
                prompt, document_content, self.personality_settings, options
            )
            
            # Try primary model first
            response = self._try_generate_response(self.primary_model, prompt_data["system_prompt"], options)
            
            # Fall back to secondary model if available and primary fails
            if response is None and self.fallback_model:
                logger.warning("Primary model failed, trying fallback model")
                response = self._try_generate_response(self.fallback_model, prompt_data["system_prompt"], options)
                
            # If both models fail, return a generic error message
            if response is None:
                response = "I'm sorry, but I'm having trouble generating a response about this document right now. Please try again later."
                
            # Log response time
            elapsed = time.time() - start_time
            logger.info(f"Generated document response in {elapsed:.2f}s")
            
            # Publish document response event
            event_bus.publish("llm:document_response_generated", {
                "elapsed_time": elapsed,
                "prompt_length": len(prompt),
                "document_length": len(document_content),
                "response_length": len(response)
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating document response: {str(e)}")
            return f"I'm sorry, but an error occurred while processing the document: {str(e)}"
    
    def generate_response_with_web_content(self, prompt: str, web_content: str, options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a response based on web content.
        
        Args:
            prompt: The input text prompt
            web_content: Web content to use as context
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return "I'm sorry, but I'm not fully initialized yet. Please try again in a moment."
            
        options = options or {}
        start_time = time.time()
        
        try:
            # Build prompt with web context
            prompt_data = self.context_manager.build_web_context_prompt(
                prompt, web_content, self.personality_settings, options
            )
            
            # Try primary model first
            response = self._try_generate_response(self.primary_model, prompt_data["system_prompt"], options)
            
            # Fall back to secondary model if available and primary fails
            if response is None and self.fallback_model:
                logger.warning("Primary model failed, trying fallback model")
                response = self._try_generate_response(self.fallback_model, prompt_data["system_prompt"], options)
                
            # If both models fail, return a generic error message
            if response is None:
                response = "I'm sorry, but I'm having trouble generating a response based on this web content right now. Please try again later."
                
            # Log response time
            elapsed = time.time() - start_time
            logger.info(f"Generated web content response in {elapsed:.2f}s")
            
            # Publish web response event
            event_bus.publish("llm:web_response_generated", {
                "elapsed_time": elapsed,
                "prompt_length": len(prompt),
                "web_content_length": len(web_content),
                "response_length": len(response)
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating web content response: {str(e)}")
            return f"I'm sorry, but an error occurred while processing the web content: {str(e)}"
    
    def generate_response_with_history(self, prompt: str, conversation_history: List[Dict[str, str]], options: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a response based on conversation history.
        
        Args:
            prompt: The input text prompt
            conversation_history: Previous messages in the conversation
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return "I'm sorry, but I'm not fully initialized yet. Please try again in a moment."
            
        options = options or {}
        start_time = time.time()
        
        try:
            # Build prompt with conversation history
            prompt_data = self.context_manager.build_conversation_history_prompt(
                prompt, conversation_history, self.personality_settings, options
            )
            
            # Try primary model first
            response = self._try_generate_response(self.primary_model, prompt_data["system_prompt"], options)
            
            # Fall back to secondary model if available and primary fails
            if response is None and self.fallback_model:
                logger.warning("Primary model failed, trying fallback model")
                response = self._try_generate_response(self.fallback_model, prompt_data["system_prompt"], options)
                
            # If both models fail, return a generic error message
            if response is None:
                response = "I'm sorry, but I'm having trouble generating a response based on our conversation history right now. Please try again later."
                
            # Log response time
            elapsed = time.time() - start_time
            logger.info(f"Generated conversation history response in {elapsed:.2f}s")
            
            # Publish history response event
            event_bus.publish("llm:history_response_generated", {
                "elapsed_time": elapsed,
                "prompt_length": len(prompt),
                "history_messages": len(conversation_history),
                "response_length": len(response)
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating conversation history response: {str(e)}")
            return f"I'm sorry, but an error occurred while processing our conversation history: {str(e)}"
    
    def generate_response_with_combined_context(
        self, 
        prompt: str,
        memory_items: Optional[List[Dict[str, Any]]] = None,
        document_content: Optional[str] = None,
        web_content: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a response with combined context from multiple sources.
        
        Args:
            prompt: The input text prompt
            memory_items: Optional relevant memory items
            document_content: Optional document content
            web_content: Optional web content
            conversation_history: Optional conversation history
            options: Optional parameters to control generation behavior
            
        Returns:
            Generated text response
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return "I'm sorry, but I'm not fully initialized yet. Please try again in a moment."
            
        options = options or {}
        start_time = time.time()
        
        try:
            # Build prompt with combined context
            prompt_data = self.context_manager.build_combined_context_prompt(
                prompt,
                memory_items,
                document_content,
                web_content,
                conversation_history,
                self.personality_settings,
                options
            )
            
            # Try primary model first
            response = self._try_generate_response(self.primary_model, prompt_data["system_prompt"], options)
            
            # Fall back to secondary model if available and primary fails
            if response is None and self.fallback_model:
                logger.warning("Primary model failed, trying fallback model")
                response = self._try_generate_response(self.fallback_model, prompt_data["system_prompt"], options)
                
            # If both models fail, return a generic error message
            if response is None:
                response = "I'm sorry, but I'm having trouble generating a response with the combined context right now. Please try again later."
                
            # Log response time
            elapsed = time.time() - start_time
            logger.info(f"Generated combined context response in {elapsed:.2f}s")
            
            # Publish combined response event
            event_bus.publish("llm:combined_response_generated", {
                "elapsed_time": elapsed,
                "prompt_length": len(prompt),
                "memory_items": len(memory_items) if memory_items else 0,
                "has_document": document_content is not None,
                "has_web_content": web_content is not None,
                "history_messages": len(conversation_history) if conversation_history else 0,
                "response_length": len(response)
            })
            
            return response
            
        except Exception as e:
            logger.error(f"Error generating combined context response: {str(e)}")
            return f"I'm sorry, but an error occurred while processing the combined context: {str(e)}"
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a vector embedding for the provided text.
        
        Args:
            text: The input text to embed
            
        Returns:
            Vector embedding
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return []
        
        start_time = time.time()
        
        try:
            # Try primary model first
            embedding = self._try_generate_embedding(self.primary_model, text)
            
            # Fall back to secondary model if available and primary fails
            if embedding is None and self.fallback_model:
                logger.warning("Primary model failed to generate embedding, trying fallback model")
                embedding = self._try_generate_embedding(self.fallback_model, text)
                
            # If both models fail, return an empty list
            if embedding is None:
                logger.error("Failed to generate embedding with all available models")
                return []
                
            # Log embedding time
            elapsed = time.time() - start_time
            logger.info(f"Generated embedding in {elapsed:.2f}s")
            
            # Publish embedding generation event
            event_bus.publish("llm:embedding_generated", {
                "elapsed_time": elapsed,
                "text_length": len(text),
                "embedding_dimensions": len(embedding)
            })
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return []
    
    def get_token_count(self, text: str) -> int:
        """
        Estimate the number of tokens in the provided text.
        
        Args:
            text: The input text to tokenize
            
        Returns:
            Estimated token count
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return 0
            
        try:
            return self.primary_model.get_token_count(text)
        except Exception as e:
            logger.error(f"Error counting tokens: {str(e)}")
            # Fall back to approximate count based on text length
            return len(text) // 4  # Very rough approximation
    
    def get_max_tokens(self) -> int:
        """
        Get the maximum context window size for the current model.
        
        Returns:
            Maximum token limit
        """
        if not self.initialized:
            logger.error("LLM service not initialized")
            return 4096  # Default fallback value
            
        try:
            return self.primary_model.get_max_tokens()
        except Exception as e:
            logger.error(f"Error getting max tokens: {str(e)}")
            return 4096  # Default fallback value
    
    def is_available(self) -> bool:
        """
        Check if the LLM service is available for use.
        
        Returns:
            True if available, False otherwise
        """
        if not self.initialized:
            return False
            
        return self.primary_model.is_available()
    
    def update_settings(self, new_llm_settings: LLMSettings, new_personality_settings: Optional[PersonalitySettings] = None) -> bool:
        """
        Update the service settings and reinitialize if needed.
        
        Args:
            new_llm_settings: New LLM settings
            new_personality_settings: Optional new personality settings
            
        Returns:
            True if update successful, False otherwise
        """
        self.llm_settings = new_llm_settings
        
        if new_personality_settings:
            self.personality_settings = new_personality_settings
            
        # Re-initialize with new settings
        self.initialized = False
        success = self.initialize()
        
        logger.info(f"Updated LLM service settings, re-initialization {'successful' if success else 'failed'}")
        event_bus.publish("llm:settings_updated", {
            "success": success,
            "provider": self.llm_settings.provider,
            "model": self.llm_settings.model
        })
        
        return success
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get information about the current models.
        
        Returns:
            Dictionary with model information
        """
        result = {
            "initialized": self.initialized,
            "has_fallback": self.fallback_model is not None
        }
        
        if not self.initialized:
            return result
            
        result["primary_model"] = self.primary_model.get_model_info()
        
        if self.fallback_model:
            result["fallback_model"] = self.fallback_model.get_model_info()
            
        return result
    
    def _try_generate_response(self, model: BaseLLMModel, prompt: str, options: Dict[str, Any]) -> Union[str, None]:
        """
        Internal method to attempt response generation with error handling.
        
        Args:
            model: The model to use for generation
            prompt: The input text prompt
            options: Parameters to control generation behavior
            
        Returns:
            Generated response or None if failed
        """
        try:
            return model.generate_response(prompt, options)
        except Exception as e:
            logger.error(f"Error generating response with {model.__class__.__name__}: {str(e)}")
            return None
    
    def _try_generate_embedding(self, model: BaseLLMModel, text: str) -> Union[List[float], None]:
        """
        Internal method to attempt embedding generation with error handling.
        
        Args:
            model: The model to use for embedding generation
            text: The input text to embed
            
        Returns:
            Generated embedding or None if failed
        """
        try:
            return model.generate_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding with {model.__class__.__name__}: {str(e)}")
            return None