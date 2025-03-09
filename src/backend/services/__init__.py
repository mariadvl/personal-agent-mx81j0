import logging
from typing import List, Dict, Optional, Any

from .conversation_service import ConversationService  # Assuming v1.0
from .memory_service import MemoryService  # Assuming v1.0
from .llm_service import LLMService  # Assuming v1.0
from .document_processor import DocumentProcessor, validate_file_type, get_file_extension  # Assuming v1.0
from .web_extractor import WebExtractor  # Assuming v1.0
from .search_service import SearchService  # Assuming v1.0
from .voice_processor import VoiceProcessor  # Assuming v1.0
from .storage_manager import StorageManager  # Assuming v1.0

# Configure logger
logger = logging.getLogger(__name__)

__version__ = "1.0.0"

__all__ = [
    "ConversationService",
    "MemoryService",
    "LLMService",
    "DocumentProcessor",
    "WebExtractor",
    "SearchService",
    "VoiceProcessor",
    "StorageManager",
    "validate_file_type",
    "get_file_extension",
    "__version__"
]

logger.info(f"Exporting services: {__all__}")