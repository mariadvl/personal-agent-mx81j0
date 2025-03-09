import logging
import uuid
from typing import List, Dict, Optional, Union, Any

import asyncio

from ..database.vector_db import VectorDatabase
from ..database.models import VectorEmbedding
from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..utils.embeddings import generate_embedding, batch_generate_embeddings, get_embedding_model

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Constants
DEFAULT_SEARCH_LIMIT = settings.get('memory.search_limit', 50)

class VectorStore:
    """
    Manages the storage and retrieval of vector embeddings for semantic search
    """
    
    def __init__(self, vector_db: VectorDatabase, use_local_embeddings: Optional[bool] = None):
        """
        Initializes the vector store with a vector database
        
        Args:
            vector_db: Vector database to use for storage
            use_local_embeddings: Whether to use local embedding models instead of API
        """
        self.vector_db = vector_db
        self.use_local_embeddings = use_local_embeddings if use_local_embeddings is not None else settings.get('llm.use_local_embeddings', False)
        self.embedding_model = get_embedding_model(self.use_local_embeddings)
        
        logger.info(f"VectorStore initialized with model: {self.embedding_model}, use_local_embeddings: {self.use_local_embeddings}")

    async def store_text(self, text: str, id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Stores text content as a vector embedding
        
        Args:
            text: Text content to store
            id: Unique identifier for the vector
            metadata: Additional metadata to store with the vector
            
        Returns:
            Dictionary containing the stored vector data
        """
        try:
            # Generate embedding for the text
            embedding = await self.generate_embedding(text)
            
            # Set default metadata if not provided
            if metadata is None:
                metadata = {}
            
            # Add embedding model information to metadata
            metadata["embedding_model"] = self.embedding_model
            
            # Store the embedding in the vector database
            success = await self.vector_db.add_embedding(id, embedding, metadata, text)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:stored", {
                    "id": id,
                    "text_length": len(text),
                    "embedding_model": self.embedding_model
                })
                
                # Return the stored vector data
                return {
                    "id": id,
                    "text": text,
                    "metadata": metadata
                }
            else:
                logger.error(f"Failed to store vector with id: {id}")
                return {}
                
        except Exception as e:
            logger.error(f"Error storing text as vector: {str(e)}")
            raise

    async def batch_store_text(self, texts: List[str], ids: List[str], metadatas: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """
        Stores multiple text items as vector embeddings in batch
        
        Args:
            texts: List of text contents to store
            ids: List of unique identifiers for the vectors
            metadatas: List of metadata dictionaries to store with the vectors
            
        Returns:
            List of dictionaries containing the stored vector data
        """
        try:
            # Validate inputs
            if len(texts) != len(ids):
                raise ValueError("Texts and ids must have the same length")
            
            # Set default metadatas if not provided
            if metadatas is None:
                metadatas = [{} for _ in range(len(texts))]
            elif len(metadatas) != len(texts):
                raise ValueError("Metadatas must have the same length as texts and ids")
            
            # Generate embeddings for all texts
            embeddings = await asyncio.to_thread(
                batch_generate_embeddings,
                texts, 
                self.embedding_model,
                self.use_local_embeddings
            )
            
            # Add embedding model information to each metadata
            for metadata in metadatas:
                metadata["embedding_model"] = self.embedding_model
            
            # Store the embeddings in the vector database
            success = await self.vector_db.batch_add_embeddings(ids, embeddings, metadatas, texts)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:batch_stored", {
                    "count": len(texts),
                    "embedding_model": self.embedding_model
                })
                
                # Return the stored vector data
                return [
                    {
                        "id": id,
                        "text": text,
                        "metadata": metadata
                    }
                    for id, text, metadata in zip(ids, texts, metadatas)
                ]
            else:
                logger.error(f"Failed to store batch of {len(texts)} vectors")
                return []
                
        except Exception as e:
            logger.error(f"Error batch storing texts as vectors: {str(e)}")
            raise

    async def update_vector(self, id: str, text: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Updates an existing vector embedding
        
        Args:
            id: Unique identifier of the vector to update
            text: New text content (if updating text)
            metadata: New or updated metadata (if updating metadata)
            
        Returns:
            Updated vector data or empty dict if update failed
        """
        try:
            # Validate that at least one of text or metadata is provided
            if text is None and metadata is None:
                raise ValueError("At least one of text or metadata must be provided")
            
            # Prepare update parameters
            update_args = {}
            
            if text is not None:
                # Generate new embedding for the text
                embedding = await self.generate_embedding(text)
                update_args["vector"] = embedding
                update_args["text"] = text
            
            if metadata is not None:
                # Ensure metadata is a dictionary
                if not isinstance(metadata, dict):
                    metadata = dict(metadata)
                
                # Add embedding model information if not present
                if "embedding_model" not in metadata and text is not None:
                    metadata["embedding_model"] = self.embedding_model
                
                update_args["metadata"] = metadata
            
            # Update the embedding in the vector database
            success = await self.vector_db.update_embedding(id, **update_args)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:updated", {
                    "id": id,
                    "updated_text": text is not None,
                    "updated_metadata": metadata is not None
                })
                
                # Get the updated vector
                return await self.get_vector(id) or {}
            else:
                logger.error(f"Failed to update vector with id: {id}")
                return {}
                
        except Exception as e:
            logger.error(f"Error updating vector: {str(e)}")
            raise

    async def delete_vector(self, id: str) -> bool:
        """
        Deletes a vector embedding by ID
        
        Args:
            id: Unique identifier of the vector to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Delete the embedding from the vector database
            success = await self.vector_db.delete_embedding(id)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:deleted", {
                    "id": id
                })
                
                return True
            else:
                logger.error(f"Failed to delete vector with id: {id}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting vector: {str(e)}")
            raise

    async def search_by_text(self, query_text: str, filters: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Searches for similar vectors using a text query
        
        Args:
            query_text: Text to search for
            filters: Optional metadata filters
            limit: Maximum number of results to return
            
        Returns:
            List of similar items with scores
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_SEARCH_LIMIT
                
            # Set default filters if not provided
            if filters is None:
                filters = {}
                
            # Search the vector database by text
            results = await self.vector_db.search_by_text(query_text, limit, filters)
            
            # Publish an event for monitoring
            event_bus.publish("vector:text_searched", {
                "query_length": len(query_text),
                "result_count": len(results),
                "filter_count": len(filters)
            })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching by text: {str(e)}")
            raise

    async def search_by_vector(self, query_vector: List[float], filters: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Searches for similar vectors using a vector embedding
        
        Args:
            query_vector: Vector embedding to search for
            filters: Optional metadata filters
            limit: Maximum number of results to return
            
        Returns:
            List of similar items with scores
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_SEARCH_LIMIT
                
            # Set default filters if not provided
            if filters is None:
                filters = {}
                
            # Search the vector database by vector
            results = await self.vector_db.search_similar(query_vector, limit, filters)
            
            # Publish an event for monitoring
            event_bus.publish("vector:vector_searched", {
                "vector_dimension": len(query_vector),
                "result_count": len(results),
                "filter_count": len(filters)
            })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching by vector: {str(e)}")
            raise

    async def get_vector(self, id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a vector embedding by ID
        
        Args:
            id: Unique identifier of the vector
            
        Returns:
            Vector data or None if not found
        """
        try:
            # Get the embedding from the vector database
            return await self.vector_db.get_embedding(id)
                
        except Exception as e:
            logger.error(f"Error getting vector: {str(e)}")
            raise

    async def count_vectors(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Counts the number of vector embeddings
        
        Args:
            filters: Optional metadata filters
            
        Returns:
            Number of vector embeddings
        """
        try:
            # Set default filters if not provided
            if filters is None:
                filters = {}
                
            # Count embeddings in the vector database
            return await self.vector_db.count_embeddings(filters)
                
        except Exception as e:
            logger.error(f"Error counting vectors: {str(e)}")
            raise

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding vector for the given text
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            Embedding vector
        """
        try:
            # Generate embedding using the embeddings utility
            return await asyncio.to_thread(
                generate_embedding, 
                text, 
                self.embedding_model,
                self.use_local_embeddings
            )
                
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            raise

    async def create_backup(self, backup_path: str) -> bool:
        """
        Creates a backup of the vector store
        
        Args:
            backup_path: Path where the backup will be created
            
        Returns:
            True if backup was successful, False otherwise
        """
        try:
            # Create a backup of the vector database
            success = await self.vector_db.create_backup(backup_path)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:backup_created", {
                    "backup_path": backup_path
                })
                
                return True
            else:
                logger.error(f"Failed to create backup at path: {backup_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating backup: {str(e)}")
            raise

    async def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restores the vector store from a backup
        
        Args:
            backup_path: Path to the backup
            
        Returns:
            True if restore was successful, False otherwise
        """
        try:
            # Restore the vector database from a backup
            success = await self.vector_db.restore_from_backup(backup_path)
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:backup_restored", {
                    "backup_path": backup_path
                })
                
                return True
            else:
                logger.error(f"Failed to restore from backup at path: {backup_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error restoring from backup: {str(e)}")
            raise

    async def optimize(self) -> bool:
        """
        Optimizes the vector store for better performance
        
        Returns:
            True if optimization was successful, False otherwise
        """
        try:
            # Optimize the vector database
            success = await self.vector_db.optimize_database()
            
            if success:
                # Publish an event for monitoring
                event_bus.publish("vector:optimized", {})
                
                return True
            else:
                logger.error("Failed to optimize vector database")
                return False
                
        except Exception as e:
            logger.error(f"Error optimizing vector database: {str(e)}")
            raise