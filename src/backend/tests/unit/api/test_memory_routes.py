import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import status

from src.backend.api.routes import memory as memory_routes
from src.backend.schemas.memory import (
    MemoryCreate,
    MemoryResponse,
    MemoryUpdateRequest,
    MemoryDeleteResponse,
    MemorySearchRequest,
    MemorySearchResponse,
    ContextRetrievalRequest,
    ContextRetrievalResponse,
    MEMORY_CATEGORIES
)
from src.backend.api.middleware.error_handler import ResourceNotFoundError, ValidationError


@pytest.fixture
def app_client():
    """
    Fixture to create a test client for the FastAPI application.
    """
    from src.backend.api.server import app
    return TestClient(app)


@pytest.fixture
def mock_memory_service():
    """
    Fixture to create a mock MemoryService object.
    """
    return MagicMock()


@pytest.mark.asyncio
async def test_create_memory_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful memory creation"""
    # Set up mock memory service to return a successful memory creation response
    mock_memory_service.store_memory.return_value = {
        "id": "test_id",
        "content": "Test memory content",
        "category": "conversation",
        "source_type": "test",
        "source_id": "test_source_id",
        "importance": 3,
        "metadata": {}
    }

    # Create a test memory item with content, category, and metadata
    memory_data = {
        "content": "Test memory content",
        "category": "conversation",
        "source_type": "test",
        "source_id": "test_source_id",
        "importance": 3,
        "metadata": {}
    }

    # Send POST request to /memory/ endpoint
    response = app_client.post("/api/memory/", json=memory_data)

    # Verify response status code is 201 (Created)
    assert response.status_code == status.HTTP_201_CREATED

    # Verify response contains expected memory item details
    data = response.json()
    assert data["id"] == "test_id"
    assert data["content"] == "Test memory content"
    assert data["category"] == "conversation"

    # Verify memory_service.store_memory was called with correct parameters
    mock_memory_service.store_memory.assert_called_once()


@pytest.mark.asyncio
async def test_create_memory_invalid_category(app_client: TestClient, mock_memory_service: MagicMock):
    """Test memory creation with invalid category"""
    # Set up mock memory service
    mock_memory_service.store_memory.return_value = {}

    # Create a test memory item with an invalid category
    memory_data = {
        "content": "Test memory content",
        "category": "invalid_category"
    }

    # Send POST request to /memory/ endpoint
    response = app_client.post("/api/memory/", json=memory_data)

    # Verify response status code is 422 (Unprocessable Entity)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Verify response contains validation error details
    data = response.json()
    assert "detail" in data

    # Verify memory_service.store_memory was not called
    mock_memory_service.store_memory.assert_not_called()


@pytest.mark.asyncio
async def test_create_memory_service_error(app_client: TestClient, mock_memory_service: MagicMock):
    """Test error handling during memory creation"""
    # Set up mock memory service to raise an exception
    mock_memory_service.store_memory.side_effect = Exception("Test error")

    # Create a test memory item
    memory_data = {
        "content": "Test memory content",
        "category": "conversation"
    }

    # Send POST request to /memory/ endpoint
    response = app_client.post("/api/memory/", json=memory_data)

    # Verify response status code is 500 (Internal Server Error)
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    # Verify response contains error details
    data = response.json()
    assert "detail" in data

    # Verify memory_service.store_memory was called
    mock_memory_service.store_memory.assert_called_once()


@pytest.mark.asyncio
async def test_get_memory_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful memory retrieval"""
    # Set up mock memory service to return a memory item
    mock_memory_service.get_memory.return_value = {
        "id": "test_id",
        "content": "Test memory content",
        "category": "conversation"
    }

    # Create a test memory ID
    memory_id = "test_id"

    # Send GET request to /memory/{memory_id} endpoint
    response = app_client.get(f"/api/memory/{memory_id}")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected memory item details
    data = response.json()
    assert data["id"] == "test_id"
    assert data["content"] == "Test memory content"
    assert data["category"] == "conversation"

    # Verify memory_service.get_memory was called with correct memory_id
    mock_memory_service.get_memory.assert_called_once_with("test_id")


@pytest.mark.asyncio
async def test_get_memory_not_found(app_client: TestClient, mock_memory_service: MagicMock):
    """Test retrieval of non-existent memory"""
    # Set up mock memory service to return None (memory not found)
    mock_memory_service.get_memory.return_value = None

    # Create a test memory ID
    memory_id = "test_id"

    # Send GET request to /memory/{memory_id} endpoint
    response = app_client.get(f"/api/memory/{memory_id}")

    # Verify response status code is 404 (Not Found)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data

    # Verify memory_service.get_memory was called with correct memory_id
    mock_memory_service.get_memory.assert_called_once_with("test_id")


