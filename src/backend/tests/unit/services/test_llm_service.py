import pytest
from unittest.mock import MagicMock, patch, AsyncMock

from ../../services.llm_service import LLMService
from ../../llm.models.base import BaseLLMModel
from ../../llm.models.openai import OpenAIModel
from ../../llm.models.local_llm import LocalLLMModel
from ../../llm.context_manager import ContextManager
from ../../schemas.settings import LLMSettings, PersonalitySettings
from ../../utils.event_bus import EventBus

def create_test_llm_settings(provider="openai", model="gpt-4o", use_local_llm=False, fallback_to_local=False):
    """Creates LLM settings for testing with configurable provider"""
    settings = LLMSettings(
        provider=provider,
        model=model,
        temperature=0.7,
        max_tokens=1000,
        top_p=1.0,
        frequency_penalty=0.0,
        presence_penalty=0.0,
        use_local_llm=use_local_llm,
        local_model_path="" if not use_local_llm else "/path/to/model",
        fallback_to_local=fallback_to_local,
        openai={
            "api_key": "test-key",
            "organization": "",
            "base_url": "https://api.openai.com/v1",
            "embedding_model": "text-embedding-3-small"
        },
        local={
            "model_type": "llama",
            "context_size": 4096,
            "threads": 4,
            "embedding_model": "BAAI/bge-small-en-v1.5"
        }
    )
    return settings

def create_test_personality_settings():
    """Creates personality settings for testing"""
    settings = PersonalitySettings(
        name="Test Assistant",
        style="helpful",
        formality="neutral",
        verbosity="balanced",
        empathy="medium",
        humor="light",
        creativity="medium"
    )
    return settings

