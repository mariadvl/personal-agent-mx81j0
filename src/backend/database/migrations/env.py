"""
Alembic environment configuration for the Personal AI Agent database migrations.

This module configures the Alembic migration environment by connecting SQLAlchemy models
with the Alembic migration framework. It enables schema versioning and database migrations
while maintaining the local-first architecture of the application.
"""

import os
import sys
import logging

from alembic import context
from sqlalchemy import engine_from_config, pool

# Import application components
from ...database.models import Base
from ...config.settings import Settings
from ...utils.logging_setup import get_logger

# Initialize logger
logger = get_logger(__name__)

# Alembic config object provides access to alembic.ini values
config = context.config

# Set SQLAlchemy metadata for migration autogeneration
target_metadata = Base.metadata

# Initialize settings
settings_instance = Settings()

def get_database_url():
    """
    Get the database URL from config or settings.
    
    Returns:
        str: Database URL string
    """
    # Try to get URL from Alembic config first
    url = config.get_main_option("sqlalchemy.url")
    if not url:
        # If not in Alembic config, get from application settings
        db_path = settings_instance.get('storage.database_path', 'data/personal_ai.db')
        url = f"sqlite:///{db_path}"
    
    return url

def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function to determine which database objects should be included in migrations.
    
    Args:
        object: Database object
        name: Object name
        type_: Object type
        reflected: Whether object was reflected
        compare_to: Object being compared to
    
    Returns:
        bool: True if object should be included, False otherwise
    """
    # Skip Alembic's own version table
    if type_ == "table" and name == "alembic_version":
        return False
    
    # Include all other tables
    if type_ == "table":
        return True
    
    # Include other object types by default
    return True

def process_revision_directives(context, revision, directives):
    """
    Process revision directives to customize migration script generation.
    
    Args:
        context: Migration context
        revision: Revision
        directives: Revision directives
    """
    if directives and len(directives) > 0:
        script = directives[0]
        # Set naming convention for migration files
        # The default is already a timestamp-based identifier

def run_migrations_offline():
    """
    Run migrations in 'offline' mode, which doesn't require a connection to the database.
    
    This is used primarily for generating migration scripts without connecting to a database.
    """
    url = get_database_url()
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
        process_revision_directives=process_revision_directives,
        compare_type=True,
    )
    
    with context.begin_transaction():
        context.run_migrations()
    
    logger.info("Offline migrations completed")

def run_migrations_online():
    """
    Run migrations in 'online' mode with an active database connection.
    
    This is used when actually applying migrations to a database.
    """
    url = get_database_url()
    
    # Create engine configuration
    engine_config = {
        'sqlalchemy.url': url
    }
    
    engine = engine_from_config(
        engine_config,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool
    )
    
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            process_revision_directives=process_revision_directives,
            compare_type=True,
        )
        
        try:
            with context.begin_transaction():
                context.run_migrations()
            logger.info("Online migrations completed")
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise