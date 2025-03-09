"""
Database migration versions package initialization.

This package contains individual migration scripts that track database schema changes
over time, enabling version control of the database schema while maintaining backward
compatibility.
"""

import logging
from ....utils.logging_setup import get_logger

# Configure logger for migrations
logger = get_logger(__name__)

# Global list to track all registered migration versions
MIGRATION_VERSIONS = []

def get_migration_versions():
    """
    Returns a list of available migration versions in this package.

    Returns:
        list: List of migration version identifiers
    """
    return MIGRATION_VERSIONS

def register_migration(version_id):
    """
    Registers a migration version when it's imported.

    Args:
        version_id (str): The version identifier for the migration

    Returns:
        None
    """
    if version_id not in MIGRATION_VERSIONS:
        MIGRATION_VERSIONS.append(version_id)
        logger.debug(f"Registered migration version: {version_id}")