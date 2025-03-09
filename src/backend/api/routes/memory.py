import logging
import uuid
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from fastapi.security import SecurityScopes

from .authentication import get_current_user
from .error_handler import ResourceNotFoundError, ValidationError
from ...services.memory_service import MemoryService
from ...schemas.memory import (
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
from ...config.settings import Settings

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Set default memory limit
DEFAULT_MEMORY_LIMIT = settings.get('memory.default_limit', 50)

# Set default context limit
DEFAULT_CONTEXT_LIMIT = settings.get('memory.context_limit', 10)

# Create API router
router = APIRouter(prefix="/memory", tags=["memory"])


async def get_memory_service() -> MemoryService:
    """
    Dependency function to get the memory service instance
    """
    # Import necessary dependencies for creating MemoryService
    from ...database.vector_db import VectorDatabase  # Assuming v1.0
    from ...database.sqlite_db import SQLiteDatabase  # Assuming v1.0
    from ...utils.embeddings import get_embedding_model

    # Create VectorDatabase instance
    vector_db = VectorDatabase()

    # Create SQLiteDatabase instance
    sqlite_db = SQLiteDatabase()

    # Create and return a new MemoryService instance with required dependencies
    return MemoryService(vector_db, sqlite_db)


@router.post("/", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
async def create_memory(
    memory_data: MemoryCreate,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to create a new memory item
    """
    # Log memory creation request
    logger.debug(f"Creating memory item for user: {current_user.get('id')}")

    # Extract memory data from request (content, category, source_type, source_id, importance, metadata)
    content = memory_data.content
    category = memory_data.category
    source_type = memory_data.source_type
    source_id = memory_data.source_id
    importance = memory_data.importance
    metadata = memory_data.metadata

    # Validate category against MEMORY_CATEGORIES
    if category not in MEMORY_CATEGORIES:
        raise ValidationError(f"Invalid memory category: {category}")

    try:
        # Create memory item using memory_service.store_memory
        memory_item = await memory_service.store_memory(
            content=content,
            category=category,
            source_type=source_type,
            source_id=source_id,
            importance=importance,
            metadata=metadata
        )

        # Return the created memory item details
        return memory_item
    except Exception as e:
        # Handle and log any errors that occur during creation
        logger.error(f"Error creating memory item: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/{memory_id}", response_model=MemoryResponse, status_code=status.HTTP_200_OK)
async def get_memory(
    memory_id: uuid.UUID,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to retrieve a specific memory item by ID
    """
    # Log memory retrieval request
    logger.debug(f"Retrieving memory item with ID: {memory_id} for user: {current_user.get('id')}")

    try:
        # Retrieve memory item using memory_service.get_memory
        memory_item = await memory_service.get_memory(memory_id)

        # If memory item not found, raise ResourceNotFoundError
        if not memory_item:
            raise ResourceNotFoundError(f"Memory item with ID {memory_id} not found")

        # Return the memory item details
        return memory_item
    except ResourceNotFoundError as e:
        # Re-raise ResourceNotFoundError
        raise e
    except Exception as e:
        # Handle and log any errors that occur during retrieval
        logger.error(f"Error retrieving memory item: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch("/{memory_id}", response_model=MemoryResponse, status_code=status.HTTP_200_OK)
async def update_memory(
    memory_id: uuid.UUID,
    updates: MemoryUpdateRequest,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to update an existing memory item
    """
    # Log memory update request
    logger.debug(f"Updating memory item with ID: {memory_id} for user: {current_user.get('id')}")

    # Extract update data from request
    update_data = updates.dict(exclude_unset=True)

    # If category provided, validate against MEMORY_CATEGORIES
    if "category" in update_data and update_data["category"] not in MEMORY_CATEGORIES:
        raise ValidationError(f"Invalid memory category: {update_data['category']}")

    try:
        # Update memory item using memory_service.update_memory
        updated_item = await memory_service.update_memory(memory_id, update_data)

        # If memory item not found, raise ResourceNotFoundError
        if not updated_item:
            raise ResourceNotFoundError(f"Memory item with ID {memory_id} not found")

        # Return the updated memory item
        return updated_item
    except ResourceNotFoundError as e:
        # Re-raise ResourceNotFoundError
        raise e
    except Exception as e:
        # Handle and log any errors that occur during update
        logger.error(f"Error updating memory item: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete("/{memory_id}", response_model=MemoryDeleteResponse, status_code=status.HTTP_200_OK)
async def delete_memory(
    memory_id: uuid.UUID,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to delete a memory item
    """
    # Log memory deletion request
    logger.debug(f"Deleting memory item with ID: {memory_id} for user: {current_user.get('id')}")

    try:
        # Delete memory item using memory_service.delete_memory
        deletion_result = await memory_service.delete_memory(memory_id)

        # If memory item not found, raise ResourceNotFoundError
        if not deletion_result:
            raise ResourceNotFoundError(f"Memory item with ID {memory_id} not found")

        # Return deletion result with success status
        return MemoryDeleteResponse(success=True, message=f"Memory item with ID {memory_id} deleted successfully")
    except ResourceNotFoundError as e:
        # Re-raise ResourceNotFoundError
        raise e
    except Exception as e:
        # Handle and log any errors that occur during deletion
        logger.error(f"Error deleting memory item: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/search", response_model=MemorySearchResponse, status_code=status.HTTP_200_OK)
async def search_memory(
    search_request: MemorySearchRequest,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to search for memory items
    """
    # Log memory search request
    logger.debug(f"Searching memory for user: {current_user.get('id')}, query: {search_request.query}")

    # Extract search parameters (query, limit, categories, filters)
    query = search_request.query
    limit = search_request.limit
    categories = search_request.categories
    filters = search_request.filters

    # Set default limit if not provided
    limit = limit or DEFAULT_MEMORY_LIMIT

    try:
        # Search memory using memory_service.search_memory
        search_results = await memory_service.search_memory(
            query=query,
            limit=limit,
            categories=categories,
            filters=filters
        )

        # Return search results with pagination metadata
        return MemorySearchResponse(
            results=search_results["results"],
            total=search_results["total_count"],
            limit=search_results["limit"]
        )
    except Exception as e:
        # Handle and log any errors that occur during search
        logger.error(f"Error searching memory: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/context", response_model=ContextRetrievalResponse, status_code=status.HTTP_200_OK)
async def retrieve_context(
    context_request: ContextRetrievalRequest,
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to retrieve context based on a query
    """
    # Log context retrieval request
    logger.debug(f"Retrieving context for user: {current_user.get('id')}, query: {context_request.query}")

    # Extract context parameters (query, limit, categories, filters, conversation_id, format_type)
    query = context_request.query
    limit = context_request.limit
    categories = context_request.categories
    filters = context_request.filters
    conversation_id = context_request.conversation_id
    format_type = context_request.format_type

    # Set default limit if not provided
    limit = limit or DEFAULT_CONTEXT_LIMIT

    try:
        # Retrieve context using memory_service.retrieve_context
        context_data = await memory_service.retrieve_context(
            query=query,
            limit=limit,
            categories=categories,
            filters=filters,
            conversation_id=conversation_id
        )

        # Return context items and formatted context
        return ContextRetrievalResponse(
            items=context_data["context_items"],
            formatted_context=context_data["formatted_context"]
        )
    except Exception as e:
        # Handle and log any errors that occur during retrieval
        logger.error(f"Error retrieving context: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/category/{category}", response_model=List[MemoryResponse], status_code=status.HTTP_200_OK)
async def get_by_category(
    category: str,
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to retrieve memory items by category
    """
    # Log category retrieval request
    logger.debug(f"Retrieving memory items by category: {category} for user: {current_user.get('id')}")

    # Validate category against MEMORY_CATEGORIES
    if category not in MEMORY_CATEGORIES:
        raise ValidationError(f"Invalid memory category: {category}")

    try:
        # Retrieve memory items using memory_service.get_by_category
        memory_items = await memory_service.get_by_category(category, limit, offset)

        # Return the list of memory items
        return memory_items
    except Exception as e:
        # Handle and log any errors that occur during retrieval
        logger.error(f"Error retrieving memory items by category: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/source/{source_type}/{source_id}", response_model=List[MemoryResponse], status_code=status.HTTP_200_OK)
async def get_by_source(
    source_type: str,
    source_id: uuid.UUID,
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to retrieve memory items by source
    """
    # Log source retrieval request
    logger.debug(f"Retrieving memory items by source: {source_type}/{source_id} for user: {current_user.get('id')}")

    try:
        # Retrieve memory items using memory_service.get_by_source
        memory_items = await memory_service.get_by_source(source_type, source_id, limit, offset)

        # Return the list of memory items
        return memory_items
    except Exception as e:
        # Handle and log any errors that occur during retrieval
        logger.error(f"Error retrieving memory items by source: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/recent", response_model=List[MemoryResponse], status_code=status.HTTP_200_OK)
async def get_recent_memories(
    limit: int = Query(default=10, le=100),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to retrieve the most recent memory items
    """
    # Log recent memories request
    logger.debug(f"Retrieving recent memory items for user: {current_user.get('id')}")

    try:
        # Retrieve recent memory items using memory_service.get_recent_memories
        memory_items = await memory_service.get_recent_memories(limit)

        # Return the list of memory items
        return memory_items
    except Exception as e:
        # Handle and log any errors that occur during retrieval
        logger.error(f"Error retrieving recent memory items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{memory_id}/important", response_model=MemoryResponse, status_code=status.HTTP_200_OK)
async def mark_as_important(
    memory_id: uuid.UUID,
    importance_level: int = Body(..., ge=1, le=5),
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint to mark a memory item as important
    """
    # Log mark as important request
    logger.debug(f"Marking memory item {memory_id} as important for user: {current_user.get('id')}")

    # Validate importance_level is between 1 and 5
    if not 1 <= importance_level <= 5:
        raise ValidationError("Importance level must be between 1 and 5")

    try:
        # Mark memory as important using memory_service.mark_as_important
        updated_item = await memory_service.mark_as_important(memory_id, importance_level)

        # If memory item not found, raise ResourceNotFoundError
        if not updated_item:
            raise ResourceNotFoundError(f"Memory item with ID {memory_id} not found")

        # Return the updated memory item
        return updated_item
    except ResourceNotFoundError as e:
        # Re-raise ResourceNotFoundError
        raise e
    except Exception as e:
        # Handle and log any errors that occur during update
        logger.error(f"Error marking memory as important: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/count", status_code=status.HTTP_200_OK)
async def count_memories(
    memory_service: MemoryService = Depends(get_memory_service),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, int]:
    """
    Endpoint to count memory items
    """
    # Log count request
    logger.debug(f"Counting memory items for user: {current_user.get('id')}")

    try:
        # Get total count using memory_service.count_memories
        total_count = await memory_service.count_memories()

        # Get category counts using memory_service.count_by_category
        category_counts = await memory_service.count_by_category()

        # Return combined count information
        return {"total": total_count, "categories": category_counts}
    except Exception as e:
        # Handle and log any errors that occur during counting
        logger.error(f"Error counting memory items: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# Export the memory router for inclusion in the main API router