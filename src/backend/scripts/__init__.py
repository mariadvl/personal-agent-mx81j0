"""
Initialization file for the scripts module that exposes command-line utilities for the Personal AI Agent.
This module provides access to various maintenance, initialization, and management scripts that can be run as standalone commands or imported and used programmatically.
"""

import logging  # standard library
from .backup_manager import BackupManager  # src/backend/scripts/backup_manager.py
from .initialize_db import initialize_sqlite_database, initialize_vector_database  # src/backend/scripts/initialize_db.py
from .optimize_vector_db import optimize_vector_database, display_database_stats  # src/backend/scripts/optimize_vector_db.py

# Get logger for this module
logger = logging.getLogger(__name__)

# Define what to export
__all__ = [
    'BackupManager',
    'initialize_sqlite_database',
    'initialize_vector_database',
    'optimize_vector_database',
    'display_database_stats'
]