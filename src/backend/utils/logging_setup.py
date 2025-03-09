import os
import logging
import logging.config
import logging.handlers
from pathlib import Path

from ..config.logging import (
    DEFAULT_LOG_FORMAT,
    DEFAULT_DATE_FORMAT,
    DEFAULT_LOG_LEVEL,
    LOG_LEVELS,
    get_default_log_directory,
    get_log_level,
    sanitize_log_message,
    create_log_config,
    SensitiveFilter
)

# Module logger
logger = logging.getLogger(__name__)


def setup_logging(log_level="INFO", log_dir=None, console_logging=True, file_logging=True):
    """
    Configures and initializes logging for the application.
    
    Args:
        log_level (str): The logging level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir (Path): Directory where log files should be stored, if None uses default
        console_logging (bool): Whether to enable logging to console
        file_logging (bool): Whether to enable logging to file
        
    Returns:
        logging.Logger: Root logger configured with appropriate handlers
    """
    # Convert string log level to logging constant
    level = get_log_level(log_level)
    
    # If log_dir not provided, use default
    if log_dir is None:
        log_dir = get_default_log_directory()
    
    # Ensure log directory exists
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create logging configuration
    config = create_log_config(
        log_level=log_level,
        log_dir=log_dir,
        console_logging=console_logging,
        file_logging=file_logging
    )
    
    # Apply configuration
    logging.config.dictConfig(config)
    
    # Add sensitive data filter to root logger
    root_logger = logging.getLogger()
    
    # Check if filter already exists
    if not any(isinstance(f, SensitiveFilter) for f in root_logger.filters):
        root_logger.addFilter(SensitiveFilter())
    
    # Log initialization message
    root_logger.info(f"Logging initialized. Level: {log_level}, Directory: {log_dir}")
    
    return root_logger


def get_logger(name):
    """
    Gets a logger with the specified name, configured with appropriate filters.
    
    Args:
        name (str): The name of the logger, typically __name__
        
    Returns:
        logging.Logger: Logger instance with name and sensitive data filter
    """
    logger = logging.getLogger(name)
    
    # Add sensitive data filter if not already present
    if not any(isinstance(f, SensitiveFilter) for f in logger.filters):
        logger.addFilter(SensitiveFilter())
    
    return logger


def configure_logger(logger, log_level="INFO", add_sensitive_filter=True):
    """
    Configures an existing logger with specific settings.
    
    Args:
        logger (logging.Logger): The logger instance to configure
        log_level (str): The logging level to set
        add_sensitive_filter (bool): Whether to add the sensitive data filter
        
    Returns:
        logging.Logger: The configured logger instance
    """
    # Set log level
    level = get_log_level(log_level)
    logger.setLevel(level)
    
    # Add sensitive data filter if requested and not already present
    if add_sensitive_filter and not any(isinstance(f, SensitiveFilter) for f in logger.filters):
        logger.addFilter(SensitiveFilter())
    
    return logger


def create_file_handler(log_dir, filename, log_level="INFO", max_bytes=10*1024*1024, backup_count=5):
    """
    Creates a rotating file handler for logging to files.
    
    Args:
        log_dir (Path): Directory where log files should be stored
        filename (str): Name of the log file
        log_level (str): The logging level to set for this handler
        max_bytes (int): Maximum size of log file before rotation (default: 10MB)
        backup_count (int): Number of backup log files to keep (default: 5)
        
    Returns:
        logging.handlers.RotatingFileHandler: Configured file handler
    """
    # Ensure log directory exists
    log_dir = Path(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    
    # Create full log file path
    log_file = log_dir / filename
    
    # Create rotating file handler
    handler = logging.handlers.RotatingFileHandler(
        filename=str(log_file),
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf8'
    )
    
    # Set level
    level = get_log_level(log_level)
    handler.setLevel(level)
    
    # Create and set formatter
    formatter = logging.Formatter(DEFAULT_LOG_FORMAT, DEFAULT_DATE_FORMAT)
    handler.setFormatter(formatter)
    
    return handler