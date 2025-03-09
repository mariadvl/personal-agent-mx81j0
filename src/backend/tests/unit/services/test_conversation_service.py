import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.backend.services.conversation_service import ConversationService
from src.backend.schemas.settings import PersonalitySettings
import uuid
from datetime import datetime


@pytest.mark.asyncio
async def test_conversation_service_initialization():
    """Test that ConversationService initializes correctly with required dependencies"""
    # Arrange
    memory_service = AsyncMock()
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    # Act
    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Assert
    assert conversation_service.memory_service == memory_service
    assert conversation_service.llm_service == llm_service
    assert conversation_service.personality_settings == personality_settings
    assert conversation_service.web_search_enabled is True


@pytest.mark.asyncio
async def test_process_message_new_conversation():
    """Test processing a message in a new conversation"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.retrieve_context.return_value = ""
    llm_service = AsyncMock()
    llm_service.generate_response.return_value = "This is a test response from the AI."
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    response = await conversation_service.process_message("Hello, AI!")

    # Assert
    memory_service.retrieve_context.assert_called_once_with(query="Hello, AI!", filters={"conversation_id": response["conversation_id"]})
    llm_service.generate_response.assert_called_once()
    assert memory_service.store_memory.call_count == 2  # User message and AI response
    assert "response" in response
    assert response["response"] == "This is a test response from the AI."
    assert "conversation_id" in response
    assert isinstance(uuid.UUID(response["conversation_id"]), uuid.UUID)


@pytest.mark.asyncio
async def test_process_message_existing_conversation():
    """Test processing a message in an existing conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.retrieve_context.return_value = ""
    llm_service = AsyncMock()
    llm_service.generate_response.return_value = "This is a test response from the AI."
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    response = await conversation_service.process_message("Tell me more.", conversation_id=conversation_id)

    # Assert
    memory_service.retrieve_context.assert_called_once_with(query="Tell me more.", filters={"conversation_id": conversation_id})
    llm_service.generate_response.assert_called_once()
    assert memory_service.store_memory.call_count == 2  # User message and AI response
    assert "response" in response
    assert response["response"] == "This is a test response from the AI."
    assert "conversation_id" in response
    assert response["conversation_id"] == conversation_id


@pytest.mark.asyncio
async def test_process_message_with_context():
    """Test that context from memory is included in the prompt"""
    # Arrange
    test_context = "This is some test context."
    memory_service = AsyncMock()
    memory_service.retrieve_context.return_value = test_context
    llm_service = AsyncMock()
    llm_service.generate_response.return_value = "This is a test response from the AI."
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    await conversation_service.process_message("Hello, AI!")

    # Assert
    llm_service.generate_response.assert_called_once()
    args, _ = llm_service.generate_response.call_args_list[0]
    prompt = args[0]
    assert test_context in prompt
    assert "This is a test response from the AI." in llm_service.generate_response.return_value


@pytest.mark.asyncio
async def test_process_message_with_options():
    """Test processing a message with custom options"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.retrieve_context.return_value = ""
    llm_service = AsyncMock()
    llm_service.generate_response.return_value = "This is a test response from the AI."
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    options = {"temperature": 0.9, "max_tokens": 500}
    await conversation_service.process_message("Hello, AI!", options=options)

    # Assert
    llm_service.generate_response.assert_called_once()
    args, _ = llm_service.generate_response.call_args_list[0]
    prompt = args[0]
    assert "This is a test response from the AI." in llm_service.generate_response.return_value


@pytest.mark.asyncio
async def test_process_message_error_handling():
    """Test error handling during message processing"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.retrieve_context.side_effect = Exception("Test exception")
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    response = await conversation_service.process_message("Hello, AI!")

    # Assert
    assert "response" in response
    assert "I'm sorry, but an error occurred" in response["response"]

    # Reset memory_service mock
    memory_service.reset_mock()
    memory_service.retrieve_context.return_value = ""
    llm_service.generate_response.side_effect = Exception("Test exception")

    # Act
    response = await conversation_service.process_message("Hello, AI!")

    # Assert
    assert "response" in response
    assert "I'm sorry, but an error occurred" in response["response"]