@pytest.mark.asyncio
async def test_update_memory_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful memory update"""
    # Set up mock memory service to return an updated memory item
    mock_memory_service.update_memory.return_value = {
        "id": "test_id",
        "content": "Updated memory content",
        "category": "document"
    }

    # Create a test memory ID and update data
    memory_id = "test_id"
    update_data = {
        "content": "Updated memory content",
        "category": "document"
    }

    # Send PATCH request to /memory/{memory_id} endpoint
    response = app_client.patch(f"/api/memory/{memory_id}", json=update_data)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains updated memory item details
    data = response.json()
    assert data["id"] == "test_id"
    assert data["content"] == "Updated memory content"
    assert data["category"] == "document"

    # Verify memory_service.update_memory was called with correct parameters
    mock_memory_service.update_memory.assert_called_once_with("test_id", update_data)


@pytest.mark.asyncio
async def test_update_memory_not_found(app_client: TestClient, mock_memory_service: MagicMock):
    """Test update of non-existent memory"""
    # Set up mock memory service to return None (memory not found)
    mock_memory_service.update_memory.return_value = None

    # Create a test memory ID and update data
    memory_id = "test_id"
    update_data = {
        "content": "Updated memory content",
        "category": "document"
    }

    # Send PATCH request to /memory/{memory_id} endpoint
    response = app_client.patch(f"/api/memory/{memory_id}", json=update_data)

    # Verify response status code is 404 (Not Found)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data

    # Verify memory_service.update_memory was called with correct parameters
    mock_memory_service.update_memory.assert_called_once_with("test_id", update_data)


@pytest.mark.asyncio
async def test_update_memory_invalid_category(app_client: TestClient, mock_memory_service: MagicMock):
    """Test memory update with invalid category"""
    # Set up mock memory service
    mock_memory_service.update_memory.return_value = {}

    # Create a test memory ID and update data with invalid category
    memory_id = "test_id"
    update_data = {
        "category": "invalid_category"
    }

    # Send PATCH request to /memory/{memory_id} endpoint
    response = app_client.patch(f"/api/memory/{memory_id}", json=update_data)

    # Verify response status code is 422 (Unprocessable Entity)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Verify response contains validation error details
    data = response.json()
    assert "detail" in data

    # Verify memory_service.update_memory was not called
    mock_memory_service.update_memory.assert_not_called()


@pytest.mark.asyncio
async def test_delete_memory_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful memory deletion"""
    # Set up mock memory service to return True (successful deletion)
    mock_memory_service.delete_memory.return_value = True

    # Create a test memory ID
    memory_id = "test_id"

    # Send DELETE request to /memory/{memory_id} endpoint
    response = app_client.delete(f"/api/memory/{memory_id}")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains success message
    data = response.json()
    assert data["success"] is True

    # Verify memory_service.delete_memory was called with correct memory_id
    mock_memory_service.delete_memory.assert_called_once_with("test_id")


@pytest.mark.asyncio
async def test_delete_memory_not_found(app_client: TestClient, mock_memory_service: MagicMock):
    """Test deletion of non-existent memory"""
    # Set up mock memory service to return False (memory not found)
    mock_memory_service.delete_memory.return_value = False

    # Create a test memory ID
    memory_id = "test_id"

    # Send DELETE request to /memory/{memory_id} endpoint
    response = app_client.delete(f"/api/memory/{memory_id}")

    # Verify response status code is 404 (Not Found)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data

    # Verify memory_service.delete_memory was called with correct memory_id
    mock_memory_service.delete_memory.assert_called_once_with("test_id")


