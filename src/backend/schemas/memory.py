"""
Defines Pydantic schema models for memory-related operations in the Personal AI Agent.

These schemas are used for validating request/response data in the memory API endpoints,
ensuring data consistency and proper typing throughout the application.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

from ..database.models import MEMORY_CATEGORIES


class MemoryBase(BaseModel):
    """Base schema for memory items with common fields."""
    content: str = Field(..., description="The content text of the memory")
    category: str = Field(..., description="Category of memory (must be in MEMORY_CATEGORIES)")
    source_type: Optional[str] = Field(None, description="Type of source (conversation, document, web)")
    source_id: Optional[UUID] = Field(None, description="ID of the source item")
    importance: Optional[int] = Field(1, ge=1, le=5, description="Importance ranking (1-5)")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

    @validator('category')
    def validate_category(cls, value):
        """Validates that a memory category is one of the allowed values."""
        if value not in MEMORY_CATEGORIES:
            raise ValueError(f"Category must be one of {MEMORY_CATEGORIES}")
        return value


class MemoryCreate(MemoryBase):
    """Schema for creating a new memory item."""
    pass  # Inherits all fields from MemoryBase


class MemoryResponse(BaseModel):
    """Schema for memory item responses."""
    id: UUID
    created_at: datetime
    content: str
    category: str
    source_type: Optional[str] = None
    source_id: Optional[UUID] = None
    importance: int
    metadata: Dict[str, Any]


class MemoryUpdateRequest(BaseModel):
    """Schema for updating an existing memory item."""
    content: Optional[str] = None
    category: Optional[str] = None
    importance: Optional[int] = Field(None, ge=1, le=5, description="Importance ranking (1-5)")
    metadata: Optional[Dict[str, Any]] = None

    @validator('category')
    def validate_category(cls, value):
        """Validates that a memory category is one of the allowed values."""
        if value is not None and value not in MEMORY_CATEGORIES:
            raise ValueError(f"Category must be one of {MEMORY_CATEGORIES}")
        return value


class MemoryDeleteResponse(BaseModel):
    """Schema for memory deletion responses."""
    success: bool
    message: Optional[str] = None


class MemorySearchRequest(BaseModel):
    """Schema for memory search requests."""
    query: str = Field(..., description="Search query")
    limit: Optional[int] = Field(10, ge=1, le=100, description="Maximum number of results to return")
    categories: Optional[List[str]] = Field(None, description="Filter by specific categories")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    include_metadata: Optional[bool] = Field(True, description="Whether to include metadata in results")

    @validator('categories')
    def validate_categories(cls, value):
        """Validates that all categories are allowed values."""
        if value is not None:
            for category in value:
                if category not in MEMORY_CATEGORIES:
                    raise ValueError(f"Category must be one of {MEMORY_CATEGORIES}")
        return value


class MemorySearchResponse(BaseModel):
    """Schema for memory search responses."""
    results: List[MemoryResponse]
    total: int
    limit: int
    metadata: Optional[Dict[str, Any]] = None


class ContextRetrievalRequest(BaseModel):
    """Schema for context retrieval requests."""
    query: str = Field(..., description="Query to retrieve context for")
    limit: Optional[int] = Field(10, ge=1, le=50, description="Maximum number of context items to return")
    categories: Optional[List[str]] = Field(None, description="Filter by specific categories")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    format_type: Optional[str] = Field("text", description="Format of the returned context")

    @validator('categories')
    def validate_categories(cls, value):
        """Validates that all categories are allowed values."""
        if value is not None:
            for category in value:
                if category not in MEMORY_CATEGORIES:
                    raise ValueError(f"Category must be one of {MEMORY_CATEGORIES}")
        return value


class ContextRetrievalResponse(BaseModel):
    """Schema for context retrieval responses."""
    items: List[MemoryResponse]
    formatted_context: str
    metadata: Optional[Dict[str, Any]] = None