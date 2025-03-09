import re
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Union, List, Dict, Any

import magic  # python-magic v0.4.27
import validators  # validators v0.20.0
import bleach  # bleach v6.0.0

from ..schemas.document import ALLOWED_FILE_TYPES
from ..schemas.memory import MEMORY_CATEGORIES
from ..schemas.voice import VOICE_PROVIDERS, AUDIO_FORMATS
from ..schemas.search import SEARCH_PROVIDERS
from .web_scraper import is_valid_url

# Configure logger
logger = logging.getLogger(__name__)

# Regular expression patterns
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
URL_REGEX = re.compile(r'^https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+')
PATH_TRAVERSAL_REGEX = re.compile(r'\.\./|\.\.\\|~/')
FILENAME_REGEX = re.compile(r'^[\w\-. ]+$')

# Constants
MAX_FILENAME_LENGTH = 255
MAX_TEXT_LENGTH = 100000
MAX_METADATA_SIZE = 10240

# HTML sanitization settings
SANITIZE_TAGS = ['a', 'abbr', 'acronym', 'b', 'blockquote', 'code', 'em', 'i', 'li', 'ol', 'p', 'strong', 'ul']
SANITIZE_ATTRIBUTES = {'a': ['href', 'title'], 'abbr': ['title'], 'acronym': ['title']}


def validate_uuid(uuid_str: str) -> bool:
    """
    Validates that a string is a valid UUID.
    
    Args:
        uuid_str: String to validate as UUID
        
    Returns:
        bool: True if valid UUID, False otherwise
    """
    if not uuid_str:
        return False
    
    try:
        uuid.UUID(str(uuid_str))
        return True
    except (ValueError, AttributeError):
        logger.debug(f"Invalid UUID format: {uuid_str}")
        return False


def validate_email(email: str) -> bool:
    """
    Validates that a string is a properly formatted email address.
    
    Args:
        email: Email address to validate
        
    Returns:
        bool: True if valid email, False otherwise
    """
    if not email:
        return False
    
    if EMAIL_REGEX.match(email):
        return True
    
    logger.debug(f"Invalid email format: {email}")
    return False


def validate_url(url: str) -> bool:
    """
    Validates that a string is a properly formatted URL.
    
    Args:
        url: URL to validate
        
    Returns:
        bool: True if valid URL, False otherwise
    """
    if not url:
        return False
    
    result = is_valid_url(url)
    
    if not result:
        logger.debug(f"Invalid URL format: {url}")
    
    return result


def validate_file_type(file_type: str) -> bool:
    """
    Validates that a file type is supported by the application.
    
    Args:
        file_type: File extension to validate
        
    Returns:
        bool: True if supported file type, False otherwise
    """
    if not file_type:
        return False
    
    # Convert to lowercase and remove leading dot if present
    file_type = file_type.lower()
    if file_type.startswith('.'):
        file_type = file_type[1:]
    
    result = file_type in ALLOWED_FILE_TYPES
    
    if not result:
        logger.debug(f"Unsupported file type: {file_type}. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}")
    
    return result