@pytest.mark.asyncio
async def test_create_conversation():
    """Test creating a new conversation"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.store_memory.return_value = None
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    conversation = await conversation_service.create_conversation(title="Test Conversation")

    # Assert
    assert "id" in conversation
    assert conversation["title"] == "Test Conversation"
    assert isinstance(uuid.UUID(conversation["id"]), uuid.UUID)
    assert "created_at" in conversation
    assert "updated_at" in conversation


@pytest.mark.asyncio
async def test_create_conversation_with_metadata():
    """Test creating a new conversation with custom metadata"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.store_memory.return_value = None
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    metadata = {"key1": "value1", "key2": 123}
    conversation = await conversation_service.create_conversation(title="Test Conversation", metadata=metadata)

    # Assert
    assert "id" in conversation
    assert conversation["title"] == "Test Conversation"
    assert conversation["metadata"] == metadata


@pytest.mark.asyncio
async def test_get_conversation():
    """Test retrieving a conversation by ID"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = [{"id": conversation_id, "title": "Test Conversation"}]
    memory_service.get_conversation_history.return_value = [{"id": "1", "role": "user", "content": "Hello"}]
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    conversation = await conversation_service.get_conversation(conversation_id=conversation_id)

    # Assert
    memory_service.search_by_metadata.assert_called_once()
    memory_service.get_conversation_history.assert_called_once()
    assert conversation["id"] == conversation_id
    assert conversation["title"] == "Conversation Title"
    assert conversation["messages"] == []


@pytest.mark.asyncio
async def test_get_conversation_not_found():
    """Test retrieving a non-existent conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = []
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    conversation = await conversation_service.get_conversation(conversation_id=conversation_id)

    # Assert
    assert conversation is None


@pytest.mark.asyncio
async def test_list_conversations():
    """Test listing all conversations with pagination"""
    # Arrange
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = [
        {"id": "1", "title": "Conversation 1"},
        {"id": "2", "title": "Conversation 2"}
    ]
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    conversations = await conversation_service.list_conversations(limit=10, offset=0)

    # Assert
    memory_service.search_by_metadata.assert_called_once()
    assert len(conversations) == 2
    assert conversations[0]["title"] == "Conversation 1"


@pytest.mark.asyncio
async def test_update_conversation():
    """Test updating conversation metadata"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = [{"id": conversation_id, "title": "Old Title"}]
    memory_service.update_memory.return_value = {"id": conversation_id, "title": "New Title"}
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    updates = {"title": "New Title"}
    conversation = await conversation_service.update_conversation(conversation_id=conversation_id, updates=updates)

    # Assert
    memory_service.search_by_metadata.assert_called_once()
    memory_service.update_memory.assert_called_once()
    assert conversation["id"] == conversation_id
    assert conversation["title"] == "Updated Conversation Title"


@pytest.mark.asyncio
async def test_update_conversation_not_found():
    """Test updating a non-existent conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = []
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    updates = {"title": "New Title"}
    conversation = await conversation_service.update_conversation(conversation_id=conversation_id, updates=updates)

    # Assert
    assert conversation is None


@pytest.mark.asyncio
async def test_delete_conversation():
    """Test deleting a conversation and its messages"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = [{"id": conversation_id, "title": "Test Conversation"}]
    memory_service.delete_memory.return_value = True
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    result = await conversation_service.delete_conversation(conversation_id=conversation_id)

    # Assert
    memory_service.search_by_metadata.assert_called_once()
    memory_service.delete_memory.assert_called_once()
    assert result is True


@pytest.mark.asyncio
async def test_delete_conversation_not_found():
    """Test deleting a non-existent conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = []
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    result = await conversation_service.delete_conversation(conversation_id=conversation_id)

    # Assert
    assert result is False