class TestLLMService:
    """Test suite for the LLM Service component"""
    
    @patch('src.backend.llm.models.openai.OpenAIModel')
    def test_initialization_with_openai(self, mock_openai_model):
        """Tests that the LLM service initializes correctly with OpenAI provider"""
        # Setup mocks
        mock_instance = MagicMock()
        mock_instance.is_available.return_value = True
        mock_openai_model.return_value = mock_instance
        
        # Create settings
        llm_settings = create_test_llm_settings(provider="openai", use_local_llm=False)
        personality_settings = create_test_personality_settings()
        
        # Initialize service
        service = LLMService(llm_settings, personality_settings)
        
        # Check initialization
        assert service.initialized
        assert service.primary_model is mock_instance
        assert service.fallback_model is None
        
        # Verify OpenAIModel was initialized with correct settings
        mock_openai_model.assert_called_once_with(llm_settings)
    
    @patch('src.backend.llm.models.local_llm.LocalLLMModel')
    def test_initialization_with_local_llm(self, mock_local_llm_model):
        """Tests that the LLM service initializes correctly with local LLM provider"""
        # Setup mocks
        mock_instance = MagicMock()
        mock_instance.is_available.return_value = True
        mock_local_llm_model.return_value = mock_instance
        
        # Create settings
        llm_settings = create_test_llm_settings(provider="local", use_local_llm=True)
        personality_settings = create_test_personality_settings()
        
        # Initialize service
        service = LLMService(llm_settings, personality_settings)
        
        # Check initialization
        assert service.initialized
        assert service.primary_model is mock_instance
        assert service.fallback_model is None
        
        # Verify LocalLLMModel was initialized with correct settings
        mock_local_llm_model.assert_called_once_with(llm_settings)
    
    @patch('src.backend.llm.models.openai.OpenAIModel')
    @patch('src.backend.llm.models.local_llm.LocalLLMModel')
    def test_initialization_with_fallback(self, mock_local_llm_model, mock_openai_model):
        """Tests that the LLM service initializes with fallback model when configured"""
        # Setup mocks
        mock_openai = MagicMock()
        mock_openai.is_available.return_value = True
        mock_openai.__class__.__name__ = "OpenAIModel"
        
        mock_local = MagicMock()
        mock_local.is_available.return_value = True
        mock_local.__class__.__name__ = "LocalLLMModel"
        
        mock_openai_model.return_value = mock_openai
        mock_local_llm_model.return_value = mock_local
        
        # Create settings with fallback enabled
        llm_settings = create_test_llm_settings(
            provider="openai", 
            use_local_llm=False,
            fallback_to_local=True
        )
        personality_settings = create_test_personality_settings()
        
        # Initialize service
        service = LLMService(llm_settings, personality_settings)
        
        # Check initialization
        assert service.initialized
        assert service.primary_model is mock_openai
        assert service.fallback_model is mock_local
        
        # Verify both models were initialized
        mock_openai_model.assert_called_once_with(llm_settings)
        mock_local_llm_model.assert_called_once_with(llm_settings)
    
    def test_generate_response(self):
        """Tests that the LLM service generates responses correctly"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_prompt_with_context.return_value = {
            "system_prompt": "Test system prompt",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Generate response
        response = service.generate_response("Test prompt")
        
        # Verify response
        assert response == "Test response"
        mock_model.generate_response.assert_called_once_with("Test system prompt", {})
        mock_context_manager.build_prompt_with_context.assert_called_once()
    
    def test_generate_response_with_memory_context(self):
        """Tests response generation with memory context"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response with context"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_prompt_with_context.return_value = {
            "system_prompt": "Test system prompt with memory context",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Create test memory items
        memory_items = [
            {"content": "Test memory 1", "metadata": {}},
            {"content": "Test memory 2", "metadata": {}}
        ]
        
        # Generate response with memory context
        response = service.generate_response("Test prompt", memory_items)
        
        # Verify response
        assert response == "Test response with context"
        mock_context_manager.build_prompt_with_context.assert_called_once_with(
            "Test prompt", memory_items, service.personality_settings, {}
        )
        mock_model.generate_response.assert_called_once_with("Test system prompt with memory context", {})
    
    def test_generate_response_with_document(self):
        """Tests response generation with document context"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response with document"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_document_context_prompt.return_value = {
            "system_prompt": "Test system prompt with document context",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Generate response with document context
        document_content = "This is a test document content"
        response = service.generate_response_with_document("Test prompt", document_content)
        
        # Verify response
        assert response == "Test response with document"
        mock_context_manager.build_document_context_prompt.assert_called_once_with(
            "Test prompt", document_content, service.personality_settings, {}
        )
        mock_model.generate_response.assert_called_once_with("Test system prompt with document context", {})
    
    def test_generate_response_with_web_content(self):
        """Tests response generation with web content"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response with web content"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_web_context_prompt.return_value = {
            "system_prompt": "Test system prompt with web context",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Generate response with web content
        web_content = "This is test web page content"
        response = service.generate_response_with_web_content("Test prompt", web_content)
        
        # Verify response
        assert response == "Test response with web content"
        mock_context_manager.build_web_context_prompt.assert_called_once_with(
            "Test prompt", web_content, service.personality_settings, {}
        )
        mock_model.generate_response.assert_called_once_with("Test system prompt with web context", {})
    
    def test_generate_response_with_history(self):
        """Tests response generation with conversation history"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response with history"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_conversation_history_prompt.return_value = {
            "system_prompt": "Test system prompt with history",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Create test conversation history
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"},
            {"role": "user", "content": "How are you?"}
        ]
        
        # Generate response with history
        response = service.generate_response_with_history("Test prompt", history)
        
        # Verify response
        assert response == "Test response with history"
        mock_context_manager.build_conversation_history_prompt.assert_called_once_with(
            "Test prompt", history, service.personality_settings, {}
        )
        mock_model.generate_response.assert_called_once_with("Test system prompt with history", {})
    
    def test_generate_response_with_combined_context(self):
        """Tests response generation with combined context from multiple sources"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response with combined context"
        mock_model.is_available.return_value = True
        
        # Create mock context manager
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_combined_context_prompt.return_value = {
            "system_prompt": "Test system prompt with combined context",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Test data
        memory_items = [{"content": "Test memory", "metadata": {}}]
        document_content = "Test document content"
        web_content = "Test web content"
        history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"}
        ]
        
        # Generate response with combined context
        response = service.generate_response_with_combined_context(
            "Test prompt", memory_items, document_content, web_content, history
        )
        
        # Verify response
        assert response == "Test response with combined context"
        mock_context_manager.build_combined_context_prompt.assert_called_once_with(
            "Test prompt", memory_items, document_content, web_content, history, 
            service.personality_settings, {}
        )
        mock_model.generate_response.assert_called_once_with("Test system prompt with combined context", {})
    
    def test_generate_embedding(self):
        """Tests that the LLM service generates embeddings correctly"""
        # Create mock LLM model
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_embedding.return_value = [0.1, 0.2, 0.3, 0.4]
        mock_model.is_available.return_value = True
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.initialized = True
        
        # Generate embedding
        embedding = service.generate_embedding("Test text")
        
        # Verify embedding
        assert embedding == [0.1, 0.2, 0.3, 0.4]
        mock_model.generate_embedding.assert_called_once_with("Test text")
    
    def test_fallback_to_local_model(self):
        """Tests that the service falls back to local model when primary fails"""
        # Create mocks for primary model (that fails) and fallback model
        mock_primary = MagicMock(spec=BaseLLMModel)
        mock_primary.generate_response.side_effect = Exception("API Error")
        mock_primary.is_available.return_value = True
        
        mock_fallback = MagicMock(spec=BaseLLMModel)
        mock_fallback.generate_response.return_value = "Fallback response"
        mock_fallback.is_available.return_value = True
        
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_prompt_with_context.return_value = {
            "system_prompt": "Test system prompt",
            "messages": []
        }
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_primary
        service.fallback_model = mock_fallback
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Generate response
        response = service.generate_response("Test prompt")
        
        # Verify fallback was used
        assert response == "Fallback response"
        mock_primary.generate_response.assert_called_once()
        mock_fallback.generate_response.assert_called_once()
    
    def test_fallback_for_embeddings(self):
        """Tests that embedding generation falls back to local model when primary fails"""
        # Create mocks for primary model (that fails) and fallback model
        mock_primary = MagicMock(spec=BaseLLMModel)
        mock_primary.generate_embedding.side_effect = Exception("API Error")
        mock_primary.is_available.return_value = True
        
        mock_fallback = MagicMock(spec=BaseLLMModel)
        mock_fallback.generate_embedding.return_value = [0.5, 0.6, 0.7, 0.8]
        mock_fallback.is_available.return_value = True
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_primary
        service.fallback_model = mock_fallback
        service.initialized = True
        
        # Generate embedding
        embedding = service.generate_embedding("Test text")
        
        # Verify fallback was used
        assert embedding == [0.5, 0.6, 0.7, 0.8]
        mock_primary.generate_embedding.assert_called_once()
        mock_fallback.generate_embedding.assert_called_once()
    
    def test_error_handling_no_fallback(self):
        """Tests error handling when no fallback is available"""
        # Create mock that fails
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.side_effect = Exception("API Error")
        mock_model.is_available.return_value = True
        
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_prompt_with_context.return_value = {
            "system_prompt": "Test system prompt",
            "messages": []
        }
        
        # Create service with mock but no fallback
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.fallback_model = None
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Generate response
        response = service.generate_response("Test prompt")
        
        # Verify error handling
        assert "I'm having trouble generating a response" in response
        mock_model.generate_response.assert_called_once()
    
    def test_get_token_count(self):
        """Tests that token counting works correctly"""
        # Create mock
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.get_token_count.return_value = 10
        mock_model.is_available.return_value = True
        
        # Create service with mock
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.initialized = True
        
        # Get token count
        count = service.get_token_count("Test text")
        
        # Verify count
        assert count == 10
        mock_model.get_token_count.assert_called_once_with("Test text")
    
    def test_get_max_tokens(self):
        """Tests that max token retrieval works correctly"""
        # Create mock
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.get_max_tokens.return_value = 4096
        mock_model.is_available.return_value = True
        
        # Create service with mock
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.initialized = True
        
        # Get max tokens
        max_tokens = service.get_max_tokens()
        
        # Verify max tokens
        assert max_tokens == 4096
        mock_model.get_max_tokens.assert_called_once()
    
    def test_is_available(self):
        """Tests that availability check works correctly"""
        # Create mock
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.is_available.return_value = True
        
        # Create service with mock
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.initialized = True
        
        # Check availability
        available = service.is_available()
        
        # Verify availability
        assert available is True
        mock_model.is_available.assert_called_once()
        
        # Test when not available
        mock_model.is_available.reset_mock()
        mock_model.is_available.return_value = False
        available = service.is_available()
        assert available is False
        mock_model.is_available.assert_called_once()
    
    @patch('src.backend.llm.models.openai.OpenAIModel')
    @patch('src.backend.llm.models.local_llm.LocalLLMModel')
    def test_update_settings(self, mock_local_model, mock_openai_model):
        """Tests that settings can be updated correctly"""
        # Setup mocks
        mock_openai_instance = MagicMock()
        mock_openai_instance.is_available.return_value = True
        mock_local_instance = MagicMock()
        mock_local_instance.is_available.return_value = True
        
        mock_openai_model.return_value = mock_openai_instance
        mock_local_model.return_value = mock_local_instance
        
        # Create initial settings
        initial_settings = create_test_llm_settings(provider="openai")
        personality_settings = create_test_personality_settings()
        
        # Initialize service
        service = LLMService(initial_settings, personality_settings)
        
        # Create new settings
        new_settings = create_test_llm_settings(provider="local", use_local_llm=True)
        
        # Update settings
        result = service.update_settings(new_settings)
        
        # Verify update
        assert result is True
        assert service.llm_settings == new_settings
        mock_local_model.assert_called_once()
    
    def test_get_model_info(self):
        """Tests that model info retrieval works correctly"""
        # Create mock
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.get_model_info.return_value = {
            "model_name": "test-model",
            "provider": "openai",
            "capabilities": ["text", "embeddings"]
        }
        mock_model.is_available.return_value = True
        
        # Create service with mock
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.initialized = True
        
        # Get model info
        info = service.get_model_info()
        
        # Verify info
        assert info["initialized"] is True
        assert "primary_model" in info
        assert info["primary_model"]["model_name"] == "test-model"
        mock_model.get_model_info.assert_called_once()
    
    def test_event_publishing(self):
        """Tests that events are published correctly during operations"""
        # Create mocks
        mock_model = MagicMock(spec=BaseLLMModel)
        mock_model.generate_response.return_value = "Test response"
        mock_model.generate_embedding.return_value = [0.1, 0.2, 0.3]
        mock_model.is_available.return_value = True
        
        mock_context_manager = MagicMock(spec=ContextManager)
        mock_context_manager.build_prompt_with_context.return_value = {
            "system_prompt": "Test system prompt",
            "messages": []
        }
        
        mock_event_bus = MagicMock(spec=EventBus)
        
        # Create service with mocks
        service = LLMService(create_test_llm_settings(), create_test_personality_settings())
        service.primary_model = mock_model
        service.context_manager = mock_context_manager
        service.initialized = True
        
        # Replace event_bus with our mock
        service.event_bus = mock_event_bus
        
        # Call methods that should publish events
        service.generate_response("Test prompt")
        service.generate_embedding("Test text")
        
        # Verify event publishing
        assert mock_event_bus.publish.call_count >= 2
        
        # Check event types (extract first argument of each call)
        event_types = [args[0] for args, _ in mock_event_bus.publish.call_args_list]
        assert "llm:response_generated" in event_types
        assert "llm:embedding_generated" in event_types