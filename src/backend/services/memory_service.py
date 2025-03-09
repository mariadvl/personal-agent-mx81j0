import logging
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime

from .storage import MemoryStorage  # Assuming v1.0
from .retriever import MemoryRetriever, ConversationContextManager  # Assuming v1.0
from ..database.vector_db import VectorDatabase  # Assuming v1.0
from ..database.sqlite_db import SQLiteDatabase  # Assuming v1.0
from ..config.settings import Settings  # Assuming v1.0
from ..utils.event_bus import EventBus  # Assuming v1.0

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
DEFAULT_SEARCH_LIMIT = settings.get('memory.search_limit', 50)
DEFAULT_CONTEXT_LIMIT = settings.get('memory.context_limit', 10)
event_bus = EventBus()


def validate_memory_category(category: str) -> bool:
    """
    Validates that a memory category is one of the allowed values.

    Args:
        category: The category to validate

    Returns:
        True if valid, False if invalid
    """
    if category in ['conversation', 'document', 'web', 'important', 'user_defined']:
        return True

    logger.warning(f"Invalid memory category: {category}. Valid categories are: ['conversation', 'document', 'web', 'important', 'user_defined']")
    return False


def merge_search_results(vector_results: List[Dict], metadata_results: List[Dict]) -> List[Dict]:
    """
    Merges and deduplicates search results from vector and metadata searches.

    Args:
        vector_results: Results from vector search
        metadata_results: Results from metadata search

    Returns:
        Merged and deduplicated results
    """
    # Track seen memory IDs to avoid duplicates
    seen_ids = set()
    merged_results = []

    # Add vector results first (typically more relevant)
    for result in vector_results:
        memory_id = result.get('id')
        if memory_id:
            seen_ids.add(memory_id)
            merged_results.append(result)

    # Add metadata results if not already included
    for result in metadata_results:
        memory_id = result.get('id')
        if memory_id and memory_id not in seen_ids:
            merged_results.append(result)

    return merged_results


