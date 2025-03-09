import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any, Union

from pydantic import BaseModel, Field, validator

# List of supported document file types
ALLOWED_FILE_TYPES = ['pdf', 'docx', 'txt', 'md', 'csv', 'xlsx']

class DocumentBase(BaseModel):
    """Base schema for document models with common fields"""
    filename: str = Field(..., description="Name of the document file")
    file_type: str = Field(..., description="Type/extension of the document file")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the document")

    @validator('file_type')
    def validate_file_type(cls, file_type: str) -> str:
        """Validates that the file type is supported"""
        if file_type.lower() not in ALLOWED_FILE_TYPES:
            raise ValueError(f"Unsupported file type. Supported types: {', '.join(ALLOWED_FILE_TYPES)}")
        return file_type.lower()

class DocumentCreate(DocumentBase):
    """Schema for creating a new document record"""
    storage_path: str = Field(..., description="Path where the document file is stored")

class DocumentResponse(BaseModel):
    """Schema for document response data"""
    id: uuid.UUID = Field(..., description="Unique identifier for the document")
    filename: str = Field(..., description="Name of the document file")
    file_type: str = Field(..., description="Type/extension of the document file")
    storage_path: str = Field(..., description="Path where the document file is stored")
    created_at: datetime = Field(..., description="Timestamp when the document was created")
    processed: bool = Field(..., description="Whether the document has been processed")
    summary: Optional[str] = Field(None, description="Summary of the document content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the document")

class DocumentChunk(BaseModel):
    """Schema for a chunk of a processed document"""
    document_id: uuid.UUID = Field(..., description="ID of the parent document")
    chunk_index: int = Field(..., description="Index of this chunk within the document")
    content: str = Field(..., description="Text content of the chunk")
    page_number: Optional[int] = Field(None, description="Page number in the original document")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata for the chunk")

class DocumentProcessRequest(BaseModel):
    """Schema for document processing request"""
    document_id: uuid.UUID = Field(..., description="ID of the document to process")
    store_in_memory: bool = Field(True, description="Whether to store the document in memory after processing")
    generate_summary: bool = Field(True, description="Whether to generate a summary of the document")
    processing_options: Optional[Dict[str, Any]] = Field(None, description="Additional processing options")

class DocumentProcessResponse(BaseModel):
    """Schema for document processing response"""
    document_id: uuid.UUID = Field(..., description="ID of the processed document")
    success: bool = Field(..., description="Whether the processing was successful")
    summary: Optional[str] = Field(None, description="Generated summary of the document")
    memory_items: Optional[List[str]] = Field(None, description="IDs of memory items created from the document")
    error: Optional[str] = Field(None, description="Error message if processing failed")

class DocumentUploadResponse(BaseModel):
    """Schema for document upload response"""
    document_id: uuid.UUID = Field(..., description="ID of the uploaded document")
    filename: str = Field(..., description="Name of the uploaded file")
    success: bool = Field(..., description="Whether the upload was successful")
    error: Optional[str] = Field(None, description="Error message if upload failed")