"""
Pydantic schema models for web content extraction and processing.

This module defines the data models used for validating request and response data
in the API endpoints for web page reading, content extraction, and memory storage.
"""

from datetime import datetime
import re
import uuid
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator

# Regular expression for validating URLs
URL_REGEX = r'^https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'

class WebPageBase(BaseModel):
    """Base schema for web page models with common fields."""
    
    url: str = Field(..., description="URL of the web page")
    title: str = Field("", description="Title of the web page")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the web page")

    @validator('url')
    def validate_url(cls, url):
        """Validates that the URL is properly formatted."""
        if not re.match(URL_REGEX, url):
            raise ValueError("URL must be a properly formatted HTTP or HTTPS URL")
        return url

class WebExtractionRequest(BaseModel):
    """Schema for web content extraction request."""
    
    url: str = Field(..., description="URL of the web page to extract content from")
    include_images: Optional[bool] = Field(False, description="Whether to include images in the extraction")
    store_in_memory: Optional[bool] = Field(True, description="Whether to store the extracted content in memory")
    generate_summary: Optional[bool] = Field(True, description="Whether to generate a summary of the content")
    extraction_options: Optional[Dict[str, Any]] = Field(None, description="Additional options for extraction")

class WebExtractionResponse(BaseModel):
    """Schema for web content extraction response."""
    
    url: str = Field(..., description="URL of the web page that was extracted")
    title: str = Field(..., description="Title of the web page")
    content: str = Field(..., description="Extracted content from the web page")
    success: bool = Field(..., description="Whether the extraction was successful")
    summary: Optional[str] = Field(None, description="Summary of the extracted content")
    memory_items: Optional[List[str]] = Field(None, description="IDs of memory items created from the content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the extraction")
    images: Optional[List[Dict[str, Any]]] = Field(None, description="Images extracted from the web page")
    error: Optional[str] = Field(None, description="Error message if extraction failed")

class WebPage(WebPageBase):
    """Schema for web page record stored in the database."""
    
    id: uuid.UUID = Field(..., description="Unique identifier for the web page")
    created_at: datetime = Field(..., description="Timestamp when the web page was first processed")
    last_accessed: datetime = Field(..., description="Timestamp when the web page was last accessed")
    processed: bool = Field(False, description="Whether the web page has been fully processed")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the web page")

class WebContentChunk(BaseModel):
    """Schema for a chunk of processed web content."""
    
    web_page_id: uuid.UUID = Field(..., description="ID of the web page this chunk belongs to")
    chunk_index: int = Field(..., description="Index of this chunk in the sequence")
    content: str = Field(..., description="Text content of this chunk")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for this chunk")

class WebMemoryRequest(BaseModel):
    """Schema for storing web content in memory."""
    
    url: str = Field(..., description="URL of the web page")
    title: str = Field(..., description="Title of the web page")
    content: str = Field(..., description="Content to store in memory")
    summary: Optional[str] = Field(None, description="Summary of the content")
    conversation_id: Optional[uuid.UUID] = Field(None, description="ID of the conversation if related to one")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the memory item")

class WebMemoryResponse(BaseModel):
    """Schema for response when storing web content in memory."""
    
    success: bool = Field(..., description="Whether the storage was successful")
    memory_items: List[str] = Field(..., description="IDs of the created memory items")
    error: Optional[str] = Field(None, description="Error message if storage failed")

class WebSummaryRequest(BaseModel):
    """Schema for requesting a summary of web content."""
    
    content: str = Field(..., description="Web content to summarize")
    title: str = Field(..., description="Title of the web page")
    max_length: Optional[int] = Field(200, description="Maximum length of the summary in words")

class WebSummaryResponse(BaseModel):
    """Schema for web content summary response."""
    
    summary: str = Field(..., description="Generated summary of the web content")
    success: bool = Field(..., description="Whether the summary generation was successful")
    error: Optional[str] = Field(None, description="Error message if summary generation failed")