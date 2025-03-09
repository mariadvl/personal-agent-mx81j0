"""
Metadata Storage System for Personal AI Agent's Memory.

This module implements a metadata storage system for the Personal AI Agent's memory,
providing an interface to store, retrieve, update, and delete metadata associated with 
memory items. It works alongside the vector database to enable efficient filtering, 
categorization, and management of memory items while maintaining the local-first architecture.
"""

import logging
import uuid
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

from ..database.sqlite_db import SQLiteDatabase
from ..database.models import MemoryItem, MEMORY_CATEGORIES
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Set up logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()


def validate_memory_category(category: str) -> bool:
    """
    Validates that a memory category is one of the allowed values.
    
    Args:
        category: The category to validate
        
    Returns:
        True if the category is valid, False otherwise
    """
    if category in MEMORY_CATEGORIES:
        return True
    
    logger.warning(f"Invalid memory category: {category}. Valid categories are: {MEMORY_CATEGORIES}")
    return False


def format_metadata(metadata: Dict) -> Dict:
    """
    Formats metadata to ensure it's a valid JSON-serializable dictionary.
    
    Args:
        metadata: The metadata dictionary to format
        
    Returns:
        Formatted metadata dictionary
    """
    if metadata is None:
        return {}
    
    # Convert all keys to strings
    formatted_metadata = {}
    for key, value in metadata.items():
        # Convert non-serializable values to strings
        try:
            # Test if value is JSON serializable
            json.dumps(value)
            formatted_metadata[str(key)] = value
        except (TypeError, OverflowError):
            # If not serializable, convert to string
            formatted_metadata[str(key)] = str(value)
    
    return formatted_metadata


