import os
import logging
from pathlib import Path

# Default logging configuration
DEFAULT_LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DEFAULT_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_LOG_LEVEL = logging.INFO

# Mapping of string log levels to logging module constants
LOG_LEVELS = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL
}

# Default log file settings
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
DEFAULT_BACKUP_COUNT = 5

# List of sensitive fields that should be redacted in logs
SENSITIVE_FIELDS = [
    "api_key", "secret_key", "password", "token", 
    "access_key", "encryption_key"
]

def get_default_log_directory():
    """
    Determines the default log directory based on the platform.
    
    Returns:
        Path: Path to the default log directory
    """
    if os.name == 'nt':  # Windows
        log_dir = Path(os.environ.get('APPDATA', '')) / 'PersonalAI' / 'logs'
    else:  # macOS/Linux
        log_dir = Path.home() / '.personalai' / 'logs'
    
    # Ensure the directory exists
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir

def get_log_level(level_name):
    """
    Converts a string log level to the corresponding logging module constant.
    
    Args:
        level_name (str): Name of the log level (e.g., "INFO", "DEBUG")
        
    Returns:
        int: Logging level constant from the logging module
    """
    level_name = level_name.upper() if isinstance(level_name, str) else level_name
    return LOG_LEVELS.get(level_name, DEFAULT_LOG_LEVEL)

def sanitize_log_message(message):
    """
    Sanitizes log messages to remove sensitive information.
    
    Args:
        message (str): The log message to sanitize
        
    Returns:
        str: Sanitized log message with sensitive information redacted
    """
    if not isinstance(message, str):
        return message
    
    # Simple approach to find and redact common sensitive data patterns
    sanitized = message
    
    for field in SENSITIVE_FIELDS:
        # Look for common patterns like field=value, field: value, "field": value
        for pattern in [f"{field}=", f"{field}: ", f'"{field}": ', f"'{field}': "]:
            start_idx = sanitized.lower().find(pattern.lower())
            while start_idx != -1:
                # Find the end of the value part
                value_start = start_idx + len(pattern)
                value_end = value_start
                
                # Skip the initial quote if present
                if value_start < len(sanitized) and sanitized[value_start] in ['"', "'"]:
                    quote_char = sanitized[value_start]
                    value_start += 1
                    # Find the closing quote
                    value_end = sanitized.find(quote_char, value_start)
                    if value_end == -1:  # No closing quote found
                        value_end = len(sanitized)
                else:
                    # Find the end of the value (space, comma, or end of string)
                    for end_char in [' ', ',', ';', '\n']:
                        end_idx = sanitized.find(end_char, value_start)
                        if end_idx != -1:
                            value_end = end_idx
                            break
                    else:  # No end character found
                        value_end = len(sanitized)
                
                # Replace the value with [REDACTED]
                if value_end > value_start:
                    sanitized = (
                        sanitized[:value_start] + 
                        "[REDACTED]" + 
                        sanitized[value_end:]
                    )
                
                # Find the next occurrence
                start_idx = sanitized.lower().find(pattern.lower(), value_start)
    
    return sanitized

def create_log_config(
    log_level="INFO",
    log_dir=None,
    console_logging=True,
    file_logging=True,
    max_bytes=DEFAULT_MAX_BYTES,
    backup_count=DEFAULT_BACKUP_COUNT
):
    """
    Creates a logging configuration dictionary for use with logging.config.dictConfig.
    
    Args:
        log_level (str): The log level to use
        log_dir (Path): Directory where log files should be stored
        console_logging (bool): Whether to enable logging to console
        file_logging (bool): Whether to enable logging to file
        max_bytes (int): Maximum size of log files before rotation
        backup_count (int): Number of backup log files to keep
        
    Returns:
        dict: Logging configuration dictionary
    """
    if log_dir is None:
        log_dir = get_default_log_directory()
    
    handlers = {}
    handler_list = []
    
    if console_logging:
        handlers["console"] = {
            "class": "logging.StreamHandler",
            "level": get_log_level(log_level),
            "formatter": "standard",
            "stream": "ext://sys.stdout",
            "filters": ["sensitive_filter"]
        }
        handler_list.append("console")
    
    if file_logging:
        log_file = log_dir / "personal_ai_agent.log"
        handlers["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": get_log_level(log_level),
            "formatter": "standard",
            "filename": str(log_file),
            "maxBytes": max_bytes,
            "backupCount": backup_count,
            "encoding": "utf8",
            "filters": ["sensitive_filter"]
        }
        handler_list.append("file")
    
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "format": DEFAULT_LOG_FORMAT,
                "datefmt": DEFAULT_DATE_FORMAT
            }
        },
        "filters": {
            "sensitive_filter": {
                "()": "backend.config.logging.SensitiveFilter"
            }
        },
        "handlers": handlers,
        "loggers": {
            "": {  # Root logger
                "handlers": handler_list,
                "level": get_log_level(log_level),
                "propagate": True
            }
        }
    }
    
    return config

class SensitiveFilter(logging.Filter):
    """
    Logging filter that redacts sensitive information from log records.
    """
    
    def filter(self, record):
        """
        Filters log records to redact sensitive information.
        
        Args:
            record (logging.LogRecord): The log record to filter
            
        Returns:
            bool: Always returns True to allow the record, but modifies it in place
        """
        if isinstance(record.msg, str):
            record.msg = sanitize_log_message(record.msg)
            
        # Also sanitize any arguments if they are strings
        if record.args:
            args = list(record.args)
            for i, arg in enumerate(args):
                if isinstance(arg, str):
                    args[i] = sanitize_log_message(arg)
            record.args = tuple(args)
            
        return True