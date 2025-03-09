import os
import logging
import uuid
import typing
import json
import shutil
from typing import List, Dict, Optional, Any

import numpy as np
import chromadb  # v0.4.18

from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..database.models import VectorEmbedding

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Constants
DEFAULT_COLLECTION_NAME = "memory"
DEFAULT_PERSIST_DIRECTORY = settings.get('memory.vector_db_path', 'data/vector_db')
DEFAULT_DISTANCE_FUNCTION = "cosine"

def create_backup(db_path: str, backup_path: str) -> bool:
    """
    Creates a backup of the vector database.
    
    Args:
        db_path: Path to the database directory
        backup_path: Path where the backup will be created
    
    Returns:
        True if backup was successful, False otherwise
    """
    try:
        if not os.path.exists(db_path):
            logger.error(f"Database directory {db_path} does not exist")
            return False
        
        # Create backup directory if it doesn't exist
        os.makedirs(os.path.dirname(backup_path), exist_ok=True)
        
        # Use shutil to copy the database directory to the backup location
        shutil.copytree(db_path, backup_path, dirs_exist_ok=True)
        
        logger.info(f"Created backup of vector database from {db_path} to {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to create backup: {str(e)}")
        return False

def restore_from_backup(backup_path: str, db_path: str) -> bool:
    """
    Restores the vector database from a backup.
    
    Args:
        backup_path: Path to the backup directory
        db_path: Path where the database will be restored
    
    Returns:
        True if restore was successful, False otherwise
    """
    try:
        if not os.path.exists(backup_path):
            logger.error(f"Backup directory {backup_path} does not exist")
            return False
        
        # Remove existing database directory if it exists
        if os.path.exists(db_path):
            shutil.rmtree(db_path)
        
        # Create database directory
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Use shutil to copy the backup directory to the database location
        shutil.copytree(backup_path, db_path, dirs_exist_ok=True)
        
        logger.info(f"Restored vector database from {backup_path} to {db_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to restore from backup: {str(e)}")
        return False