class MetadataStore:
    """
    Manages the storage and retrieval of metadata for memory items.
    
    This class provides methods to store, retrieve, update, and delete metadata
    associated with memory items in the Personal AI Agent's memory system.
    """
    
    def __init__(self, sqlite_db: SQLiteDatabase):
        """
        Initializes the metadata store with a SQLite database.
        
        Args:
            sqlite_db: SQLite database for storing metadata
        """
        self.sqlite_db = sqlite_db
        logger.info("MetadataStore initialized successfully")
    
    async def store_metadata(self, content: str, category: str, source_type: Optional[str] = None,
                            source_id: Optional[uuid.UUID] = None, importance: Optional[int] = None,
                            metadata: Optional[Dict] = None) -> Dict:
        """
        Stores metadata for a memory item.
        
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
            # Validate category
            if not validate_memory_category(category):
                raise ValueError(f"Invalid memory category: {category}")
            
            # Set default importance if not provided
            if importance is None:
                importance = 1
            
            # Format metadata
            formatted_metadata = format_metadata(metadata)
            
            # Store in database
            memory_item = await self.sqlite_db.create_memory_item(
                content=content,
                category=category,
                source_type=source_type,
                source_id=source_id,
                importance=importance,
                metadata=formatted_metadata
            )
            
            # Publish event
            event_bus.publish("metadata:stored", {
                "memory_id": memory_item["id"],
                "category": category,
                "source_type": source_type,
                "source_id": str(source_id) if source_id else None
            })
            
            return memory_item
        except Exception as e:
            logger.error(f"Error storing memory metadata: {str(e)}")
            raise
    
    async def batch_store_metadata(self, memory_items: List[Dict]) -> List[Dict]:
        """
        Stores metadata for multiple memory items in batch.
        
        Args:
            memory_items: List of memory item dictionaries with required fields
            
        Returns:
            List of stored memory items with IDs
            
        Raises:
            ValueError: If any category is invalid
        """
        try:
            results = []
            
            for item in memory_items:
                # Validate required fields
                if "content" not in item or "category" not in item:
                    logger.warning(f"Skipping memory item without required fields: {item}")
                    continue
                
                # Validate category
                if not validate_memory_category(item["category"]):
                    logger.warning(f"Skipping memory item with invalid category: {item['category']}")
                    continue
                
                # Set default importance if not provided
                if "importance" not in item:
                    item["importance"] = 1
                
                # Format metadata
                if "metadata" in item:
                    item["metadata"] = format_metadata(item["metadata"])
                else:
                    item["metadata"] = {}
                
                # Store in database
                memory_item = await self.sqlite_db.create_memory_item(
                    content=item["content"],
                    category=item["category"],
                    source_type=item.get("source_type"),
                    source_id=item.get("source_id"),
                    importance=item["importance"],
                    metadata=item["metadata"]
                )
                
                results.append(memory_item)
            
            # Publish event
            event_bus.publish("metadata:batch_stored", {
                "count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error batch storing memory metadata: {str(e)}")
            raise
    
    async def get_metadata(self, memory_id: uuid.UUID) -> Optional[Dict]:
        """
        Retrieves metadata for a memory item by ID.
        
        Args:
            memory_id: ID of the memory item
            
        Returns:
            Memory item dictionary or None if not found
        """
        try:
            # Query database for memory item
            filters = {"id": str(memory_id)}
            memory_items = await self.sqlite_db.get_memory_items(filters=filters, limit=1)
            
            if memory_items and len(memory_items) > 0:
                return memory_items[0]
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving memory metadata for ID {memory_id}: {str(e)}")
            return None
    
    async def update_metadata(self, memory_id: uuid.UUID, updates: Dict) -> Optional[Dict]:
        """
        Updates metadata for an existing memory item.
        
        Args:
            memory_id: ID of the memory item to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated memory item or None if not found
            
        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Validate category if included in updates
            if "category" in updates:
                if not validate_memory_category(updates["category"]):
                    raise ValueError(f"Invalid memory category: {updates['category']}")
            
            # Format metadata if included in updates
            if "metadata" in updates:
                updates["metadata"] = format_metadata(updates["metadata"])
            
            # Update in database
            updated_item = await self.sqlite_db.update_memory_item(str(memory_id), updates)
            
            if updated_item:
                # Publish event
                event_bus.publish("metadata:updated", {
                    "memory_id": str(memory_id)
                })
                
                return updated_item
            
            return None
        except Exception as e:
            logger.error(f"Error updating memory metadata for ID {memory_id}: {str(e)}")
            return None
    
    async def delete_metadata(self, memory_id: uuid.UUID) -> bool:
        """
        Deletes metadata for a memory item by ID.
        
        Args:
            memory_id: ID of the memory item to delete
            
        Returns:
            True if successful, False if not found
        """
        try:
            # Delete from database
            result = await self.sqlite_db.delete_memory_item(str(memory_id))
            
            if result:
                # Publish event
                event_bus.publish("metadata:deleted", {
                    "memory_id": str(memory_id)
                })
            
            return result
        except Exception as e:
            logger.error(f"Error deleting memory metadata for ID {memory_id}: {str(e)}")
            return False
    
    async def search_metadata(self, filters: Dict, limit: Optional[int] = None,
                            offset: Optional[int] = None) -> List[Dict]:
        """
        Searches for memory items based on metadata filters.
        
        Args:
            filters: Filters to apply to the search
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of memory items matching the filters
        """
        try:
            # Set default values
            if limit is None:
                limit = settings.get("memory.default_search_limit", 100)
            
            if offset is None:
                offset = 0
            
            # Query database
            memory_items = await self.sqlite_db.get_memory_items(
                filters=filters,
                limit=limit,
                offset=offset
            )
            
            return memory_items
        except Exception as e:
            logger.error(f"Error searching memory metadata: {str(e)}")
            return []
    
    async def get_by_category(self, category: str, limit: Optional[int] = None,
                            offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by category.
        
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
            # Validate category
            if not validate_memory_category(category):
                raise ValueError(f"Invalid memory category: {category}")
            
            # Create filters
            filters = {"category": category}
            
            # Search with filters
            return await self.search_metadata(filters, limit, offset)
        except Exception as e:
            logger.error(f"Error retrieving memory items by category {category}: {str(e)}")
            return []
    
    async def get_by_source(self, source_type: str, source_id: uuid.UUID,
                          limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by source.
        
        Args:
            source_type: Type of the source
            source_id: ID of the source
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of memory items from the source
        """
        try:
            # Create filters
            filters = {
                "source_type": source_type,
                "source_id": str(source_id)
            }
            
            # Search with filters
            return await self.search_metadata(filters, limit, offset)
        except Exception as e:
            logger.error(f"Error retrieving memory items by source {source_type}/{source_id}: {str(e)}")
            return []
    
    async def get_by_importance(self, min_importance: int, limit: Optional[int] = None,
                              offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items with importance above a threshold.
        
        Args:
            min_importance: Minimum importance value (1-5)
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of important memory items
        """
        try:
            # Create filters
            filters = {"importance": min_importance}  # SQLite DB handles this as >= in its implementation
            
            # Search with filters
            return await self.search_metadata(filters, limit, offset)
        except Exception as e:
            logger.error(f"Error retrieving memory items by importance {min_importance}: {str(e)}")
            return []
    
    async def count_memories(self, filters: Optional[Dict] = None) -> int:
        """
        Counts the total number of memory items.
        
        Args:
            filters: Optional filters to apply
            
        Returns:
            Count of memory items
        """
        try:
            if filters is None:
                filters = {}
            
            count = await self.sqlite_db.count_records(MemoryItem, filters)
            return count
        except Exception as e:
            logger.error(f"Error counting memory items: {str(e)}")
            return 0
    
    async def count_by_category(self) -> Dict[str, int]:
        """
        Counts memory items by category.
        
        Returns:
            Dictionary with category counts
        """
        try:
            result = {}
            
            for category in MEMORY_CATEGORIES:
                count = await self.count_memories({"category": category})
                result[category] = count
            
            return result
        except Exception as e:
            logger.error(f"Error counting memory items by category: {str(e)}")
            return {}
    
    async def get_recent_memories(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieves the most recent memory items.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of recent memory items
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = settings.get("memory.default_recent_limit", 10)
            
            # Query database with ordering by created_at
            memory_items = await self.sqlite_db.get_memory_items(
                limit=limit,
                offset=0
            )  # The SQLite DB method orders by created_at desc by default
            
            return memory_items
        except Exception as e:
            logger.error(f"Error retrieving recent memory items: {str(e)}")
            return []