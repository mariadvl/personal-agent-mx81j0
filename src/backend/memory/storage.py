import logging
import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
import json
import asyncio

from .vector_store import VectorStore
from .metadata_store import MetadataStore
from ..database.vector_db import VectorDatabase
from ..database.sqlite_db import SQLiteDatabase
from ..database.models import MEMORY_CATEGORIES
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Constants
DEFAULT_SEARCH_LIMIT = settings.get('memory.search_limit', 50)

def validate_memory_category(category: str) -> bool:
    """
    Validates that a memory category is one of the allowed values.
    
    Args:
        category: The category to validate
        
    Returns:
        True if valid, False if invalid
    """
    if category in MEMORY_CATEGORIES:
        return True
    
    logger.warning(f"Invalid memory category: {category}. Valid categories are: {MEMORY_CATEGORIES}")
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

class MemoryStorage:
    """
    Unified memory storage system combining vector and metadata storage.
    
    This class provides a comprehensive interface for memory operations,
    integrating both vector embeddings for semantic search and metadata
    for structured queries.
    """
    
    def __init__(self, vector_db: VectorDatabase, sqlite_db: SQLiteDatabase):
        """
        Initializes the memory storage with vector and metadata stores.
        
        Args:
            vector_db: Vector database for semantic search
            sqlite_db: SQLite database for metadata storage
        """
        self.vector_store = VectorStore(vector_db)
        self.metadata_store = MetadataStore(sqlite_db)
        logger.info("MemoryStorage initialized with vector and metadata stores")
    
    async def store_memory(self, content: str, category: str, source_type: Optional[str] = None,
                          source_id: Optional[uuid.UUID] = None, importance: Optional[int] = None,
                          metadata: Optional[Dict] = None, id: Optional[str] = None) -> Dict:
        """
        Stores a memory item with content and metadata.
        
        Args:
            content: Content of the memory item
            category: Category of the memory item
            source_type: Type of the source (conversation, document, web, etc.)
            source_id: ID of the source
            importance: Importance rating (1-5)
            metadata: Additional metadata
            id: Optional ID for the memory item (generated if not provided)
            
        Returns:
            Stored memory item with ID and metadata
            
        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Validate category
            if not validate_memory_category(category):
                raise ValueError(f"Invalid memory category: {category}")
            
            # Generate ID if not provided
            memory_id = id or str(uuid.uuid4())
            
            # Set default importance if not provided
            if importance is None:
                importance = 1
            
            # Initialize empty metadata if not provided
            if metadata is None:
                metadata = {}
            
            # Store content in vector store
            vector_result = await self.vector_store.store_text(content, memory_id, metadata)
            
            # Store metadata in metadata store
            metadata_result = await self.metadata_store.store_metadata(
                content=content,
                category=category,
                source_type=source_type,
                source_id=source_id,
                importance=importance,
                metadata=metadata
            )
            
            # Combine results
            result = {
                "id": memory_id,
                "content": content,
                "category": category,
                "source_type": source_type,
                "source_id": str(source_id) if source_id else None,
                "importance": importance,
                "metadata": metadata,
                "created_at": datetime.now().isoformat()
            }
            
            # Publish event
            event_bus.publish("memory:stored", {
                "memory_id": memory_id,
                "category": category,
                "source_type": source_type,
                "source_id": str(source_id) if source_id else None
            })
            
            return result
        except Exception as e:
            logger.error(f"Error storing memory: {str(e)}")
            raise
    
    async def batch_store_memory(self, memory_items: List[Dict]) -> List[Dict]:
        """
        Stores multiple memory items in a batch for efficiency.
        
        Args:
            memory_items: List of memory item dictionaries with required fields
            
        Returns:
            List of stored memory items with IDs
            
        Raises:
            ValueError: If any category is invalid
        """
        try:
            results = []
            
            # Validate categories
            for item in memory_items:
                if "category" not in item or not validate_memory_category(item["category"]):
                    raise ValueError(f"Invalid or missing category in item: {item}")
            
            # Prepare lists for batch vector storage
            contents = []
            ids = []
            metadatas = []
            
            for item in memory_items:
                contents.append(item["content"])
                # Generate ID if not provided
                item_id = item.get("id") or str(uuid.uuid4())
                ids.append(item_id)
                # Get or initialize metadata
                item_metadata = item.get("metadata") or {}
                metadatas.append(item_metadata)
            
            # Store vectors in batch
            vector_results = await self.vector_store.batch_store_text(contents, ids, metadatas)
            
            # Store metadata in batch
            metadata_results = await self.metadata_store.batch_store_metadata(memory_items)
            
            # Combine results
            for i, item in enumerate(memory_items):
                if i < len(vector_results) and i < len(metadata_results):
                    result = {
                        "id": ids[i],
                        "content": item["content"],
                        "category": item["category"],
                        "source_type": item.get("source_type"),
                        "source_id": item.get("source_id"),
                        "importance": item.get("importance", 1),
                        "metadata": item.get("metadata", {}),
                        "created_at": datetime.now().isoformat()
                    }
                    results.append(result)
            
            # Publish event
            event_bus.publish("memory:batch_stored", {
                "count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error batch storing memory: {str(e)}")
            raise
    
    async def get_memory(self, memory_id: uuid.UUID) -> Optional[Dict]:
        """
        Retrieves a memory item by its ID.
        
        Args:
            memory_id: ID of the memory item
            
        Returns:
            Memory item or None if not found
        """
        try:
            # Get vector data
            vector_data = await self.vector_store.get_vector(str(memory_id))
            
            # Get metadata
            metadata = await self.metadata_store.get_metadata(memory_id)
            
            # Return None if either is missing
            if not vector_data or not metadata:
                return None
            
            # Combine data
            result = metadata.copy()
            result["content"] = vector_data.get("text", "")
            
            return result
        except Exception as e:
            logger.error(f"Error retrieving memory {memory_id}: {str(e)}")
            return None
    
    async def update_memory(self, memory_id: uuid.UUID, updates: Dict) -> Optional[Dict]:
        """
        Updates an existing memory item.
        
        Args:
            memory_id: ID of the memory item to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated memory item or None if not found
            
        Raises:
            ValueError: If the category is invalid
        """
        try:
            # Validate category if provided
            if "category" in updates and not validate_memory_category(updates["category"]):
                raise ValueError(f"Invalid memory category: {updates['category']}")
            
            # Extract content update if present
            content_update = None
            if "content" in updates:
                content_update = updates["content"]
            
            # Extract metadata updates
            metadata_updates = {k: v for k, v in updates.items() if k != "content"}
            
            # Update vector if content changed
            if content_update is not None:
                await self.vector_store.update_vector(str(memory_id), content_update)
            
            # Update metadata
            metadata_result = await self.metadata_store.update_metadata(memory_id, metadata_updates)
            
            # Return None if update failed
            if not metadata_result:
                return None
            
            # Get updated memory item
            updated_memory = await self.get_memory(memory_id)
            
            # Publish event
            if updated_memory:
                event_bus.publish("memory:updated", {
                    "memory_id": str(memory_id)
                })
            
            return updated_memory
        except Exception as e:
            logger.error(f"Error updating memory {memory_id}: {str(e)}")
            return None
    
    async def delete_memory(self, memory_id: uuid.UUID) -> bool:
        """
        Deletes a memory item by its ID.
        
        Args:
            memory_id: ID of the memory item to delete
            
        Returns:
            True if successful, False if not found
        """
        try:
            # Delete from vector store
            vector_deleted = await self.vector_store.delete_vector(str(memory_id))
            
            # Delete from metadata store
            metadata_deleted = await self.metadata_store.delete_metadata(memory_id)
            
            # Publish event
            if vector_deleted and metadata_deleted:
                event_bus.publish("memory:deleted", {
                    "memory_id": str(memory_id)
                })
            
            # Return True only if both deletions were successful
            return vector_deleted and metadata_deleted
        except Exception as e:
            logger.error(f"Error deleting memory {memory_id}: {str(e)}")
            return False
    
    async def search_by_content(self, query: str, filters: Optional[Dict] = None, 
                               limit: Optional[int] = None) -> List[Dict]:
        """
        Searches for memory items by content similarity.
        
        Args:
            query: Text query to search for
            filters: Optional metadata filters
            limit: Maximum number of results to return
            
        Returns:
            List of memory items sorted by relevance
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_SEARCH_LIMIT
            
            # Set default filters if not provided
            if filters is None:
                filters = {}
            
            # Search vector store with increased limit to account for filtering
            vector_results = await self.vector_store.search_by_text(query, filters, limit * 2)
            
            # Get full memory items for each result
            results = []
            for vector_result in vector_results:
                memory_id = vector_result.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        # Include relevance score
                        memory_item["relevance"] = vector_result.get("score", 0.0)
                        results.append(memory_item)
            
            # Limit results to requested limit
            results = results[:limit]
            
            # Publish event
            event_bus.publish("memory:searched", {
                "query": query,
                "filter_count": len(filters),
                "result_count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error searching by content: {str(e)}")
            return []
    
    async def search_by_vector(self, query_vector: List[float], filters: Optional[Dict] = None,
                              limit: Optional[int] = None) -> List[Dict]:
        """
        Searches for memory items using a vector embedding.
        
        Args:
            query_vector: Vector embedding to search for
            filters: Optional metadata filters
            limit: Maximum number of results to return
            
        Returns:
            List of memory items sorted by relevance
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_SEARCH_LIMIT
            
            # Set default filters if not provided
            if filters is None:
                filters = {}
            
            # Search vector store with increased limit to account for filtering
            vector_results = await self.vector_store.search_by_vector(query_vector, filters, limit * 2)
            
            # Get full memory items for each result
            results = []
            for vector_result in vector_results:
                memory_id = vector_result.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        # Include relevance score
                        memory_item["relevance"] = vector_result.get("score", 0.0)
                        results.append(memory_item)
            
            # Limit results to requested limit
            results = results[:limit]
            
            # Publish event
            event_bus.publish("memory:vector_searched", {
                "filter_count": len(filters),
                "result_count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error searching by vector: {str(e)}")
            return []
    
    async def search_by_metadata(self, filters: Dict, limit: Optional[int] = None,
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
                limit = DEFAULT_SEARCH_LIMIT
            
            if offset is None:
                offset = 0
            
            # Search metadata store
            metadata_results = await self.metadata_store.search_metadata(filters, limit, offset)
            
            # Get full memory items with vector data
            results = []
            for metadata_result in metadata_results:
                memory_id = metadata_result.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        results.append(memory_item)
            
            # Publish event
            event_bus.publish("memory:metadata_searched", {
                "filter_count": len(filters),
                "result_count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error searching by metadata: {str(e)}")
            return []
    
    async def hybrid_search(self, query: str, filters: Dict, limit: Optional[int] = None) -> List[Dict]:
        """
        Performs a hybrid search using both content similarity and metadata filters.
        
        Args:
            query: Text query to search for
            filters: Metadata filters to apply
            limit: Maximum number of results to return
            
        Returns:
            List of memory items from combined search
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_SEARCH_LIMIT
            
            # Perform both searches with increased limits
            vector_results = await self.search_by_content(query, filters, limit * 2)
            metadata_results = await self.search_by_metadata(filters, limit * 2)
            
            # Merge results
            merged_results = merge_search_results(vector_results, metadata_results)
            
            # Sort by relevance if available
            merged_results.sort(key=lambda x: x.get("relevance", 0.0), reverse=True)
            
            # Limit to requested size
            results = merged_results[:limit]
            
            # Publish event
            event_bus.publish("memory:hybrid_searched", {
                "query": query,
                "filter_count": len(filters),
                "result_count": len(results)
            })
            
            return results
        except Exception as e:
            logger.error(f"Error performing hybrid search: {str(e)}")
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
            
            # Get memory items from metadata store
            memory_items = await self.metadata_store.get_by_category(category, limit, offset)
            
            # Get full memory items with vector data
            results = []
            for item in memory_items:
                memory_id = item.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        results.append(memory_item)
            
            return results
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
            # Get memory items from metadata store
            memory_items = await self.metadata_store.get_by_source(source_type, source_id, limit, offset)
            
            # Get full memory items with vector data
            results = []
            for item in memory_items:
                memory_id = item.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        results.append(memory_item)
            
            return results
        except Exception as e:
            logger.error(f"Error retrieving memory items by source {source_type}/{source_id}: {str(e)}")
            return []
    
    async def get_recent_memories(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieves the most recent memory items.
        
        Args:
            limit: Maximum number of items to return
            
        Returns:
            List of recent memory items
        """
        try:
            # Get recent memory items from metadata store
            memory_items = await self.metadata_store.get_recent_memories(limit)
            
            # Get full memory items with vector data
            results = []
            for item in memory_items:
                memory_id = item.get("id")
                if memory_id:
                    memory_item = await self.get_memory(uuid.UUID(memory_id))
                    if memory_item:
                        results.append(memory_item)
            
            return results
        except Exception as e:
            logger.error(f"Error retrieving recent memory items: {str(e)}")
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
            return await self.metadata_store.count_memories(filters)
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
            return await self.metadata_store.count_by_category()
        except Exception as e:
            logger.error(f"Error counting memory items by category: {str(e)}")
            return {}
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding for the given text.
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector
        """
        try:
            return await self.vector_store.generate_embedding(text)
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise
    
    async def create_backup(self, backup_path: str) -> bool:
        """
        Creates a backup of the memory storage.
        
        Args:
            backup_path: Path where the backup will be created
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Create backup directories
            vector_backup_dir = os.path.join(backup_path, "vector")
            metadata_backup_dir = os.path.join(backup_path, "metadata")
            os.makedirs(vector_backup_dir, exist_ok=True)
            os.makedirs(metadata_backup_dir, exist_ok=True)
            
            # Create backups
            vector_result = await self.vector_store.create_backup(vector_backup_dir)
            metadata_result = await self.metadata_store.sqlite_db.create_backup(
                os.path.join(metadata_backup_dir, "metadata.db")
            )
            
            # Publish event
            if vector_result and metadata_result:
                event_bus.publish("memory:backup_created", {
                    "backup_path": backup_path
                })
            
            return vector_result and metadata_result
        except Exception as e:
            logger.error(f"Error creating memory backup: {str(e)}")
            return False
    
    async def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restores memory storage from a backup.
        
        Args:
            backup_path: Path to the backup
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Verify backup directories
            vector_backup_dir = os.path.join(backup_path, "vector")
            metadata_backup_path = os.path.join(backup_path, "metadata", "metadata.db")
            
            if not os.path.exists(vector_backup_dir) or not os.path.exists(metadata_backup_path):
                logger.error(f"Invalid backup at {backup_path}")
                return False
            
            # Restore backups
            vector_result = await self.vector_store.restore_from_backup(vector_backup_dir)
            metadata_result = await self.metadata_store.sqlite_db.restore_from_backup(metadata_backup_path)
            
            # Publish event
            if vector_result and metadata_result:
                event_bus.publish("memory:backup_restored", {
                    "backup_path": backup_path
                })
            
            return vector_result and metadata_result
        except Exception as e:
            logger.error(f"Error restoring memory from backup: {str(e)}")
            return False
    
    async def optimize(self) -> bool:
        """
        Optimizes the memory storage for better performance.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Optimize vector store
            vector_result = await self.vector_store.optimize()
            
            # Optimize metadata store
            metadata_result = await self.metadata_store.sqlite_db.optimize_database()
            
            # Publish event
            if vector_result and metadata_result:
                event_bus.publish("memory:storage_optimized", {})
            
            return vector_result and metadata_result
        except Exception as e:
            logger.error(f"Error optimizing memory storage: {str(e)}")
            return False