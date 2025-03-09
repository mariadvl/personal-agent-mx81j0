import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import status

from src.backend.api.routes.conversation import router
from src.backend.schemas.conversation import ConversationMessageRequest, ConversationMessageResponse, ConversationCreate, ConversationResponse
from src.backend.api.middleware.error_handler import ResourceNotFoundError

import uuid
from datetime import datetime

# Define a fixture to override the app_client with the test router
@pytest.fixture
def app_client():
    from fastapi import FastAPI
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)

@pytest.mark.asyncio
async def test_send_message_success(app_client: TestClient, mock_conversation_service: MagicMock, mock_voice_processor: MagicMock):
    """Test successful message sending and response generation"""
    # Set up mock conversation service to return a successful response
    mock_conversation_service.process_message.return_value = {"response": "This is a test response.", "conversation_id": str(uuid.uuid4())}

    # Create a test message request with text content
    message_request = ConversationMessageRequest(message="Hello, AI!", conversation_id=None, voice=False)

    # Send POST request to /conversation/ endpoint
    response = app_client.post("/conversation/", json=message_request.model_dump())

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected fields (response text, conversation_id)
    data = response.json()
    assert "response" in data
    assert "conversation_id" in data
    assert data["response"] == "This is a test response."

    # Verify conversation_service.process_message was called with correct parameters
    mock_conversation_service.process_message.assert_called_once()
    
    # Verify voice_processor.synthesize_speech was not called (no voice requested)
    mock_voice_processor.synthesize_speech.assert_not_called()

@pytest.mark.asyncio
async def test_send_message_with_voice(app_client: TestClient, mock_conversation_service: MagicMock, mock_voice_processor: MagicMock):
    """Test message sending with voice response generation"""
    # Set up mock conversation service to return a successful response
    mock_conversation_service.process_message.return_value = {"response": "This is a test response.", "conversation_id": str(uuid.uuid4())}

    # Set up mock voice processor to return audio data and URL
    mock_voice_processor.synthesize_speech.return_value.audio_url = "http://example.com/audio.mp3"

    # Create a test message request with voice=True
    message_request = ConversationMessageRequest(message="Hello, AI!", conversation_id=None, voice=True)

    # Send POST request to /conversation/ endpoint
    response = app_client.post("/conversation/", json=message_request.model_dump())

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected fields (response text, conversation_id, audio_url)
    data = response.json()
    assert "response" in data
    assert "conversation_id" in data
    assert "audio_url" in data
    assert data["response"] == "This is a test response."
    assert data["audio_url"] == "http://example.com/audio.mp3"

    # Verify conversation_service.process_message was called with correct parameters
    mock_conversation_service.process_message.assert_called_once()

    # Verify voice_processor.synthesize_speech was called with the AI response
    mock_voice_processor.synthesize_speech.assert_called_once()

