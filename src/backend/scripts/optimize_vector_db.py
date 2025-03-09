#!/usr/bin/env python3
"""
Vector Database Optimization Script

A command-line utility for optimizing the vector database used by the Personal AI Agent.
This script performs maintenance operations to improve search performance, reduce storage size,
and ensure data integrity.
"""

import os
import sys
import logging
import argparse
import datetime
import asyncio
from typing import Optional

from ..database.vector_db import VectorDatabase, ChromaVectorDatabase, create_backup
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Initialize logger, settings, and event bus
logger = logging.getLogger(__name__)
settings = Settings()
event_bus = EventBus()

# Constants
DEFAULT_VECTOR_DB_PATH = settings.get('memory.vector_db_path', 'data/vector_db')


def setup_logging():
    """
    Configures logging for the optimization script.
    """
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    
    log_level = settings.get('logging.level', 'INFO')
    logger.setLevel(getattr(logging, log_level))
    
    logger.addHandler(handler)
    
    logger.info("Logging configured for vector database optimization script")


def parse_arguments():
    """
    Parses command-line arguments for the optimization script.
    
    Returns:
        argparse.Namespace: Parsed command-line arguments
    """
    parser = argparse.ArgumentParser(
        description="Optimize the vector database for the Personal AI Agent"
    )
    
    parser.add_argument(
        "--db-path",
        type=str,
        default=DEFAULT_VECTOR_DB_PATH,
        help=f"Path to the vector database (default: {DEFAULT_VECTOR_DB_PATH})"
    )
    
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Create backup before optimization"
    )
    
    parser.add_argument(
        "--backup-path",
        type=str,
        default=None,
        help="Path for backup (default: <db_path>_backup_<timestamp>)"
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force optimization even if validation fails"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging"
    )
    
    return parser.parse_args()


def validate_vector_db(db_path: str) -> bool:
    """
    Validates that the vector database exists and is accessible.
    
    Args:
        db_path: Path to the vector database directory
        
    Returns:
        bool: True if database is valid and accessible
    """
    if not os.path.exists(db_path):
        logger.error(f"Vector database directory does not exist: {db_path}")
        return False
    
    # Check for required ChromaDB files
    required_files = ["chroma.sqlite3"]
    for file in required_files:
        if not os.path.exists(os.path.join(db_path, file)):
            logger.error(f"Missing required file {file} in vector database directory")
            return False
    
    logger.info(f"Vector database validated: {db_path}")
    return True


async def backup_vector_db(db_path: str, backup_path: Optional[str] = None) -> bool:
    """
    Creates a backup of the vector database before optimization.
    
    Args:
        db_path: Path to the vector database directory
        backup_path: Optional path for the backup
        
    Returns:
        bool: True if backup was successful
    """
    try:
        # Generate backup path with timestamp if not provided
        if not backup_path:
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = f"{db_path}_backup_{timestamp}"
        
        logger.info(f"Creating backup of vector database: {db_path} -> {backup_path}")
        
        # Create backup
        result = create_backup(db_path, backup_path)
        
        if result:
            logger.info(f"Backup created successfully: {backup_path}")
            event_bus.publish("backup:created", {
                "source_path": db_path,
                "backup_path": backup_path,
                "timestamp": datetime.datetime.now().isoformat()
            })
            return True
        else:
            logger.error("Backup creation failed")
            return False
    
    except Exception as e:
        logger.error(f"Error during backup: {str(e)}")
        return False


async def optimize_vector_db(db_path: str) -> bool:
    """
    Performs optimization operations on the vector database.
    
    Args:
        db_path: Path to the vector database directory
        
    Returns:
        bool: True if optimization was successful
    """
    try:
        logger.info(f"Starting vector database optimization: {db_path}")
        
        # Initialize vector database
        vector_db = ChromaVectorDatabase(persist_directory=db_path)
        
        # Collect pre-optimization metrics
        pre_count = await vector_db.count_embeddings()
        logger.info(f"Pre-optimization embedding count: {pre_count}")
        
        # Perform optimization
        start_time = datetime.datetime.now()
        optimization_result = await vector_db.optimize_database()
        end_time = datetime.datetime.now()
        
        duration = (end_time - start_time).total_seconds()
        logger.info(f"Optimization completed in {duration:.2f} seconds")
        
        # Collect post-optimization metrics
        post_count = await vector_db.count_embeddings()
        logger.info(f"Post-optimization embedding count: {post_count}")
        
        # Cleanup resources
        await vector_db.close()
        
        if optimization_result:
            event_bus.publish("vector:optimized", {
                "db_path": db_path,
                "duration_seconds": duration,
                "pre_count": pre_count,
                "post_count": post_count,
                "timestamp": datetime.datetime.now().isoformat()
            })
            return True
        else:
            logger.error("Optimization failed")
            return False
    
    except Exception as e:
        logger.error(f"Error during optimization: {str(e)}")
        return False


async def verify_optimization(db_path: str) -> bool:
    """
    Verifies the database integrity after optimization.
    
    Args:
        db_path: Path to the vector database directory
        
    Returns:
        bool: True if verification was successful
    """
    try:
        logger.info(f"Verifying vector database after optimization: {db_path}")
        
        # Initialize vector database
        vector_db = ChromaVectorDatabase(persist_directory=db_path)
        
        # Verify the database by performing test queries
        # Generate a simple test vector (random values, just for testing)
        import numpy as np
        test_vector = np.random.rand(768).tolist()  # Common embedding dimension
        
        # Try to perform a search
        results = await vector_db.search_similar(
            query_vector=test_vector, 
            limit=1
        )
        
        # Check count
        count = await vector_db.count_embeddings()
        
        # Cleanup resources
        await vector_db.close()
        
        # Verification successful if we got a response (even empty) and count
        logger.info(f"Verification complete: {count} embeddings in database")
        
        event_bus.publish("vector:verified", {
            "db_path": db_path,
            "count": count,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return True
    
    except Exception as e:
        logger.error(f"Error during verification: {str(e)}")
        return False


async def main() -> int:
    """
    Main entry point for the optimization script.
    
    Returns:
        int: Exit code (0 for success, non-zero for errors)
    """
    try:
        # Set up logging
        setup_logging()
        
        # Parse arguments
        args = parse_arguments()
        
        # Set log level to DEBUG if verbose flag is set
        if args.verbose:
            logger.setLevel(logging.DEBUG)
            logger.debug("Verbose logging enabled")
        
        logger.info(f"Vector database optimization started for: {args.db_path}")
        
        # Validate database
        if not validate_vector_db(args.db_path) and not args.force:
            logger.error("Database validation failed. Use --force to override.")
            return 1
        
        # Create backup if requested
        if args.backup:
            if not await backup_vector_db(args.db_path, args.backup_path):
                logger.error("Backup failed. Aborting optimization.")
                return 1
        
        # Perform optimization
        logger.info("Starting optimization process")
        if not await optimize_vector_db(args.db_path):
            logger.error("Optimization failed")
            return 1
        
        # Verify optimization results
        logger.info("Verifying optimization results")
        if not await verify_optimization(args.db_path):
            logger.error("Verification failed")
            return 1
        
        logger.info("Vector database optimization completed successfully")
        return 0
    
    except Exception as e:
        logger.error(f"Unexpected error during optimization: {str(e)}")
        return 1


def run_cli():
    """
    Entry point for command-line execution.
    """
    exit_code = asyncio.run(main())
    sys.exit(exit_code)


if __name__ == "__main__":
    run_cli()