def validate_file_content(file_content: bytes, expected_type: str) -> bool:
    """
    Validates file content by checking its MIME type against the expected type.
    
    Args:
        file_content: Binary content of the file
        expected_type: Expected MIME type or file extension
        
    Returns:
        bool: True if content matches expected type, False otherwise
    """
    if not file_content:
        return False
    
    try:
        # Detect MIME type using python-magic
        detected_mime = magic.from_buffer(file_content, mime=True)
        
        # If expected_type is a file extension, convert to MIME type
        if expected_type.startswith('.') or '/' not in expected_type:
            # Simple mapping for common file types
            # In a complete implementation, this would be more comprehensive
            extension_to_mime = {
                'pdf': 'application/pdf',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'txt': 'text/plain',
                'md': 'text/markdown',
                'csv': 'text/csv',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
            
            # Remove leading dot if present
            if expected_type.startswith('.'):
                expected_type = expected_type[1:]
                
            expected_mime = extension_to_mime.get(expected_type.lower())
            if not expected_mime:
                logger.warning(f"Unknown file extension to MIME type mapping for: {expected_type}")
                return False
        else:
            expected_mime = expected_type
        
        # Compare detected MIME type with expected MIME type
        result = detected_mime == expected_mime
        
        if not result:
            logger.debug(f"File content MIME type '{detected_mime}' does not match expected type '{expected_mime}'")
        
        return result
    except Exception as e:
        logger.error(f"Error validating file content: {str(e)}")
        return False


def validate_file_size(file_size: int, max_size_mb: int) -> bool:
    """
    Validates that a file size is within acceptable limits.
    
    Args:
        file_size: Size of the file in bytes
        max_size_mb: Maximum allowed size in megabytes
        
    Returns:
        bool: True if file size is acceptable, False otherwise
    """
    if file_size < 0:
        return False
    
    # Convert max_size_mb to bytes
    max_size_bytes = max_size_mb * 1024 * 1024
    
    result = file_size <= max_size_bytes
    
    if not result:
        logger.debug(f"File size {file_size} bytes exceeds maximum allowed size of {max_size_bytes} bytes")
    
    return result


def validate_filename(filename: str) -> bool:
    """
    Validates that a filename is properly formatted and secure.
    
    Args:
        filename: Filename to validate
        
    Returns:
        bool: True if valid filename, False otherwise
    """
    if not filename:
        return False
    
    # Check if filename is too long
    if len(filename) > MAX_FILENAME_LENGTH:
        logger.debug(f"Filename too long: {len(filename)} characters")
        return False
    
    # Check for path traversal attempts
    if PATH_TRAVERSAL_REGEX.search(filename):
        logger.warning(f"Potential path traversal attempt in filename: {filename}")
        return False
    
    # Check if filename matches the allowed pattern
    if not FILENAME_REGEX.match(filename):
        logger.debug(f"Filename contains invalid characters: {filename}")
        return False
    
    return True


def validate_file_path(file_path: str, base_dir: str) -> bool:
    """
    Validates that a file path is secure and within allowed directories.
    
    Args:
        file_path: File path to validate
        base_dir: Base directory that should contain the file
        
    Returns:
        bool: True if valid file path, False otherwise
    """
    if not file_path:
        return False
    
    try:
        # Convert to Path objects for secure path manipulation
        file_path = Path(file_path).resolve()
        base_dir = Path(base_dir).resolve()
        
        # Check for path traversal attempts
        if '..' in str(file_path):
            logger.warning(f"Potential path traversal attempt in file path: {file_path}")
            return False
        
        # Check if the file path is within the base directory
        if not str(file_path).startswith(str(base_dir)):
            logger.warning(f"File path '{file_path}' is outside the allowed base directory '{base_dir}'")
            return False
        
        return True
    except Exception as e:
        logger.error(f"Error validating file path: {str(e)}")
        return False


def validate_text_length(text: str, max_length: Optional[int] = None) -> bool:
    """
    Validates that text length is within acceptable limits.
    
    Args:
        text: Text to validate
        max_length: Maximum allowed length in characters
        
    Returns:
        bool: True if text length is acceptable, False otherwise
    """
    if text is None:
        return False
    
    # Use provided max_length or default
    max_length = max_length or MAX_TEXT_LENGTH
    
    result = len(text) <= max_length
    
    if not result:
        logger.debug(f"Text length {len(text)} exceeds maximum allowed length of {max_length}")
    
    return result


def validate_date_format(date_str: str, format_str: str) -> bool:
    """
    Validates that a string is a properly formatted date.
    
    Args:
        date_str: Date string to validate
        format_str: Expected date format (e.g., '%Y-%m-%d')
        
    Returns:
        bool: True if valid date format, False otherwise
    """
    if not date_str:
        return False
    
    try:
        datetime.strptime(date_str, format_str)
        return True
    except ValueError:
        logger.debug(f"Invalid date format: '{date_str}' does not match format '{format_str}'")
        return False


def validate_date_range(date: datetime, min_date: Optional[datetime] = None, max_date: Optional[datetime] = None) -> bool:
    """
    Validates that a date is within an acceptable range.
    
    Args:
        date: Date to validate
        min_date: Minimum allowed date
        max_date: Maximum allowed date
        
    Returns:
        bool: True if date is within range, False otherwise
    """
    if date is None:
        return False
    
    if min_date and date < min_date:
        logger.debug(f"Date {date} is earlier than minimum allowed date {min_date}")
        return False
    
    if max_date and date > max_date:
        logger.debug(f"Date {date} is later than maximum allowed date {max_date}")
        return False
    
    return True


def validate_numeric_range(value: Union[int, float], min_value: Union[int, float], max_value: Union[int, float]) -> bool:
    """
    Validates that a number is within an acceptable range.
    
    Args:
        value: Numeric value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        
    Returns:
        bool: True if value is within range, False otherwise
    """
    if value is None:
        return False
    
    if value < min_value:
        logger.debug(f"Value {value} is less than minimum allowed value {min_value}")
        return False
    
    if value > max_value:
        logger.debug(f"Value {value} is greater than maximum allowed value {max_value}")
        return False
    
    return True


def validate_memory_category(category: str) -> bool:
    """
    Validates that a memory category is supported.
    
    Args:
        category: Memory category to validate
        
    Returns:
        bool: True if valid category, False otherwise
    """
    if not category:
        return False
    
    result = category in MEMORY_CATEGORIES
    
    if not result:
        logger.debug(f"Invalid memory category: '{category}'. Valid categories: {', '.join(MEMORY_CATEGORIES)}")
    
    return result


def validate_voice_provider(provider: str) -> bool:
    """
    Validates that a voice provider is supported.
    
    Args:
        provider: Voice provider to validate
        
    Returns:
        bool: True if valid provider, False otherwise
    """
    if not provider:
        return False
    
    result = provider in VOICE_PROVIDERS
    
    if not result:
        logger.debug(f"Invalid voice provider: '{provider}'. Valid providers: {', '.join(VOICE_PROVIDERS)}")
    
    return result


def validate_audio_format(format: str) -> bool:
    """
    Validates that an audio format is supported.
    
    Args:
        format: Audio format to validate
        
    Returns:
        bool: True if valid format, False otherwise
    """
    if not format:
        return False
    
    # Convert to lowercase and remove leading dot if present
    format = format.lower()
    if format.startswith('.'):
        format = format[1:]
    
    result = format in AUDIO_FORMATS
    
    if not result:
        logger.debug(f"Invalid audio format: '{format}'. Valid formats: {', '.join(AUDIO_FORMATS)}")
    
    return result


def validate_search_provider(provider: str) -> bool:
    """
    Validates that a search provider is supported.
    
    Args:
        provider: Search provider to validate
        
    Returns:
        bool: True if valid provider, False otherwise
    """
    if not provider:
        return False
    
    result = provider in SEARCH_PROVIDERS
    
    if not result:
        logger.debug(f"Invalid search provider: '{provider}'. Valid providers: {', '.join(SEARCH_PROVIDERS)}")
    
    return result


def validate_metadata_size(metadata: Dict[str, Any], max_size: Optional[int] = None) -> bool:
    """
    Validates that metadata size is within acceptable limits.
    
    Args:
        metadata: Metadata dictionary to validate
        max_size: Maximum allowed size in bytes
        
    Returns:
        bool: True if metadata size is acceptable, False otherwise
    """
    if metadata is None:
        return True  # No metadata is valid
    
    # Convert metadata to string to measure size
    metadata_str = str(metadata)
    size = len(metadata_str.encode('utf-8'))
    
    # Use provided max_size or default
    max_size = max_size or MAX_METADATA_SIZE
    
    result = size <= max_size
    
    if not result:
        logger.debug(f"Metadata size {size} bytes exceeds maximum allowed size of {max_size} bytes")
    
    return result


def sanitize_html(html_content: str) -> str:
    """
    Sanitizes HTML content to prevent XSS attacks.
    
    Args:
        html_content: HTML content to sanitize
        
    Returns:
        str: Sanitized HTML content
    """
    if not html_content:
        return ""
    
    sanitized = bleach.clean(
        html_content,
        tags=SANITIZE_TAGS,
        attributes=SANITIZE_ATTRIBUTES,
        strip=True
    )
    
    logger.debug(f"Sanitized HTML content, removed {len(html_content) - len(sanitized)} characters")
    
    return sanitized


def sanitize_filename(filename: str) -> str:
    """
    Sanitizes a filename to ensure it's safe for filesystem operations.
    
    Args:
        filename: Filename to sanitize
        
    Returns:
        str: Sanitized filename
    """
    if not filename:
        return ""
    
    # Remove any directory path components
    filename = os.path.basename(filename)
    
    # Replace potentially dangerous characters with underscores
    filename = re.sub(r'[^\w\-. ]', '_', filename)
    
    # Ensure the filename isn't too long
    if len(filename) > MAX_FILENAME_LENGTH:
        name, ext = os.path.splitext(filename)
        filename = name[:MAX_FILENAME_LENGTH - len(ext)] + ext
    
    logger.debug(f"Sanitized filename: {filename}")
    
    return filename


def sanitize_text(text: str, allow_html: bool = False) -> str:
    """
    Sanitizes text input to remove potentially harmful content.
    
    Args:
        text: Text to sanitize
        allow_html: Whether to allow safe HTML tags
        
    Returns:
        str: Sanitized text
    """
    if not text:
        return ""
    
    if allow_html:
        # Use HTML sanitization
        sanitized = sanitize_html(text)
    else:
        # Strip all HTML tags
        sanitized = re.sub(r'<[^>]*>', '', text)
    
    # Ensure text length is within limits
    if len(sanitized) > MAX_TEXT_LENGTH:
        sanitized = sanitized[:MAX_TEXT_LENGTH]
        logger.debug(f"Text truncated to maximum length of {MAX_TEXT_LENGTH} characters")
    
    return sanitized


def sanitize_metadata(metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes metadata to ensure it doesn't contain harmful content.
    
    Args:
        metadata: Metadata dictionary to sanitize
        
    Returns:
        Dict[str, Any]: Sanitized metadata
    """
    if not metadata:
        return {}
    
    sanitized_metadata = {}
    
    for key, value in metadata.items():
        # Sanitize string values
        if isinstance(value, str):
            sanitized_value = sanitize_text(value)
        # Recursively sanitize nested dictionaries
        elif isinstance(value, dict):
            sanitized_value = sanitize_metadata(value)
        # Sanitize list items if they are strings
        elif isinstance(value, list):
            sanitized_value = [
                sanitize_text(item) if isinstance(item, str) else item
                for item in value
            ]
        # Keep other value types as is
        else:
            sanitized_value = value
        
        sanitized_metadata[key] = sanitized_value
    
    # Check if the sanitized metadata is still within size limits
    if not validate_metadata_size(sanitized_metadata):
        logger.warning("Sanitized metadata exceeds maximum size, truncating")
        # Simple approach: convert to string, truncate, and convert back
        # In practice, you might want a more sophisticated approach
        metadata_str = str(sanitized_metadata)
        if len(metadata_str) > MAX_METADATA_SIZE:
            return {"warning": "Metadata exceeded maximum size and was truncated"}
    
    return sanitized_metadata