@pytest.mark.asyncio
async def test_send_message_error_handling(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test error handling during message processing"""
    # Set up mock conversation service to raise an exception
    mock_conversation_service.process_message.side_effect = Exception("Test error")

    # Create a test message request
    message_request = ConversationMessageRequest(message="Hello, AI!", conversation_id=None, voice=False)

    # Send POST request to /conversation/ endpoint
    response = app_client.post("/conversation/", json=message_request.model_dump())

    # Verify response status code is 500 (or appropriate error code)
    assert response.status_code == 500

    # Verify response contains error details
    data = response.json()
    assert "detail" in data
    assert "Test error" in data["detail"]

    # Verify conversation_service.process_message was called
    mock_conversation_service.process_message.assert_called_once()

@pytest.mark.asyncio
async def test_create_conversation_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful conversation creation"""
    # Set up mock conversation service to return a new conversation
    mock_conversation_service.create_conversation.return_value = {"id": str(uuid.uuid4()), "title": "Test Conversation", "created_at": datetime.now().isoformat(), "updated_at": datetime.now().isoformat(), "summary": None, "metadata": {}}

    # Create a test conversation request with title and metadata
    conversation_data = ConversationCreate(title="Test Conversation", metadata={"key": "value"})

    # Send POST request to /conversation/create endpoint
    response = app_client.post("/conversation/create", json=conversation_data.model_dump())

    # Verify response status code is 201
    assert response.status_code == 201

    # Verify response contains expected conversation details
    data = response.json()
    assert "id" in data
    assert "title" in data
    assert data["title"] == "Test Conversation"

    # Verify conversation_service.create_conversation was called with correct parameters
    mock_conversation_service.create_conversation.assert_called_once_with(title="Test Conversation", metadata={"key": "value"})

@pytest.mark.asyncio
async def test_get_conversation_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful retrieval of a conversation"""
    # Set up mock conversation service to return a conversation with messages
    conversation_id = uuid.uuid4()
    mock_conversation_service.get_conversation.return_value = {"id": str(conversation_id), "title": "Test Conversation", "messages": []}

    # Create a test conversation ID
    conversation_id_str = str(conversation_id)

    # Send GET request to /conversation/{conversation_id} endpoint
    response = app_client.get(f"/conversation/{conversation_id_str}")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected conversation details and messages
    data = response.json()
    assert "id" in data
    assert "title" in data
    assert data["id"] == conversation_id_str
    assert data["messages"] == []

    # Verify conversation_service.get_conversation was called with correct parameters
    mock_conversation_service.get_conversation.assert_called_once_with(conversation_id=conversation_id_str, message_limit=50)

@pytest.mark.asyncio
async def test_get_conversation_not_found(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test retrieval of a non-existent conversation"""
    # Set up mock conversation service to return None (conversation not found)
    mock_conversation_service.get_conversation.return_value = None

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send GET request to /conversation/{conversation_id} endpoint
    response = app_client.get(f"/conversation/{conversation_id_str}")

    # Verify response status code is 404
    assert response.status_code == 404

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data
    assert f"Conversation with id {conversation_id_str} not found" in data["detail"]

    # Verify conversation_service.get_conversation was called with correct parameters
    mock_conversation_service.get_conversation.assert_called_once_with(conversation_id=conversation_id_str, message_limit=50)

@pytest.mark.asyncio
async def test_list_conversations_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful listing of conversations"""
    # Set up mock conversation service to return a list of conversations
    mock_conversation_service.list_conversations.return_value = [{"id": "1", "title": "Conversation 1"}, {"id": "2", "title": "Conversation 2"}]

    # Send GET request to /conversation/ endpoint
    response = app_client.get("/conversation/")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected list of conversations
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["title"] == "Conversation 1"
    assert data[1]["title"] == "Conversation 2"

    # Verify conversation_service.list_conversations was called with correct parameters
    mock_conversation_service.list_conversations.assert_called_once_with(limit=50, offset=0)

@pytest.mark.asyncio
async def test_list_conversations_with_pagination(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test listing conversations with pagination parameters"""
    # Set up mock conversation service to return a paginated list of conversations
    mock_conversation_service.list_conversations.return_value = [{"id": "3", "title": "Conversation 3"}, {"id": "4", "title": "Conversation 4"}]

    # Send GET request to /conversation/?limit=10&offset=20 endpoint
    response = app_client.get("/conversation/?limit=10&offset=20")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected list of conversations
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["title"] == "Conversation 3"
    assert data[1]["title"] == "Conversation 4"

    # Verify conversation_service.list_conversations was called with limit=10 and offset=20
    mock_conversation_service.list_conversations.assert_called_once_with(limit=10, offset=20)

@pytest.mark.asyncio
async def test_update_conversation_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful conversation update"""
    # Set up mock conversation service to return an updated conversation
    conversation_id = uuid.uuid4()
    mock_conversation_service.update_conversation.return_value = {"id": str(conversation_id), "title": "Updated Conversation", "created_at": datetime.now().isoformat(), "updated_at": datetime.now().isoformat(), "summary": None, "metadata": {}}

    # Create a test conversation ID and update data
    conversation_id_str = str(conversation_id)
    update_data = {"title": "Updated Conversation"}

    # Send PATCH request to /conversation/{conversation_id} endpoint
    response = app_client.patch(f"/conversation/{conversation_id_str}", json=update_data)

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains updated conversation details
    data = response.json()
    assert "id" in data
    assert "title" in data
    assert data["title"] == "Updated Conversation"

    # Verify conversation_service.update_conversation was called with correct parameters
    mock_conversation_service.update_conversation.assert_called_once_with(conversation_id=conversation_id_str, updates=update_data)

@pytest.mark.asyncio
async def test_update_conversation_not_found(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test update of a non-existent conversation"""
    # Set up mock conversation service to return None (conversation not found)
    mock_conversation_service.update_conversation.return_value = None

    # Create a test conversation ID and update data
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)
    update_data = {"title": "Updated Conversation"}

    # Send PATCH request to /conversation/{conversation_id} endpoint
    response = app_client.patch(f"/conversation/{conversation_id_str}", json=update_data)

    # Verify response status code is 404
    assert response.status_code == 404

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data
    assert f"Conversation with id {conversation_id_str} not found" in data["detail"]

    # Verify conversation_service.update_conversation was called with correct parameters
    mock_conversation_service.update_conversation.assert_called_once_with(conversation_id=conversation_id_str, updates=update_data)

