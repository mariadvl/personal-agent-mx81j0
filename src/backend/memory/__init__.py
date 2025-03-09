"""
Initialization file for the memory module of the Personal AI Agent,
exposing the core memory components for storing, retrieving, and managing memory items.
This module is central to the local-first, memory-augmented architecture that enables
context-aware responses while preserving user privacy.
"""

import logging

# Import version information for the package
from src.backend import __version__  # v1.0.0

# Import MetadataStore for managing memory item metadata
from .metadata_store import MetadataStore

# Import VectorStore for vector embedding storage and retrieval
from .vector_store import VectorStore

# Import MemoryStorage for unified memory storage operations
from .storage import MemoryStorage

# Import MemoryRetriever for context retrieval and ranking
from .retriever import MemoryRetriever

# Import ConversationContextManager for managing conversation context
from .retriever import ConversationContextManager

# Import normalize_vector utility function
from .vector_store import normalize_vector

# Import chunk_text utility function
from .vector_store import chunk_text

# Import validate_memory_category utility function
from .storage import validate_memory_category

# Import format_memory_item utility function
from .storage import format_memory_item

# Import calculate_recency_score utility function
from .retriever import calculate_recency_score

# Import calculate_importance_score utility function
from .retriever import calculate_importance_score

# Import combine_scores utility function
from .retriever import combine_scores

# Import format_context utility function
from .retriever import format_context

__all__ = [
    "MetadataStore",
    "VectorStore",
    "MemoryStorage",
    "MemoryRetriever",
    "ConversationContextManager",
    "normalize_vector",
    "chunk_text",
    "validate_memory_category",
    "format_memory_item",
    "calculate_recency_score",
    "calculate_importance_score",
    "combine_scores",
    "format_context",
]

logger = logging.getLogger(__name__)
logger.info("Exposing core memory components.")