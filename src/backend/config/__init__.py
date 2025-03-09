"""
Configuration module for the Personal AI Agent.

This module provides a centralized configuration system for managing application
settings, secrets, and logging. It implements a local-first approach where all
configuration is stored on the user's device.
"""

import logging
import logging.config
from pathlib import Path

__version__ = "1.0.0"

# Import necessary components from submodules
from .settings import Settings
from .logging import (
    create_log_config,
    get_log_level,
    get_default_log_directory
)

def setup_logging(
    log_level="INFO",
    log_dir=None,
    console_logging=True,
    file_logging=True,
    max_bytes=10 * 1024 * 1024,  # 10 MB
    backup_count=5
):
    """
    Configures the application logging system.
    
    This function sets up logging for the Personal AI Agent with options for console
    and file-based logging, log levels, and log rotation.
    
    Args:
        log_level (str): The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir (Path): Directory where log files should be stored
        console_logging (bool): Whether to enable logging to console
        file_logging (bool): Whether to enable logging to file
        max_bytes (int): Maximum size of log files before rotation
        backup_count (int): Number of backup log files to keep
        
    Returns:
        None
    """
    if log_dir is None:
        log_dir = get_default_log_directory()
    
    # Create log configuration
    log_config = create_log_config(
        log_level=log_level,
        log_dir=log_dir,
        console_logging=console_logging,
        file_logging=file_logging,
        max_bytes=max_bytes,
        backup_count=backup_count
    )
    
    # Apply the configuration
    logging.config.dictConfig(log_config)
    
    # Log the initialization
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized with level {log_level}, "
                f"console_logging={console_logging}, file_logging={file_logging}")

# Define explicitly which symbols are exported from this module
__all__ = [
    'Settings',
    'setup_logging',
    'get_log_level',
    'get_default_log_directory',
]