@pytest.mark.asyncio
async def test_delete_conversation_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful conversation deletion"""
    # Set up mock conversation service to return True (successful deletion)
    mock_conversation_service.delete_conversation.return_value = True

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send DELETE request to /conversation/{conversation_id} endpoint
    response = app_client.delete(f"/conversation/{conversation_id_str}")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains success message
    data = response.json()
    assert "success" in data
    assert data["success"] is True

    # Verify conversation_service.delete_conversation was called with correct parameters
    mock_conversation_service.delete_conversation.assert_called_once_with(conversation_id=conversation_id_str)

@pytest.mark.asyncio
async def test_delete_conversation_not_found(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test deletion of a non-existent conversation"""
    # Set up mock conversation service to return False (conversation not found)
    mock_conversation_service.delete_conversation.return_value = False

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send DELETE request to /conversation/{conversation_id} endpoint
    response = app_client.delete(f"/conversation/{conversation_id_str}")

    # Verify response status code is 404
    assert response.status_code == 404

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data
    assert f"Conversation with id {conversation_id_str} not found" in data["detail"]

    # Verify conversation_service.delete_conversation was called with correct parameters
    mock_conversation_service.delete_conversation.assert_called_once_with(conversation_id=conversation_id_str)

@pytest.mark.asyncio
async def test_get_conversation_history_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful retrieval of conversation history"""
    # Set up mock conversation service to return a list of messages
    mock_conversation_service.get_conversation_history.return_value = [{"id": "1", "role": "user", "content": "Hello"}, {"id": "2", "role": "assistant", "content": "Hi"}]

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send GET request to /conversation/{conversation_id}/history endpoint
    response = app_client.get(f"/conversation/{conversation_id_str}/history")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected message history
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["content"] == "Hello"
    assert data[1]["content"] == "Hi"

    # Verify conversation_service.get_conversation_history was called with correct parameters
    mock_conversation_service.get_conversation_history.assert_called_once_with(conversation_id=conversation_id_str, limit=50, offset=0)

@pytest.mark.asyncio
async def test_get_conversation_history_with_pagination(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test retrieval of conversation history with pagination"""
    # Set up mock conversation service to return a paginated list of messages
    mock_conversation_service.get_conversation_history.return_value = [{"id": "3", "role": "user", "content": "How are you?"}, {"id": "4", "role": "assistant", "content": "I'm fine, thanks."}]

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send GET request to /conversation/{conversation_id}/history?limit=10&offset=5 endpoint
    response = app_client.get(f"/conversation/{conversation_id_str}/history?limit=10&offset=5")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected message history
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["content"] == "How are you?"
    assert data[1]["content"] == "I'm fine, thanks."

    # Verify conversation_service.get_conversation_history was called with limit=10 and offset=5
    mock_conversation_service.get_conversation_history.assert_called_once_with(conversation_id=conversation_id_str, limit=10, offset=5)

@pytest.mark.asyncio
async def test_get_conversation_history_not_found(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test retrieval of history for a non-existent conversation"""
    # Set up mock conversation service to raise ResourceNotFoundError
    mock_conversation_service.get_conversation_history.side_effect = ResourceNotFoundError("Conversation not found")

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send GET request to /conversation/{conversation_id}/history endpoint
    response = app_client.get(f"/conversation/{conversation_id_str}/history")

    # Verify response status code is 404
    assert response.status_code == 404

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data
    assert "Conversation not found" in data["detail"]

    # Verify conversation_service.get_conversation_history was called with correct parameters
    mock_conversation_service.get_conversation_history.assert_called_once_with(conversation_id=conversation_id_str, limit=50, offset=0)

@pytest.mark.asyncio
async def test_summarize_conversation_success(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test successful conversation summarization"""
    # Set up mock conversation service to return a summary
    mock_conversation_service.summarize_conversation.return_value = "Test conversation summary"

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send POST request to /conversation/{conversation_id}/summarize endpoint
    response = app_client.post(f"/conversation/{conversation_id_str}/summarize")

    # Verify response status code is 200
    assert response.status_code == 200

    # Verify response contains expected summary
    data = response.json()
    assert "summary" in data
    assert data["summary"] == "Test conversation summary"

    # Verify conversation_service.summarize_conversation was called with correct parameters
    mock_conversation_service.summarize_conversation.assert_called_once_with(conversation_id=conversation_id_str)

@pytest.mark.asyncio
async def test_summarize_conversation_not_found(app_client: TestClient, mock_conversation_service: MagicMock):
    """Test summarization of a non-existent conversation"""
    # Set up mock conversation service to return None (conversation not found)
    mock_conversation_service.summarize_conversation.return_value = None

    # Create a test conversation ID
    conversation_id = uuid.uuid4()
    conversation_id_str = str(conversation_id)

    # Send POST request to /conversation/{conversation_id}/summarize endpoint
    response = app_client.post(f"/conversation/{conversation_id_str}/summarize")

    # Verify response status code is 404
    assert response.status_code == 404

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data
    assert f"Conversation with id {conversation_id_str} not found" in data["detail"]

    # Verify conversation_service.summarize_conversation was called with correct parameters
    mock_conversation_service.summarize_conversation.assert_called_once_with(conversation_id=conversation_id_str)