import pytest #^7.0.0
import json
import uuid
from unittest.mock import MagicMock, patch
from fastapi import status #0.104.0+
from fastapi.testclient import TestClient

from ..conftest import app_client, test_config, mock_llm_service, test_conversation, test_memory_items, test_document # Assuming v1.0
from ...api.server import initialize_app # Assuming v1.0

def test_health_check_endpoint(app_client):
    """Tests the health check endpoint to ensure it returns the correct status"""
    # Send a GET request to the /health endpoint
    response = app_client.get("/api/health")

    # Verify the response status code is 200 OK
    assert response.status_code == 200

    # Verify the response JSON contains status: 'ok'
    assert response.json().get("status") == "ok"

    # Verify the response contains version information
    assert "version" in response.json()

    # Verify the response contains component statuses
    assert "components" in response.json()

def test_conversation_endpoints(app_client, mock_llm_service):
    """Tests the conversation API endpoints for creating, retrieving, and deleting conversations"""
    # Set up mock LLM service to return a test response
    mock_llm_service.generate_response.return_value = "This is a test response from the AI."

    # Create a new conversation via POST /conversation/create
    response = app_client.post("/api/conversation/create", json={"title": "Test Conversation"})
    assert response.status_code == status.HTTP_201_CREATED

    # Extract the conversation_id from the response
    conversation_id = response.json()["id"]

    # Send a message via POST /conversation with the conversation_id
    response = app_client.post("/api/conversation", json={"message": "Hello, AI!", "conversation_id": conversation_id})
    assert response.status_code == status.HTTP_200_OK
    assert "response" in response.json()
    assert response.json()["response"] == "This is a test response from the AI."

    # Retrieve the conversation via GET /conversation/{conversation_id}
    response = app_client.get(f"/api/conversation/{conversation_id}")
    assert response.status_code == status.HTTP_200_OK
    assert "messages" in response.json()

    # Delete the conversation via DELETE /conversation/{conversation_id}
    response = app_client.delete(f"/api/conversation/{conversation_id}")
    assert response.status_code == status.HTTP_200_OK

    # Attempt to retrieve the deleted conversation
    response = app_client.get(f"/api/conversation/{conversation_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_memory_endpoints(app_client, test_memory_items):
    """Tests the memory API endpoints for creating, retrieving, updating, and searching memory items"""
    # Create a new memory item via POST /memory/
    response = app_client.post("/api/memory/", json={"content": "Test memory content", "category": "test"})
    assert response.status_code == status.HTTP_201_CREATED

    # Extract the memory_id from the response
    memory_id = response.json()["id"]

    # Retrieve the memory item via GET /memory/{memory_id}
    response = app_client.get(f"/api/memory/{memory_id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["content"] == "Test memory content"

    # Update the memory item via PATCH /memory/{memory_id}
    response = app_client.patch(f"/api/memory/{memory_id}", json={"content": "Updated memory content"})
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["content"] == "Updated memory content"

    # Search for memory items via POST /memory/search
    response = app_client.post("/api/memory/search", json={"query": "memory"})
    assert response.status_code == status.HTTP_200_OK
    assert "results" in response.json()

    # Delete the memory item via DELETE /memory/{memory_id}
    response = app_client.delete(f"/api/memory/{memory_id}")
    assert response.status_code == status.HTTP_200_OK

    # Attempt to retrieve the deleted memory item
    response = app_client.get(f"/api/memory/{memory_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_document_endpoints(app_client, test_document):
    """Tests the document API endpoints for uploading, processing, and retrieving documents"""
    # Create a test document file
    test_file_path = "test_document.txt"
    with open(test_file_path, "w") as f:
        f.write("This is a test document.")

    # Upload the document via POST /document/upload
    with open(test_file_path, "rb") as f:
        response = app_client.post("/api/document/upload", files={"file": (test_file_path, f, "text/plain")})
    assert response.status_code == status.HTTP_200_OK

    # Extract the document_id from the response
    document_id = response.json()["document_id"]

    # Process the document via POST /document/{document_id}/process
    response = app_client.post(f"/api/document/{document_id}/process")
    assert response.status_code == status.HTTP_200_OK

    # Retrieve the document via GET /document/{document_id}
    response = app_client.get(f"/api/document/{document_id}")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["filename"] == "test_document.txt"

    # Delete the document via DELETE /document/{document_id}
    response = app_client.delete(f"/api/document/{document_id}")
    assert response.status_code == status.HTTP_200_OK

    # Attempt to retrieve the deleted document
    response = app_client.get(f"/api/document/{document_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Clean up the test file
    import os
    os.remove(test_file_path)

@patch('src.backend.services.web_extractor.WebExtractor.extract_from_url')
def test_web_endpoints(mock_extract_from_url, app_client):
    """Tests the web API endpoints for extracting and processing web content"""
    # Mock the web extractor to return test content
    mock_extract_from_url.return_value = {"title": "Test Web Page", "content": "This is test web content."}

    # Extract content from a URL via POST /web/extract
    response = app_client.post("/api/web/extract", json={"url": "http://example.com"})
    assert response.status_code == status.HTTP_200_OK

    # Verify the response contains the extracted content
    assert "content" in response.json()
    assert response.json()["content"] == "This is test web content."

    # Verify the response contains the expected metadata
    assert "title" in response.json()
    assert response.json()["title"] == "Test Web Page"

@patch('src.backend.services.search_service.SearchService.execute_search')
def test_search_endpoints(mock_execute_search, app_client):
    """Tests the search API endpoints for performing web searches"""
    # Mock the search service to return test results
    mock_execute_search.return_value = {"results": [{"title": "Test Result", "url": "http://test.com", "snippet": "Test snippet."}]}

    # Perform a search via POST /search
    response = app_client.post("/api/search", json={"query": "test query"})
    assert response.status_code == status.HTTP_200_OK

    # Verify the response contains the search results
    assert "results" in response.json()
    assert len(response.json()["results"]) == 1

    # Verify the response contains the expected metadata
    assert response.json()["results"][0]["title"] == "Test Result"

@patch('src.backend.services.voice_processor.VoiceProcessor.transcribe_audio')
@patch('src.backend.services.voice_processor.VoiceProcessor.synthesize_speech')
def test_voice_endpoints(mock_synthesize_speech, mock_transcribe_audio, app_client):
    """Tests the voice API endpoints for transcription and synthesis"""
    # Mock the voice processor to return test transcription
    mock_transcribe_audio.return_value = {"text": "Test transcription"}

    # Transcribe audio via POST /voice/transcribe
    response = app_client.post("/api/voice/transcribe", json={"audio_data": "test audio data"})
    assert response.status_code == status.HTTP_200_OK

    # Verify the response contains the transcribed text
    assert "text" in response.json()
    assert response.json()["text"] == "Test transcription"

    # Mock the voice processor to return test audio URL
    mock_synthesize_speech.return_value = {"audio_url": "http://test.com/audio.mp3"}

    # Synthesize speech via POST /voice/synthesize
    response = app_client.post("/api/voice/synthesize", json={"text": "Test text"})
    assert response.status_code == status.HTTP_200_OK

    # Verify the response contains the audio URL
    assert "audio_url" in response.json()
    assert response.json()["audio_url"] == "http://test.com/audio.mp3"

def test_settings_endpoints(app_client):
    """Tests the settings API endpoints for retrieving and updating user settings"""
    # Retrieve settings via GET /settings
    response = app_client.get("/api/settings")
    assert response.status_code == status.HTTP_200_OK

    # Verify the response contains the expected settings structure
    assert "voice_settings" in response.json()
    assert "personality_settings" in response.json()

    # Update settings via PUT /settings
    response = app_client.put("/api/settings", json={"voice_settings": {"enabled": True}})
    assert response.status_code == status.HTTP_200_OK

    # Retrieve settings again to verify the updates were applied
    response = app_client.get("/api/settings")
    assert response.status_code == status.HTTP_200_OK

    # Verify the updated settings match the expected values
    assert response.json()["voice_settings"]["enabled"] == True

def test_error_handling(app_client):
    """Tests the API error handling for various error scenarios"""
    # Test 404 Not Found for non-existent resource
    response = app_client.get("/api/nonexistent")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "detail" in response.json()

    # Test 400 Bad Request for invalid input
    response = app_client.post("/api/conversation", json={"message": ""})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "detail" in response.json()

    # Test 422 Unprocessable Entity for schema validation failures
    response = app_client.post("/api/conversation", json={"invalid": "data"})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
   
    # Test 500 Internal Server Error handling
    with patch("src.backend.api.routes.conversation.ConversationService.process_message") as mock_process_message:
        mock_process_message.side_effect = Exception("Test exception")
        response = app_client.post("/api/conversation", json={"message": "test"})
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "detail" in response.json()

def test_rate_limiting(app_client, test_config):
    """Tests the rate limiting middleware functionality"""
    # Configure rate limiting for testing
    limit = 2
    timeframe = 1
    test_config.get = MagicMock(side_effect=lambda key, default=None: {
        "rate_limiting.enabled": True,
        "rate_limiting.limit": limit,
        "rate_limiting.timeframe": timeframe
    }.get(key, default))

    # Send multiple requests in quick succession
    for _ in range(limit):
        response = app_client.post("/api/conversation", json={"message": "Test message"})
        assert response.status_code == status.HTTP_200_OK

    # This request should be rate limited
    response = app_client.post("/api/conversation", json={"message": "Rate limited?"})

    # Should return 429 Too Many Requests
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Retry-After" in response.headers

def test_authentication_middleware(app_client):
    """Tests the authentication middleware functionality"""
    # Test with missing authentication
    response = app_client.get("/api/memory/123")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

@patch('src.backend.api.middleware.authentication.get_current_user')
def test_authentication_middleware_valid(mock_get_current_user, app_client):
    """Tests the authentication middleware functionality with valid authentication"""
    # Mock the authentication middleware to simulate different authentication scenarios
    mock_get_current_user.return_value = {"id": "test_user", "username": "testuser"}

    # Test with valid authentication
    response = app_client.get("/api/memory/123")
    assert response.status_code == status.HTTP_404_NOT_FOUND

def test_cors_middleware(app_client):
    """Tests the CORS middleware functionality"""
    # Send a request with Origin header
    response = app_client.get("/api/health", headers={"Origin": "http://example.com"})

    # Verify the response contains the appropriate CORS headers
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "*"

def test_compression_middleware(app_client):
    """Tests the compression middleware functionality"""
    # Send a request with Accept-Encoding: gzip header
    response = app_client.get("/api/health", headers={"Accept-Encoding": "gzip"})

    # Verify the response contains Content-Encoding: gzip header
    assert "content-encoding" in response.headers
    assert response.headers["content-encoding"] == "gzip"

from unittest.mock import call
@patch('src.backend.utils.logging_setup.logger.info')
def test_logging_middleware(mock_logger_info, app_client):
    """Tests the logging middleware functionality"""
    # Send a request to an endpoint
    response = app_client.get("/api/health")
    assert response.status_code == status.HTTP_200_OK

    # Verify that request information is logged
    assert any([
        call("Request [ID:"),
        call("Response [ID:")
    ])