@pytest.mark.asyncio
async def test_search_memory_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful memory search"""
    # Set up mock memory service to return search results
    mock_memory_service.search_memory.return_value = {
        "results": [
            {"id": "1", "content": "Memory 1", "category": "conversation"},
            {"id": "2", "content": "Memory 2", "category": "document"}
        ],
        "total_count": 2,
        "limit": 10
    }

    # Create a test search request with query and filters
    search_request = {
        "query": "test",
        "limit": 10,
        "categories": ["conversation", "document"],
        "filters": {"source": "test"}
    }

    # Send POST request to /memory/search endpoint
    response = app_client.post("/api/memory/search", json=search_request)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected search results
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2

    # Verify memory_service.search_memory was called with correct parameters
    mock_memory_service.search_memory.assert_called_once()


@pytest.mark.asyncio
async def test_search_memory_empty_results(app_client: TestClient, mock_memory_service: MagicMock):
    """Test memory search with no results"""
    # Set up mock memory service to return empty results
    mock_memory_service.search_memory.return_value = {
        "results": [],
        "total_count": 0,
        "limit": 10
    }

    # Create a test search request
    search_request = {
        "query": "test",
        "limit": 10
    }

    # Send POST request to /memory/search endpoint
    response = app_client.post("/api/memory/search", json=search_request)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains empty results list
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 0

    # Verify memory_service.search_memory was called with correct parameters
    mock_memory_service.search_memory.assert_called_once()


@pytest.mark.asyncio
async def test_retrieve_context_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful context retrieval"""
    # Set up mock memory service to return context items and formatted context
    mock_memory_service.retrieve_context.return_value = {
        "context_items": [
            {"id": "1", "content": "Memory 1", "category": "conversation"},
            {"id": "2", "content": "Memory 2", "category": "document"}
        ],
        "formatted_context": "Formatted context"
    }

    # Create a test context retrieval request
    context_request = {
        "query": "test",
        "limit": 10
    }

    # Send POST request to /memory/context endpoint
    response = app_client.post("/api/memory/context", json=context_request)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected context items and formatted context
    data = response.json()
    assert "items" in data
    assert "formatted_context" in data
    assert data["formatted_context"] == "Formatted context"

    # Verify memory_service.retrieve_context was called with correct parameters
    mock_memory_service.retrieve_context.assert_called_once()


@pytest.mark.asyncio
async def test_retrieve_context_with_conversation_id(app_client: TestClient, mock_memory_service: MagicMock):
    """Test context retrieval with conversation ID"""
    # Set up mock memory service to return context items and formatted context
    mock_memory_service.retrieve_context.return_value = {
        "context_items": [
            {"id": "1", "content": "Memory 1", "category": "conversation"},
            {"id": "2", "content": "Memory 2", "category": "document"}
        ],
        "formatted_context": "Formatted context"
    }

    # Create a test context retrieval request with conversation_id
    context_request = {
        "query": "test",
        "limit": 10,
        "conversation_id": "test_conversation_id"
    }

    # Send POST request to /memory/context endpoint
    response = app_client.post("/api/memory/context", json=context_request)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected context items and formatted context
    data = response.json()
    assert "items" in data
    assert "formatted_context" in data
    assert data["formatted_context"] == "Formatted context"

    # Verify memory_service.retrieve_context was called with conversation_id parameter
    mock_memory_service.retrieve_context.assert_called_once()
    args, kwargs = mock_memory_service.retrieve_context.call_args
    assert kwargs["conversation_id"] == "test_conversation_id"


@pytest.mark.asyncio
async def test_get_by_category_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful retrieval of memories by category"""
    # Set up mock memory service to return a list of memory items
    mock_memory_service.get_by_category.return_value = [
        {"id": "1", "content": "Memory 1", "category": "conversation"},
        {"id": "2", "content": "Memory 2", "category": "conversation"}
    ]

    # Send GET request to /memory/category/{category} endpoint
    response = app_client.get("/api/memory/category/conversation")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected memory items
    data = response.json()
    assert len(data) == 2

    # Verify memory_service.get_by_category was called with correct parameters
    mock_memory_service.get_by_category.assert_called_once_with("conversation", 10, 0)


@pytest.mark.asyncio
async def test_get_by_category_invalid_category(app_client: TestClient, mock_memory_service: MagicMock):
    """Test retrieval with invalid category"""
    # Set up mock memory service
    mock_memory_service.get_by_category.return_value = []

    # Send GET request to /memory/category/invalid_category endpoint
    response = app_client.get("/api/memory/category/invalid_category")

    # Verify response status code is 422 (Unprocessable Entity)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Verify response contains validation error details
    data = response.json()
    assert "detail" in data

    # Verify memory_service.get_by_category was not called
    mock_memory_service.get_by_category.assert_not_called()


@pytest.mark.asyncio
async def test_get_by_source_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful retrieval of memories by source"""
    # Set up mock memory service to return a list of memory items
    mock_memory_service.get_by_source.return_value = [
        {"id": "1", "content": "Memory 1", "category": "conversation", "source_type": "test", "source_id": "test_id"},
        {"id": "2", "content": "Memory 2", "category": "document", "source_type": "test", "source_id": "test_id"}
    ]

    # Create a test source_type and source_id
    source_type = "test"
    source_id = "test_id"

    # Send GET request to /memory/source/{source_type}/{source_id} endpoint
    response = app_client.get(f"/api/memory/source/{source_type}/{source_id}")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected memory items
    data = response.json()
    assert len(data) == 2

    # Verify memory_service.get_by_source was called with correct parameters
    mock_memory_service.get_by_source.assert_called_once_with(source_type, "test_id", 10, 0)