@pytest.mark.asyncio
async def test_get_conversation_history():
    """Test retrieving message history for a conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.get_conversation_history.return_value = [
        {"id": "1", "role": "user", "content": "Hello"},
        {"id": "2", "role": "assistant", "content": "Hi"}
    ]
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    messages = await conversation_service.get_conversation_history(conversation_id=conversation_id, limit=10, offset=0)

    # Assert
    memory_service.get_conversation_history.assert_called_once()
    assert len(messages) == 2
    assert messages[0]["content"] == "Hello"


@pytest.mark.asyncio
async def test_summarize_conversation():
    """Test generating a summary for a conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = [{"id": conversation_id, "title": "Test Conversation"}]
    memory_service.get_conversation_history.return_value = [
        {"id": "1", "role": "user", "content": "Hello"},
        {"id": "2", "role": "assistant", "content": "Hi"}
    ]
    memory_service.update_memory.return_value = {"id": conversation_id, "title": "Test Conversation", "summary": "Conversation Summary"}
    llm_service = AsyncMock()
    llm_service.generate_response.return_value = "Conversation Summary"
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    summary = await conversation_service.summarize_conversation(conversation_id=conversation_id)

    # Assert
    llm_service.generate_response.assert_called_once()
    memory_service.update_memory.assert_called_once()
    assert summary == "Conversation Summary"


@pytest.mark.asyncio
async def test_summarize_conversation_not_found():
    """Test summarizing a non-existent conversation"""
    # Arrange
    conversation_id = str(uuid.uuid4())
    memory_service = AsyncMock()
    memory_service.search_by_metadata.return_value = []
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()

    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    summary = await conversation_service.summarize_conversation(conversation_id=conversation_id)

    # Assert
    assert summary is None


@pytest.mark.asyncio
@patch('src.backend.services.conversation_service.event_bus')
async def test_set_personality(mock_event_bus):
    """Test updating the personality settings"""
    # Arrange
    memory_service = AsyncMock()
    llm_service = AsyncMock()
    initial_settings = PersonalitySettings(style="helpful", formality="neutral")
    conversation_service = ConversationService(memory_service, llm_service, initial_settings)

    # Act
    new_settings = PersonalitySettings(style="friendly", formality="casual")
    await conversation_service.set_personality(new_settings)

    # Assert
    assert conversation_service.personality_settings == new_settings
    mock_event_bus.publish.assert_called_with("personality:updated", new_settings)


@pytest.mark.asyncio
@patch('src.backend.services.conversation_service.event_bus')
async def test_toggle_web_search(mock_event_bus):
    """Test enabling and disabling web search capability"""
    # Arrange
    memory_service = AsyncMock()
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()
    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act & Assert - Enable web search
    enabled = await conversation_service.toggle_web_search(True)
    assert conversation_service.web_search_enabled is True
    mock_event_bus.publish.assert_called_with("web_search:toggled", True)

    # Act & Assert - Disable web search
    enabled = await conversation_service.toggle_web_search(False)
    assert conversation_service.web_search_enabled is False
    mock_event_bus.publish.assert_called_with("web_search:toggled", False)


@pytest.mark.asyncio
async def test_construct_prompt():
    """Test the internal _construct_prompt method"""
    # Arrange
    memory_service = AsyncMock()
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()
    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    message = "Test message"
    context = "Test context"
    options = {"option1": "value1"}
    prompt = await conversation_service._construct_prompt(message, context, options)

    # Assert
    assert "Prompt: Test message" in prompt
    assert "Context: Test context" in prompt


@pytest.mark.asyncio
async def test_store_interaction():
    """Test the internal _store_interaction method"""
    # Arrange
    memory_service = AsyncMock()
    llm_service = AsyncMock()
    personality_settings = PersonalitySettings()
    conversation_service = ConversationService(memory_service, llm_service, personality_settings)

    # Act
    conversation_id = str(uuid.uuid4())
    content = "Test content"
    role = "user"
    message = await conversation_service._store_interaction(conversation_id, content, role)

    # Assert
    memory_service.store_memory.assert_called_once()
    assert message["content"] == content
    assert message["role"] == role
    assert message["conversation_id"] == conversation_id