class MemoryService:
    """
    Core service for managing memory storage, retrieval, and context management
    """

    def __init__(self, vector_db: VectorDatabase, sqlite_db: SQLiteDatabase):
        """
        Initializes the memory service with required dependencies

        Args:
            vector_db: Vector database for semantic search
            sqlite_db: SQLite database for metadata storage
        """
        self.memory_storage = MemoryStorage(vector_db, sqlite_db)
        self.memory_retriever = MemoryRetriever(self.memory_storage)
        self.context_manager = ConversationContextManager(self.memory_retriever)
        logger.info("MemoryService initialized with vector and metadata stores")

    async def store_memory(self, content: str, category: str, source_type: Optional[str] = None,
                          source_id: Optional[uuid.UUID] = None, importance: Optional[int] = None,
                          metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Stores a new memory item

        Args:
            content: Content of the memory item
            category: Category of the memory item
            source_type: Type of the source (conversation, document, web, etc.)
            source_id: ID of the source
            importance: Importance rating (1-5)
            metadata: Additional metadata

        Returns:
            Stored memory item with ID and metadata

        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Log memory storage request
            logger.debug(f"Storing memory item with category: {category}, source_type: {source_type}, source_id: {source_id}")

            # Call memory_storage.store_memory with parameters
            memory_item = await self.memory_storage.store_memory(
                content=content,
                category=category,
                source_type=source_type,
                source_id=source_id,
                importance=importance,
                metadata=metadata
            )

            # If source_type is 'conversation' and source_id is provided, update conversation context
            if source_type == 'conversation' and source_id:
                logger.debug(f"Updating conversation context for conversation_id: {source_id}")
                # Implement context update logic here if needed
                pass

            # Publish memory:service:stored event with memory details
            event_bus.publish("memory:service:stored", {
                "memory_id": memory_item["id"],
                "category": category,
                "source_type": source_type,
                "source_id": str(source_id) if source_id else None
            })

            # Return the stored memory item
            return memory_item
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error storing memory: {str(e)}")
            raise

    async def batch_store_memory(self, memory_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Stores multiple memory items in batch

        Args:
            memory_items: List of memory item dictionaries with required fields

        Returns:
            List of stored memory items with IDs

        Raises:
            ValueError: If any category is invalid
        """
        try:
            # Log batch memory storage request
            logger.debug(f"Storing {len(memory_items)} memory items in batch")

            # Call memory_storage.batch_store_memory with memory_items
            stored_items = await self.memory_storage.batch_store_memory(memory_items)

            # For conversation items, update relevant conversation contexts
            for item in stored_items:
                if item.get("source_type") == 'conversation' and item.get("source_id"):
                    logger.debug(f"Updating conversation context for conversation_id: {item['source_id']}")
                    # Implement context update logic here if needed
                    pass

            # Publish memory:service:batch_stored event
            event_bus.publish("memory:service:batch_stored", {
                "count": len(stored_items)
            })

            # Return the list of stored memory items
            return stored_items
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error batch storing memory: {str(e)}")
            raise

    async def get_memory(self, memory_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        Retrieves a memory item by ID

        Args:
            memory_id: ID of the memory item

        Returns:
            Memory item or None if not found
        """
        try:
            # Log memory retrieval request
            logger.debug(f"Retrieving memory item with ID: {memory_id}")

            # Call memory_storage.get_memory with memory_id
            memory_item = await self.memory_storage.get_memory(memory_id)

            # Return the memory item or None if not found
            return memory_item
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error retrieving memory {memory_id}: {str(e)}")
            return None

    async def update_memory(self, memory_id: uuid.UUID, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Updates an existing memory item

        Args:
            memory_id: ID of the memory item to update
            updates: Dictionary of fields to update

        Returns:
            Updated memory item or None if not found

        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Log memory update request
            logger.debug(f"Updating memory item with ID: {memory_id}, updates: {updates}")

            # Call memory_storage.update_memory with memory_id and updates
            updated_item = await self.memory_storage.update_memory(memory_id, updates)

            # If update successful and item is part of conversation context, update context
            if updated_item and updated_item.get("source_type") == 'conversation' and updated_item.get("source_id"):
                logger.debug(f"Updating conversation context for conversation_id: {updated_item['source_id']}")
                # Implement context update logic here if needed
                pass

            # Publish memory:service:updated event if successful
            if updated_item:
                event_bus.publish("memory:service:updated", {
                    "memory_id": str(memory_id)
                })

            # Return the updated memory item or None if not found
            return updated_item
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error updating memory {memory_id}: {str(e)}")
            return None

    async def delete_memory(self, memory_id: uuid.UUID) -> bool:
        """
        Deletes a memory item by ID

        Args:
            memory_id: ID of the memory item to delete

        Returns:
            True if successful, False if not found
        """
        try:
            # Log memory deletion request
            logger.debug(f"Deleting memory item with ID: {memory_id}")

            # Get memory item to check if it's part of conversation context
            memory_item = await self.get_memory(memory_id)

            # Call memory_storage.delete_memory with memory_id
            deletion_result = await self.memory_storage.delete_memory(memory_id)

            # If deletion successful and item was part of conversation, update context
            if deletion_result and memory_item and memory_item.get("source_type") == 'conversation' and memory_item.get("source_id"):
                logger.debug(f"Updating conversation context for conversation_id: {memory_item['source_id']}")
                # Implement context update logic here if needed
                pass

            # Publish memory:service:deleted event if successful
            if deletion_result:
                event_bus.publish("memory:service:deleted", {
                    "memory_id": str(memory_id)
                })

            # Return success status (True if deletion successful)
            return deletion_result
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error deleting memory {memory_id}: {str(e)}")
            return False

    async def search_memory(self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None,
                            categories: Optional[List[str]] = None, limit: Optional[int] = None,
                            offset: Optional[int] = None) -> Dict[str, Any]:
        """
        Searches for memory items based on content and/or filters

        Args:
            query: Text query to search for
            filters: Optional metadata filters
            categories: Optional list of categories to filter by
            limit: Maximum number of results to return
            offset: Number of results to skip for pagination

        Returns:
            Search results with pagination metadata
        """
        try:
            # Log memory search request
            logger.debug(f"Searching memory with query: {query}, filters: {filters}, categories: {categories}, limit: {limit}, offset: {offset}")

            # Set default values for optional parameters
            limit = limit or DEFAULT_SEARCH_LIMIT
            offset = offset or 0

            # Prepare filters dictionary combining explicit filters and categories
            search_filters = filters or {}
            if categories:
                search_filters['category'] = categories

            # If query is provided, search by content with filters
            if query:
                results = await self.memory_retriever.retrieve_context(query, search_filters, limit)
            # If no query, search by metadata only
            else:
                results = await self.memory_storage.search_by_metadata(search_filters, limit, offset)

            # Count total matching items for pagination
            total_count = await self.memory_storage.count_memories(search_filters)

            # Publish search event
            event_bus.publish("memory:service:searched", {
                "query": query,
                "filter_count": len(search_filters),
                "result_count": len(results)
            })

            # Return search results with pagination metadata
            return {
                "results": results,
                "total_count": total_count,
                "limit": limit,
                "offset": offset
            }
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error searching memory: {str(e)}")
            return {
                "results": [],
                "total_count": 0,
                "limit": limit,
                "offset": offset
            }

    async def retrieve_context(self, query: str, filters: Optional[Dict[str, Any]] = None,
                               categories: Optional[List[str]] = None, limit: Optional[int] = None,
                               conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Retrieves relevant context based on a query

        Args:
            query: Text query to search for
            filters: Optional metadata filters
            categories: Optional list of categories to filter by
            limit: Maximum number of results to return
            conversation_id: Optional conversation ID to retrieve context for

        Returns:
            Retrieved context items and metadata
        """
        try:
            # Log context retrieval request
            logger.debug(f"Retrieving context for query: {query}, filters: {filters}, categories: {categories}, limit: {limit}, conversation_id: {conversation_id}")

            # Set default values for optional parameters
            limit = limit or DEFAULT_CONTEXT_LIMIT
            search_filters = filters or {}
            if categories:
                search_filters['category'] = categories

            # If conversation_id is provided, get context from context_manager
            if conversation_id:
                context_items = await self.context_manager.get_context(conversation_id, query)
            # If no conversation_id, retrieve context using memory_retriever
            else:
                context_items = await self.memory_retriever.retrieve_context(query, search_filters, limit)

            # Format context for LLM using memory_retriever.format_context_for_llm
            formatted_context = await self.memory_retriever.format_context_for_llm(context_items)

            # Publish memory:service:context_retrieved event
            event_bus.publish("memory:service:context_retrieved", {
                "query": query,
                "filter_count": len(search_filters),
                "result_count": len(context_items)
            })

            # Return context items and formatted context
            return {
                "context_items": context_items,
                "formatted_context": formatted_context
            }
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error retrieving context: {str(e)}")
            return {
                "context_items": [],
                "formatted_context": ""
            }

    async def format_context_for_llm(self, memory_items: List[Dict], format_type: Optional[str] = None, token_limit: Optional[int] = None) -> str:
        """
        Formats retrieved memory items into a context string for the LLM

        Args:
            memory_items: List of memory items to format
            format_type: Optional format type
            token_limit: Optional token limit

        Returns:
            Formatted context string
        """
        try:
            # Call memory_retriever.format_context_for_llm with parameters
            formatted_context = await self.memory_retriever.format_context_for_llm(memory_items, format_type, token_limit)

            # Return the formatted context string
            return formatted_context
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error formatting context for LLM: {str(e)}")
            return ""

    async def get_by_category(self, category: str, limit: Optional[int] = None,
                             offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by category

        Args:
            category: Category to filter by
            limit: Maximum number of items to return
            offset: Number of items to skip

        Returns:
            List of memory items in the category

        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Log category retrieval request
            logger.debug(f"Retrieving memory items by category: {category}, limit: {limit}, offset: {offset}")

            # Call memory_storage.get_by_category with parameters
            memory_items = await self.memory_storage.get_by_category(category, limit, offset)

            # Return the list of memory items
            return memory_items
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error retrieving memory items by category {category}: {str(e)}")
            return []

    async def get_by_source(self, source_type: str, source_id: uuid.UUID,
                           limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by source

        Args:
            source_type: Type of the source
            source_id: ID of the source
            limit: Maximum number of items to return
            offset: Number of items to skip

        Returns:
            List of memory items from the source
        """
        try:
            # Log source retrieval request
            logger.debug(f"Retrieving memory items by source: {source_type}, source_id: {source_id}, limit: {limit}, offset: {offset}")

            # Call memory_storage.get_by_source with parameters
            memory_items = await self.memory_storage.get_by_source(source_type, source_id, limit, offset)

            # Return the list of memory items
            return memory_items
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error retrieving memory items by source {source_type}/{source_id}: {str(e)}")
            return []

    async def get_recent_memories(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieves the most recent memory items

        Args:
            limit: Maximum number of items to return

        Returns:
            List of recent memory items
        """
        try:
            # Log recent memories request
            logger.debug(f"Retrieving recent memory items, limit: {limit}")

            # Call memory_storage.get_recent_memories with limit
            memory_items = await self.memory_storage.get_recent_memories(limit)

            # Return the list of memory items
            return memory_items
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error retrieving recent memory items: {str(e)}")
            return []

    async def mark_as_important(self, memory_id: uuid.UUID, importance_level: int) -> Optional[Dict[str, Any]]:
        """
        Marks a memory item as important with a specified importance level

        Args:
            memory_id: ID of the memory item
            importance_level: Importance level (1-5)

        Returns:
            Updated memory item or None if not found
        """
        try:
            # Log mark as important request
            logger.debug(f"Marking memory item {memory_id} as important with level {importance_level}")

            # Validate importance_level is between 1 and 5
            if not 1 <= importance_level <= 5:
                raise ValueError("Importance level must be between 1 and 5")

            # Create updates dictionary with importance and category update
            updates = {
                "importance": importance_level,
                "category": "important"  # Optionally update category as well
            }

            # Call update_memory with memory_id and updates
            updated_item = await self.update_memory(memory_id, updates)

            # Return the updated memory item
            return updated_item
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error marking memory {memory_id} as important: {str(e)}")
            return None

    async def count_memories(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Counts the total number of memory items

        Args:
            filters: Optional filters to apply

        Returns:
            Count of memory items
        """
        try:
            # Call memory_storage.count_memories with optional filters
            count = await self.memory_storage.count_memories(filters)

            # Return the count
            return count
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error counting memory items: {str(e)}")
            return 0

    async def count_by_category(self) -> Dict[str, int]:
        """
        Counts memory items by category

        Returns:
            Dictionary with category counts
        """
        try:
            # Call memory_storage.count_by_category()
            category_counts = await self.memory_storage.count_by_category()

            # Return the category counts dictionary
            return category_counts
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error counting memory items by category: {str(e)}")
            return {}

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding for the given text

        Args:
            text: Text to generate embedding for

        Returns:
            Embedding vector
        """
        try:
            # Call memory_storage.generate_embedding with text
            embedding = await self.memory_storage.generate_embedding(text)

            # Return the embedding vector
            return embedding
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error generating embedding: {str(e)}")
            raise

    async def create_backup(self, backup_path: str) -> bool:
        """
        Creates a backup of the memory system

        Args:
            backup_path: Path where the backup will be created

        Returns:
            True if successful, False otherwise
        """
        try:
            # Log backup creation request
            logger.info(f"Creating memory backup at {backup_path}")

            # Call memory_storage.create_backup with backup_path
            backup_result = await self.memory_storage.create_backup(backup_path)

            # Publish memory:service:backup_created event if successful
            if backup_result:
                event_bus.publish("memory:service:backup_created", {
                    "backup_path": backup_path
                })

            # Return success status
            return backup_result
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error creating memory backup: {str(e)}")
            return False

    async def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restores the memory system from a backup

        Args:
            backup_path: Path to the backup

        Returns:
            True if successful, False otherwise
        """
        try:
            # Log backup restoration request
            logger.info(f"Restoring memory from backup at {backup_path}")

            # Call memory_storage.restore_from_backup with backup_path
            restore_result = await self.memory_storage.restore_from_backup(backup_path)

            # Publish memory:service:backup_restored event if successful
            if restore_result:
                event_bus.publish("memory:service:backup_restored", {
                    "backup_path": backup_path
                })

            # Return success status
            return restore_result
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error restoring memory from backup: {str(e)}")
            return False

    async def optimize_storage(self) -> bool:
        """
        Optimizes the memory storage for better performance

        Returns:
            True if successful, False otherwise
        """
        try:
            # Log storage optimization request
            logger.info("Optimizing memory storage")

            # Call memory_storage.optimize()
            optimization_result = await self.memory_storage.optimize()

            # Publish memory:service:optimized event if successful
            if optimization_result:
                event_bus.publish("memory:service:optimized", {})

            # Return success status
            return optimization_result
        except Exception as e:
            # Handle exceptions and log errors
            logger.error(f"Error optimizing memory storage: {str(e)}")
            return False