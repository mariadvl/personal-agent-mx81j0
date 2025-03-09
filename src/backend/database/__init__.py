"""
Initializes the database package for the Personal AI Agent, providing a unified interface
to access both the SQLite relational database and ChromaDB vector database components.
This file exports the main database classes and utility functions for use throughout the application.
"""

import os
import logging
from datetime import datetime
from pathlib import Path

from .sqlite_db import SQLiteDatabase, create_backup as sqlite_create_backup, restore_from_backup as sqlite_restore
from .vector_db import VectorDatabase, DEFAULT_COLLECTION_NAME, create_backup as vector_create_backup, restore_from_backup as vector_restore
from .models import (
    Base, Conversation, Message, MemoryItem, Document, DocumentChunk,
    WebPage, WebContentChunk, UserSettings, VectorEmbedding
)

# Configure logger
logger = logging.getLogger(__name__)

# Export all needed classes and functions
__all__ = [
    "SQLiteDatabase", "VectorDatabase", "Base",
    "Conversation", "Message", "MemoryItem", "Document", "DocumentChunk",
    "WebPage", "WebContentChunk", "UserSettings", "VectorEmbedding",
    "DEFAULT_COLLECTION_NAME", "initialize_databases",
    "create_database_backup", "restore_database_backup"
]


def initialize_databases(sqlite_path, vector_db_path, enable_encryption=True, sqlite_pragmas=None):
    """
    Initializes both SQLite and Vector databases with the provided paths and settings.
    
    Args:
        sqlite_path (str): Path to the SQLite database file
        vector_db_path (str): Path to the vector database directory
        enable_encryption (bool): Whether to enable encryption for sensitive data
        sqlite_pragmas (dict): Optional SQLite pragmas for fine-tuning
        
    Returns:
        tuple: Tuple containing (SQLiteDatabase, VectorDatabase) instances
    """
    try:
        # Initialize SQLite database
        sqlite_db = SQLiteDatabase(db_path=sqlite_path, encryption_enabled=enable_encryption)
        
        # Initialize Vector database
        vector_db = VectorDatabase(persist_directory=vector_db_path)
        
        logger.info(f"Initialized databases: SQLite at {sqlite_path}, Vector DB at {vector_db_path}")
        
        return sqlite_db, vector_db
    except Exception as e:
        logger.error(f"Error initializing databases: {str(e)}")
        raise


def create_database_backup(sqlite_db_path, vector_db_path, backup_dir):
    """
    Creates backups of both SQLite and Vector databases.
    
    Args:
        sqlite_db_path (str): Path to the SQLite database file
        vector_db_path (str): Path to the vector database directory
        backup_dir (str): Directory where backups will be stored
        
    Returns:
        bool: True if both backups were successful, False otherwise
    """
    try:
        # Create backup directory if it doesn't exist
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generate timestamp for backup filenames
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create SQLite database backup
        sqlite_backup_path = os.path.join(backup_dir, f"sqlite_backup_{timestamp}.db")
        sqlite_success = sqlite_create_backup(sqlite_db_path, sqlite_backup_path)
        
        # Create Vector database backup
        vector_backup_path = os.path.join(backup_dir, f"vector_backup_{timestamp}")
        vector_success = vector_create_backup(vector_db_path, vector_backup_path)
        
        if sqlite_success and vector_success:
            logger.info(f"Created database backups at {backup_dir}")
            return True
        else:
            logger.error("Failed to create one or more database backups")
            return False
    except Exception as e:
        logger.error(f"Error creating database backups: {str(e)}")
        return False


def restore_database_backup(sqlite_backup_path, vector_backup_path, sqlite_db_path, vector_db_path):
    """
    Restores both SQLite and Vector databases from backups.
    
    Args:
        sqlite_backup_path (str): Path to the SQLite database backup file
        vector_backup_path (str): Path to the vector database backup directory
        sqlite_db_path (str): Target path for the restored SQLite database
        vector_db_path (str): Target path for the restored vector database
        
    Returns:
        bool: True if both restores were successful, False otherwise
    """
    try:
        # Restore SQLite database
        sqlite_success = sqlite_restore(sqlite_backup_path, sqlite_db_path)
        
        # Restore Vector database
        vector_success = vector_restore(vector_backup_path, vector_db_path)
        
        if sqlite_success and vector_success:
            logger.info(f"Restored databases successfully")
            return True
        else:
            logger.error("Failed to restore one or more databases")
            return False
    except Exception as e:
        logger.error(f"Error restoring databases: {str(e)}")
        return False