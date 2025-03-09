import os
import sys
import argparse
import logging
from pathlib import Path
import asyncio

from ..database.models import Base, UserSettings
from ..database.sqlite_db import SQLiteDatabase
from ..database.vector_db import ChromaVectorDatabase
from ..config.settings import Settings
from ..utils.logging_setup import setup_logging
from ..utils.event_bus import EventBus

# Initialize logger, settings, and event bus
logger = logging.getLogger(__name__)
settings = Settings()
event_bus = EventBus()

def setup_argument_parser():
    """Sets up command-line argument parser for database initialization options."""
    parser = argparse.ArgumentParser(description="Initialize and set up database components for the Personal AI Agent")
    parser.add_argument("--sqlite-path", help="Path for SQLite database file")
    parser.add_argument("--vector-db-path", help="Path for vector database directory")
    parser.add_argument("--reset", action="store_true", help="Reset existing databases")
    parser.add_argument("--encryption", action="store_true", help="Enable encryption for sensitive data")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    return parser

async def initialize_sqlite_database(db_path, encryption_enabled, reset=False):
    """
    Initializes the SQLite database with schema and default settings.
    
    Args:
        db_path (str): Path for the SQLite database file
        encryption_enabled (bool): Whether to enable encryption for sensitive data
        reset (bool): Whether to reset an existing database
        
    Returns:
        SQLiteDatabase: Initialized SQLite database instance
    """
    logger.info(f"Initializing SQLite database at: {db_path}")
    
    # Convert to Path object for robust path handling
    db_path = Path(db_path)
    
    # If reset is True and the database file exists, delete it
    if reset and db_path.exists():
        logger.warning(f"Resetting SQLite database at: {db_path}")
        try:
            db_path.unlink()
        except Exception as e:
            logger.error(f"Failed to delete existing database file: {str(e)}")
            raise
    
    # Create database directory if it doesn't exist
    try:
        db_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create database directory: {str(e)}")
        raise
    
    try:
        # Create SQLiteDatabase instance with provided path and encryption setting
        db = SQLiteDatabase(db_path=str(db_path), encryption_enabled=encryption_enabled)
        
        # Create tables using SQLAlchemy Base metadata
        db.create_tables()
        
        # Create default user settings if they don't exist
        await create_default_user_settings(db)
        
        logger.info("SQLite database initialized successfully")
        event_bus.publish("database:sqlite:initialized", {"path": str(db_path)})
        
        return db
    except Exception as e:
        logger.error(f"SQLite database initialization failed: {str(e)}")
        raise

async def initialize_vector_database(db_path, reset=False):
    """
    Initializes the vector database for storing embeddings.
    
    Args:
        db_path (str): Path for the vector database directory
        reset (bool): Whether to reset an existing database
        
    Returns:
        ChromaVectorDatabase: Initialized vector database instance
    """
    logger.info(f"Initializing vector database at: {db_path}")
    
    # Convert to Path object for robust path handling
    db_path = Path(db_path)
    
    # If reset is True and the database directory exists, delete it
    if reset and db_path.exists():
        logger.warning(f"Resetting vector database at: {db_path}")
        try:
            import shutil
            shutil.rmtree(db_path)
        except Exception as e:
            logger.error(f"Failed to delete existing vector database directory: {str(e)}")
            raise
    
    # Create directory for vector database if it doesn't exist
    try:
        db_path.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.error(f"Failed to create vector database directory: {str(e)}")
        raise
    
    try:
        # Create ChromaVectorDatabase instance with provided path
        vector_db = ChromaVectorDatabase(persist_directory=str(db_path))
        
        logger.info("Vector database initialized successfully")
        event_bus.publish("database:vector:initialized", {"path": str(db_path)})
        
        return vector_db
    except Exception as e:
        logger.error(f"Vector database initialization failed: {str(e)}")
        raise

async def create_default_user_settings(db):
    """
    Creates default user settings in the database if they don't exist.
    
    Args:
        db (SQLiteDatabase): The SQLite database instance
        
    Returns:
        dict: User settings dictionary
    """
    try:
        # Get user settings from database
        user_settings = await db.get_user_settings()
        
        if user_settings:
            logger.info("User settings already exist, skipping creation")
        else:
            logger.info("Creating default user settings")
            # Create new default settings in the database
            user_settings = await db.update_user_settings(UserSettings().to_dict())
        
        return user_settings
    except Exception as e:
        logger.error(f"Failed to create default user settings: {str(e)}")
        raise

async def main():
    """
    Main function to initialize all database components.
    
    Returns:
        int: Exit code (0 for success, non-zero for failure)
    """
    # Parse command-line arguments
    parser = setup_argument_parser()
    args = parser.parse_args()
    
    # Setup logging with appropriate level
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level=log_level)
    
    logger.info("Starting database initialization")
    
    # Get database paths from arguments or settings
    sqlite_path = args.sqlite_path or settings.get('storage.database_path', 'data/personal_ai.db')
    vector_db_path = args.vector_db_path or settings.get('memory.vector_db_path', 'data/vector_db')
    
    try:
        # Initialize SQLite database
        db = await initialize_sqlite_database(
            db_path=sqlite_path,
            encryption_enabled=args.encryption,
            reset=args.reset
        )
        
        # Initialize vector database
        vector_db = await initialize_vector_database(
            db_path=vector_db_path,
            reset=args.reset
        )
        
        logger.info("Database initialization completed successfully")
        return 0  # Success exit code
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return 1  # Error exit code

def run():
    """Entry point function to run the script."""
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Database initialization interrupted by user")
        sys.exit(130)  # Standard exit code for SIGINT
    except Exception as e:
        logger.critical(f"Unhandled exception in database initialization: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run()