import os
import sys
import logging
import importlib
import alembic
from alembic import command
from alembic.config import Config
from alembic.script import ScriptDirectory
import sqlite3

from ...utils.logging_setup import get_logger
from ...config.settings import Settings

# Initialize logger
logger = get_logger(__name__)

# Load application settings
settings = Settings()

# Define migration package for version imports
MIGRATION_PACKAGE = 'src.backend.database.migrations.versions'

def get_migration_directory():
    """
    Returns the absolute path to the migrations directory
    
    Returns:
        str: Absolute path to migrations directory
    """
    return os.path.dirname(os.path.abspath(__file__))

def get_alembic_config():
    """
    Creates and returns an Alembic configuration object
    
    Returns:
        alembic.config.Config: Alembic configuration object
    """
    migrations_dir = get_migration_directory()
    
    # Create Alembic config
    config = Config()
    config.set_main_option('script_location', migrations_dir)
    
    # Set database URL from application settings
    db_path = settings.get('storage.database_path')
    if not db_path:
        db_dir = settings.get('storage.base_path', 'data')
        db_path = os.path.join(db_dir, 'personal_ai.db')
    
    # Convert to SQLite URL
    db_url = f"sqlite:///{db_path}"
    config.set_main_option('sqlalchemy.url', db_url)
    
    # Set file template for migrations
    config.set_main_option('file_template', '%%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d_%%(minute).2d_%%(slug)s')
    
    return config

def run_migrations(command_name, *args, **kwargs):
    """
    Runs database migrations using Alembic
    
    Args:
        command_name (str): Alembic command to run
        args (list): Arguments for the command
        
    Returns:
        None
    """
    config = get_alembic_config()
    
    try:
        # Get the alembic command function
        if hasattr(command, command_name):
            cmd_func = getattr(command, command_name)
            # Execute the command
            cmd_func(config, *args, **kwargs)
            logger.info(f"Migration command '{command_name}' completed successfully")
        else:
            raise ValueError(f"Unknown Alembic command: {command_name}")
    except Exception as e:
        logger.error(f"Error running migration command '{command_name}': {str(e)}")
        raise

def upgrade(revision='head'):
    """
    Upgrades the database schema to the specified revision
    
    Args:
        revision (str): Target revision, defaults to 'head' (latest)
        
    Returns:
        None
    """
    logger.info(f"Upgrading database to revision: {revision}")
    run_migrations('upgrade', revision)
    logger.info(f"Database upgrade to {revision} completed")

def downgrade(revision):
    """
    Downgrades the database schema to the specified revision
    
    Args:
        revision (str): Target revision
        
    Returns:
        None
    """
    logger.info(f"Downgrading database to revision: {revision}")
    run_migrations('downgrade', revision)
    logger.info(f"Database downgrade to {revision} completed")

def create_migration(message):
    """
    Creates a new migration script
    
    Args:
        message (str): Migration message/description
        
    Returns:
        str: Path to the created migration script
    """
    logger.info(f"Creating new migration: {message}")
    try:
        run_migrations('revision', message=message, autogenerate=True)
        logger.info(f"Migration creation completed: {message}")
        
        # Try to find the created migration file
        config = get_alembic_config()
        script = ScriptDirectory.from_config(config)
        
        # Get latest revision
        head = script.get_current_head()
        if head:
            migration_path = script.get_revision(head).path
            return migration_path
        
        return "Migration created, but couldn't determine path"
    except Exception as e:
        logger.error(f"Error creating migration: {str(e)}")
        raise

def get_current_revision():
    """
    Gets the current database revision
    
    Returns:
        str: Current revision identifier or None if database is not initialized
    """
    try:
        config = get_alembic_config()
        
        # Get database path from config
        db_url = config.get_main_option('sqlalchemy.url')
        if db_url.startswith('sqlite:///'):
            db_path = db_url[10:]  # Remove sqlite:///
        else:
            raise ValueError(f"Unexpected database URL format: {db_url}")
        
        # Check if database exists
        if not os.path.exists(db_path):
            logger.info("Database does not exist yet")
            return None
        
        # Connect to database and check version
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if alembic_version table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='alembic_version'")
        if not cursor.fetchone():
            logger.info("Alembic version table does not exist")
            conn.close()
            return None
        
        # Get current version
        cursor.execute("SELECT version_num FROM alembic_version")
        version = cursor.fetchone()
        conn.close()
        
        if version:
            logger.info(f"Current database revision: {version[0]}")
            return version[0]
        else:
            logger.info("No database revision found")
            return None
    except Exception as e:
        logger.error(f"Error getting current revision: {str(e)}")
        return None

def check_migrations():
    """
    Checks if there are pending migrations to apply
    
    Returns:
        bool: True if there are pending migrations, False otherwise
    """
    try:
        current = get_current_revision()
        
        # If no current revision, migrations are needed
        if current is None:
            return True
        
        # Get latest available revision
        config = get_alembic_config()
        script = ScriptDirectory.from_config(config)
        head = script.get_current_head()
        
        # Compare with current
        if current != head:
            logger.info(f"Pending migrations found: current={current}, latest={head}")
            return True
        else:
            logger.info("Database schema is up to date")
            return False
    except Exception as e:
        logger.error(f"Error checking migrations: {str(e)}")
        # In case of error, assume migrations are needed to be safe
        return True

def initialize_migrations():
    """
    Initializes the migration system and applies all migrations
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Get database path from config
        config = get_alembic_config()
        db_url = config.get_main_option('sqlalchemy.url')
        if db_url.startswith('sqlite:///'):
            db_path = db_url[10:]  # Remove sqlite:///
        else:
            raise ValueError(f"Unexpected database URL format: {db_url}")
        
        # Ensure database directory exists
        db_dir = os.path.dirname(db_path)
        os.makedirs(db_dir, exist_ok=True)
        
        # Run migrations to head
        upgrade('head')
        
        logger.info(f"Database migration initialization completed successfully")
        return True
    except Exception as e:
        logger.error(f"Error initializing migrations: {str(e)}")
        return False