class VectorDatabase:
    """
    Interface for vector database operations using ChromaDB.
    """
    
    def __init__(self, persist_directory: Optional[str] = None, 
                 collection_name: Optional[str] = None, 
                 distance_function: Optional[str] = None):
        """
        Initializes the vector database with ChromaDB.
        
        Args:
            persist_directory: Directory where the database will be stored
            collection_name: Name of the collection to use
            distance_function: Distance function for similarity search
        """
        self.persist_directory = persist_directory or DEFAULT_PERSIST_DIRECTORY
        self.collection_name = collection_name or DEFAULT_COLLECTION_NAME
        self.distance_function = distance_function or DEFAULT_DISTANCE_FUNCTION
        
        # Create directory if it doesn't exist
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": self.distance_function}
        )
        
        logger.info(f"Initialized vector database at {self.persist_directory} with collection {self.collection_name}")
    
    async def add_embedding(self, id: str, vector: List[float], metadata: Dict, text: str) -> bool:
        """
        Adds a vector embedding to the database.
        
        Args:
            id: Unique identifier for the embedding
            vector: Vector representation
            metadata: Additional metadata
            text: Text content associated with the vector
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate inputs
            if not id or not vector or not text:
                logger.error("Invalid inputs for add_embedding")
                return False
            
            # Convert metadata to JSON-serializable format if needed
            metadata_json = json.loads(json.dumps(metadata))
            
            # Add embedding to collection
            self.collection.add(
                ids=[id],
                embeddings=[vector],
                metadatas=[metadata_json],
                documents=[text]
            )
            
            logger.info(f"Added embedding {id} to vector database")
            
            # Publish event
            event_bus.publish("vector:added", {
                "id": id,
                "collection": self.collection_name,
                "metadata": metadata
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to add embedding: {str(e)}")
            return False
    
    async def batch_add_embeddings(self, ids: List[str], vectors: List[List[float]], 
                                  metadatas: List[Dict], texts: List[str]) -> bool:
        """
        Adds multiple vector embeddings in batch.
        
        Args:
            ids: List of unique identifiers
            vectors: List of vector representations
            metadatas: List of metadata dictionaries
            texts: List of text contents
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate inputs
            if len(ids) != len(vectors) or len(vectors) != len(metadatas) or len(metadatas) != len(texts):
                logger.error("Input lists must have the same length for batch_add_embeddings")
                return False
            
            if not ids:
                logger.warning("Empty batch for batch_add_embeddings")
                return True
            
            # Convert metadatas to JSON-serializable format if needed
            metadatas_json = [json.loads(json.dumps(m)) for m in metadatas]
            
            # Add embeddings to collection
            self.collection.add(
                ids=ids,
                embeddings=vectors,
                metadatas=metadatas_json,
                documents=texts
            )
            
            logger.info(f"Added {len(ids)} embeddings in batch to vector database")
            
            # Publish event
            event_bus.publish("vector:batch_added", {
                "count": len(ids),
                "collection": self.collection_name
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to add embeddings in batch: {str(e)}")
            return False
    
    async def update_embedding(self, id: str, vector: Optional[List[float]] = None, 
                              metadata: Optional[Dict] = None, text: Optional[str] = None) -> bool:
        """
        Updates an existing vector embedding.
        
        Args:
            id: Unique identifier for the embedding
            vector: Optional new vector representation
            metadata: Optional new metadata
            text: Optional new text content
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # At least one of vector, metadata, or text must be provided
            if vector is None and metadata is None and text is None:
                logger.error("At least one of vector, metadata, or text must be provided for update_embedding")
                return False
            
            # Check if embedding exists
            result = self.collection.get(ids=[id], include=[])
            if not result["ids"]:
                logger.error(f"Embedding {id} not found for update")
                return False
            
            # Prepare update parameters
            update_kwargs = {}
            
            if vector is not None:
                update_kwargs["embeddings"] = [vector]
            
            if metadata is not None:
                # Convert metadata to JSON-serializable format if needed
                metadata_json = json.loads(json.dumps(metadata))
                update_kwargs["metadatas"] = [metadata_json]
            
            if text is not None:
                update_kwargs["documents"] = [text]
            
            # Update embedding
            self.collection.update(
                ids=[id],
                **update_kwargs
            )
            
            logger.info(f"Updated embedding {id} in vector database")
            
            # Publish event
            event_bus.publish("vector:updated", {
                "id": id,
                "collection": self.collection_name,
                "updated_fields": list(update_kwargs.keys())
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to update embedding: {str(e)}")
            return False
    
    async def delete_embedding(self, id: str) -> bool:
        """
        Deletes a vector embedding by ID.
        
        Args:
            id: Unique identifier for the embedding to delete
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Delete embedding
            self.collection.delete(ids=[id])
            
            logger.info(f"Deleted embedding {id} from vector database")
            
            # Publish event
            event_bus.publish("vector:deleted", {
                "id": id,
                "collection": self.collection_name
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete embedding: {str(e)}")
            return False
    
    async def get_embedding(self, id: str) -> Optional[Dict]:
        """
        Retrieves a vector embedding by ID.
        
        Args:
            id: Unique identifier for the embedding
        
        Returns:
            Embedding data or None if not found
        """
        try:
            # Get embedding
            result = self.collection.get(
                ids=[id],
                include=["embeddings", "metadatas", "documents"]
            )
            
            # Check if embedding was found
            if not result["ids"]:
                logger.warning(f"Embedding {id} not found")
                return None
            
            # Format result
            embedding_data = {
                "id": result["ids"][0],
                "vector": result["embeddings"][0],
                "metadata": result["metadatas"][0],
                "text": result["documents"][0]
            }
            
            return embedding_data
        except Exception as e:
            logger.error(f"Failed to get embedding: {str(e)}")
            return None
    
    async def search_similar(self, query_vector: List[float], limit: Optional[int] = None, 
                            filters: Optional[Dict] = None) -> List[Dict]:
        """
        Searches for similar vectors using a query vector.
        
        Args:
            query_vector: Vector to search for
            limit: Maximum number of results to return
            filters: Optional metadata filters
        
        Returns:
            List of similar items with scores
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = 10
            
            # Convert filters to ChromaDB format if provided
            where = filters if filters else None
            
            # Query collection
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=limit,
                where=where,
                include=["metadatas", "documents", "distances"]
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results["ids"][0])):
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "text": results["documents"][0][i],
                    "score": 1.0 - results["distances"][0][i]  # Convert distance to similarity score
                })
            
            logger.info(f"Found {len(formatted_results)} similar vectors")
            
            # Publish event
            event_bus.publish("vector:searched", {
                "query_type": "vector",
                "result_count": len(formatted_results),
                "collection": self.collection_name
            })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Failed to search similar vectors: {str(e)}")
            return []
    
    async def search_by_text(self, query_text: str, limit: Optional[int] = None, 
                            filters: Optional[Dict] = None) -> List[Dict]:
        """
        Searches for similar items using text query and embedding generation.
        
        Args:
            query_text: Text to search for
            limit: Maximum number of results to return
            filters: Optional metadata filters
        
        Returns:
            List of similar items with scores
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = 10
            
            # Convert filters to ChromaDB format if provided
            where = filters if filters else None
            
            # Query collection
            results = self.collection.query(
                query_texts=[query_text],
                n_results=limit,
                where=where,
                include=["metadatas", "documents", "distances"]
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results["ids"][0])):
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "text": results["documents"][0][i],
                    "score": 1.0 - results["distances"][0][i]  # Convert distance to similarity score
                })
            
            logger.info(f"Found {len(formatted_results)} items matching text query")
            
            # Publish event
            event_bus.publish("vector:text_searched", {
                "query_type": "text",
                "result_count": len(formatted_results),
                "collection": self.collection_name
            })
            
            return formatted_results
        except Exception as e:
            logger.error(f"Failed to search by text: {str(e)}")
            return []
    
    async def count_embeddings(self, filters: Optional[Dict] = None) -> int:
        """
        Counts the number of embeddings in the collection.
        
        Args:
            filters: Optional metadata filters
        
        Returns:
            Number of embeddings
        """
        try:
            # Convert filters to ChromaDB format if provided
            where = filters if filters else None
            
            # Get count
            count = self.collection.count(where=where)
            
            return count
        except Exception as e:
            logger.error(f"Failed to count embeddings: {str(e)}")
            return 0
    
    async def create_backup(self, backup_path: str) -> bool:
        """
        Creates a backup of the vector database.
        
        Args:
            backup_path: Path where the backup will be created
        
        Returns:
            True if successful, False otherwise
        """
        try:
            result = create_backup(self.persist_directory, backup_path)
            
            if result:
                # Publish event
                event_bus.publish("vector:backup_created", {
                    "backup_path": backup_path,
                    "collection": self.collection_name
                })
            
            return result
        except Exception as e:
            logger.error(f"Failed to create backup: {str(e)}")
            return False
    
    async def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restores the vector database from a backup.
        
        Args:
            backup_path: Path to the backup directory
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Close client to release resources
            self.client.close()
            
            # Restore from backup
            result = restore_from_backup(backup_path, self.persist_directory)
            
            if result:
                # Reinitialize client and collection
                self.client = chromadb.PersistentClient(path=self.persist_directory)
                self.collection = self.client.get_collection(self.collection_name)
                
                # Publish event
                event_bus.publish("vector:backup_restored", {
                    "backup_path": backup_path,
                    "collection": self.collection_name
                })
            
            return result
        except Exception as e:
            logger.error(f"Failed to restore from backup: {str(e)}")
            
            # Try to reinitialize client and collection regardless of error
            try:
                self.client = chromadb.PersistentClient(path=self.persist_directory)
                self.collection = self.client.get_collection(self.collection_name)
            except Exception as inner_e:
                logger.error(f"Failed to reinitialize client after restore failure: {str(inner_e)}")
            
            return False
    
    async def optimize_database(self) -> bool:
        """
        Optimizes the vector database for better performance.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # ChromaDB doesn't have explicit optimization commands
            # This is a placeholder for future optimizations
            
            logger.info(f"Optimized vector database")
            
            # Publish event
            event_bus.publish("vector:optimized", {
                "collection": self.collection_name
            })
            
            return True
        except Exception as e:
            logger.error(f"Failed to optimize database: {str(e)}")
            return False
    
    async def close(self) -> bool:
        """
        Closes the vector database connection.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Persist changes and close client
            self.client.close()
            
            logger.info(f"Closed vector database connection")
            return True
        except Exception as e:
            logger.error(f"Failed to close database connection: {str(e)}")
            return False

class ChromaVectorDatabase(VectorDatabase):
    """
    ChromaDB implementation of the vector database interface.
    """
    
    def __init__(self, persist_directory: Optional[str] = None, 
                 collection_name: Optional[str] = None, 
                 distance_function: Optional[str] = None):
        """
        Initializes the ChromaDB vector database.
        
        Args:
            persist_directory: Directory where the database will be stored
            collection_name: Name of the collection to use
            distance_function: Distance function for similarity search
        """
        super().__init__(persist_directory, collection_name, distance_function)
        logger.info(f"Using ChromaDB backend for vector database")