@pytest.mark.asyncio
async def test_get_recent_memories_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful retrieval of recent memories"""
    # Set up mock memory service to return a list of recent memory items
    mock_memory_service.get_recent_memories.return_value = [
        {"id": "1", "content": "Memory 1", "category": "conversation"},
        {"id": "2", "content": "Memory 2", "category": "document"}
    ]

    # Send GET request to /memory/recent endpoint
    response = app_client.get("/api/memory/recent")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected memory items
    data = response.json()
    assert len(data) == 2

    # Verify memory_service.get_recent_memories was called with correct parameters
    mock_memory_service.get_recent_memories.assert_called_once_with(10)


@pytest.mark.asyncio
async def test_mark_as_important_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful marking of memory as important"""
    # Set up mock memory service to return an updated memory item
    mock_memory_service.mark_as_important.return_value = {
        "id": "test_id",
        "content": "Test memory content",
        "category": "important",
        "importance": 5
    }

    # Create a test memory ID and importance level
    memory_id = "test_id"
    importance_level = 5

    # Send POST request to /memory/{memory_id}/important endpoint
    response = app_client.post(f"/api/memory/{memory_id}/important", json=importance_level)

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains updated memory item with importance flag
    data = response.json()
    assert data["id"] == "test_id"
    assert data["category"] == "important"
    assert data["importance"] == 5

    # Verify memory_service.mark_as_important was called with correct parameters
    mock_memory_service.mark_as_important.assert_called_once_with("test_id", importance_level)


@pytest.mark.asyncio
async def test_mark_as_important_not_found(app_client: TestClient, mock_memory_service: MagicMock):
    """Test marking non-existent memory as important"""
    # Set up mock memory service to return None (memory not found)
    mock_memory_service.mark_as_important.return_value = None

    # Create a test memory ID and importance level
    memory_id = "test_id"
    importance_level = 5

    # Send POST request to /memory/{memory_id}/important endpoint
    response = app_client.post(f"/api/memory/{memory_id}/important", json=importance_level)

    # Verify response status code is 404 (Not Found)
    assert response.status_code == status.HTTP_404_NOT_FOUND

    # Verify response contains appropriate error message
    data = response.json()
    assert "detail" in data

    # Verify memory_service.mark_as_important was called with correct parameters
    mock_memory_service.mark_as_important.assert_called_once_with("test_id", importance_level)


@pytest.mark.asyncio
async def test_mark_as_important_invalid_level(app_client: TestClient, mock_memory_service: MagicMock):
    """Test marking memory as important with invalid importance level"""
    # Set up mock memory service
    mock_memory_service.mark_as_important.return_value = {}

    # Create a test memory ID and invalid importance level (e.g., 6)
    memory_id = "test_id"
    importance_level = 6

    # Send POST request to /memory/{memory_id}/important endpoint
    response = app_client.post(f"/api/memory/{memory_id}/important", json=importance_level)

    # Verify response status code is 422 (Unprocessable Entity)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Verify response contains validation error details
    data = response.json()
    assert "detail" in data

    # Verify memory_service.mark_as_important was not called
    mock_memory_service.mark_as_important.assert_not_called()


@pytest.mark.asyncio
async def test_count_memories_success(app_client: TestClient, mock_memory_service: MagicMock):
    """Test successful counting of memories"""
    # Set up mock memory service to return count data
    mock_memory_service.count_memories.return_value = 100
    mock_memory_service.count_by_category.return_value = {
        "conversation": 50,
        "document": 30,
        "web": 20
    }

    # Send GET request to /memory/count endpoint
    response = app_client.get("/api/memory/count")

    # Verify response status code is 200 (OK)
    assert response.status_code == status.HTTP_200_OK

    # Verify response contains expected count data
    data = response.json()
    assert data["total"] == 100
    assert data["categories"]["conversation"] == 50
    assert data["categories"]["document"] == 30
    assert data["categories"]["web"] == 20

    # Verify memory_service.count_memories and count_by_category were called
    mock_memory_service.count_memories.assert_called_once()
    mock_memory_service.count_by_category.assert_called_once()