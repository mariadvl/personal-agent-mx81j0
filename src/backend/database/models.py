"""
Database models for the Personal AI Agent.

This module defines SQLAlchemy ORM models that represent the database schema
for storing conversations, messages, memory items, documents, web pages, and
user settings. These models form the foundation for the local-first storage approach,
enabling efficient data persistence and retrieval.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid
import json

from sqlalchemy import String, Boolean, Integer, Float, Text, JSON, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# Valid categories for memory items
MEMORY_CATEGORIES = ['conversation', 'document', 'web', 'important', 'user_defined']


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class Conversation(Base):
    """Model for storing conversation metadata."""
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    messages: Mapped[List["Message"]] = relationship(
        "Message", back_populates="conversation", cascade="all, delete-orphan"
    )

    def __init__(self, title: str, summary: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new conversation.
        
        Args:
            title: The conversation title
            summary: Optional summary of the conversation
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.title = title
        self.summary = summary
        self.metadata = metadata or {}

    def to_dict(self, include_messages: bool = False) -> Dict[str, Any]:
        """Convert the conversation to a dictionary.
        
        Args:
            include_messages: Whether to include messages in the output

        Returns:
            Dictionary representation of the conversation
        """
        result = {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "title": self.title,
            "summary": self.summary,
            "metadata": self.metadata,
        }
        
        if include_messages:
            result["messages"] = [message.to_dict() for message in self.messages]
            
        return result

    def update(self, updates: Dict[str, Any]) -> None:
        """Update conversation attributes.
        
        Args:
            updates: Dictionary of attributes to update
        """
        if "title" in updates:
            self.title = updates["title"]
        if "summary" in updates:
            self.summary = updates["summary"]
        if "metadata" in updates:
            self.metadata = updates["metadata"]
        
        self.updated_at = datetime.now()


class Message(Base):
    """Model for storing conversation messages."""
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    role: Mapped[str] = mapped_column(String(20))  # 'user', 'assistant', 'system'
    content: Mapped[str] = mapped_column(Text)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")

    def __init__(self, conversation_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new message.
        
        Args:
            conversation_id: ID of the parent conversation
            role: Message role (user, assistant, system)
            content: Message text content
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.conversation_id = conversation_id
        self.created_at = datetime.now()
        self.role = role
        self.content = content
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert the message to a dictionary.
        
        Returns:
            Dictionary representation of the message
        """
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "created_at": self.created_at.isoformat(),
            "role": self.role,
            "content": self.content,
            "metadata": self.metadata,
        }


class MemoryItem(Base):
    """Model for storing memory items for context retrieval."""
    __tablename__ = "memory_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50))
    source_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # 'conversation', 'document', 'web', etc.
    source_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    importance: Mapped[int] = mapped_column(Integer, default=1)  # 1-5, higher is more important
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    def __init__(self, content: str, category: str, source_type: Optional[str] = None, 
                 source_id: Optional[str] = None, importance: Optional[int] = None, 
                 metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new memory item.
        
        Args:
            content: The content text
            category: Category of memory (must be in MEMORY_CATEGORIES)
            source_type: Type of source (conversation, document, web)
            source_id: ID of the source item
            importance: Importance ranking (1-5)
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.content = content
        
        # Validate category
        if category not in MEMORY_CATEGORIES:
            raise ValueError(f"Category must be one of {MEMORY_CATEGORIES}")
        self.category = category
        
        self.source_type = source_type
        self.source_id = source_id
        self.importance = importance or 1
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert the memory item to a dictionary.
        
        Returns:
            Dictionary representation of the memory item
        """
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "content": self.content,
            "category": self.category,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "importance": self.importance,
            "metadata": self.metadata,
        }

    def update(self, updates: Dict[str, Any]) -> None:
        """Update memory item attributes.
        
        Args:
            updates: Dictionary of attributes to update
        """
        if "content" in updates:
            self.content = updates["content"]
        if "category" in updates and updates["category"] in MEMORY_CATEGORIES:
            self.category = updates["category"]
        if "importance" in updates:
            self.importance = updates["importance"]
        if "metadata" in updates:
            self.metadata = updates["metadata"]


class Document(Base):
    """Model for storing document metadata."""
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50))  # pdf, docx, txt, etc.
    storage_path: Mapped[str] = mapped_column(String(512))
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    chunks: Mapped[List["DocumentChunk"]] = relationship(
        "DocumentChunk", back_populates="document", cascade="all, delete-orphan"
    )

    def __init__(self, filename: str, file_type: str, storage_path: str, metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new document.
        
        Args:
            filename: Original filename
            file_type: File type/extension
            storage_path: Path where the file is stored
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.filename = filename
        self.file_type = file_type
        self.storage_path = storage_path
        self.processed = False
        self.summary = None
        self.metadata = metadata or {}

    def to_dict(self, include_chunks: bool = False) -> Dict[str, Any]:
        """Convert the document to a dictionary.
        
        Args:
            include_chunks: Whether to include document chunks in the output

        Returns:
            Dictionary representation of the document
        """
        result = {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "filename": self.filename,
            "file_type": self.file_type,
            "storage_path": self.storage_path,
            "processed": self.processed,
            "summary": self.summary,
            "metadata": self.metadata,
        }
        
        if include_chunks:
            result["chunks"] = [chunk.to_dict() for chunk in self.chunks]
            
        return result

    def mark_processed(self, summary: Optional[str] = None) -> None:
        """Mark the document as processed.
        
        Args:
            summary: Optional summary of the document
        """
        self.processed = True
        if summary:
            self.summary = summary


class DocumentChunk(Base):
    """Model for storing chunks of processed documents."""
    __tablename__ = "document_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    page_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")

    def __init__(self, document_id: str, chunk_index: int, content: str, 
                 page_number: Optional[int] = None, metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new document chunk.
        
        Args:
            document_id: ID of the parent document
            chunk_index: Sequential index of the chunk
            content: Text content of the chunk
            page_number: Optional page number for page-based documents
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.document_id = document_id
        self.chunk_index = chunk_index
        self.content = content
        self.page_number = page_number
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert the document chunk to a dictionary.
        
        Returns:
            Dictionary representation of the document chunk
        """
        return {
            "id": self.id,
            "document_id": self.document_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page_number": self.page_number,
            "metadata": self.metadata,
        }


class WebPage(Base):
    """Model for storing web page metadata."""
    __tablename__ = "web_pages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    last_accessed: Mapped[datetime] = mapped_column(default=func.now())
    url: Mapped[str] = mapped_column(String(2048))
    title: Mapped[str] = mapped_column(String(512))
    processed: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    chunks: Mapped[List["WebContentChunk"]] = relationship(
        "WebContentChunk", back_populates="web_page", cascade="all, delete-orphan"
    )

    def __init__(self, url: str, title: str, metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new web page.
        
        Args:
            url: Web page URL
            title: Web page title
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.last_accessed = datetime.now()
        self.url = url
        self.title = title
        self.processed = False
        self.metadata = metadata or {}

    def to_dict(self, include_chunks: bool = False) -> Dict[str, Any]:
        """Convert the web page to a dictionary.
        
        Args:
            include_chunks: Whether to include web content chunks in the output

        Returns:
            Dictionary representation of the web page
        """
        result = {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "last_accessed": self.last_accessed.isoformat(),
            "url": self.url,
            "title": self.title,
            "processed": self.processed,
            "metadata": self.metadata,
        }
        
        if include_chunks:
            result["chunks"] = [chunk.to_dict() for chunk in self.chunks]
            
        return result

    def update_last_accessed(self) -> None:
        """Update the last accessed timestamp."""
        self.last_accessed = datetime.now()

    def mark_processed(self) -> None:
        """Mark the web page as processed."""
        self.processed = True


class WebContentChunk(Base):
    """Model for storing chunks of processed web content."""
    __tablename__ = "web_content_chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    web_page_id: Mapped[str] = mapped_column(String(36), ForeignKey("web_pages.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    # Relationships
    web_page: Mapped["WebPage"] = relationship("WebPage", back_populates="chunks")

    def __init__(self, web_page_id: str, chunk_index: int, content: str, 
                 metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new web content chunk.
        
        Args:
            web_page_id: ID of the parent web page
            chunk_index: Sequential index of the chunk
            content: Text content of the chunk
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.web_page_id = web_page_id
        self.chunk_index = chunk_index
        self.content = content
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert the web content chunk to a dictionary.
        
        Returns:
            Dictionary representation of the web content chunk
        """
        return {
            "id": self.id,
            "web_page_id": self.web_page_id,
            "chunk_index": self.chunk_index,
            "content": self.content,
            "metadata": self.metadata,
        }


class UserSettings(Base):
    """Model for storing user settings."""
    __tablename__ = "user_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    voice_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    personality_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    privacy_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    storage_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    llm_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    search_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})
    memory_settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    def __init__(self):
        """Initialize with default settings."""
        self.id = str(uuid.uuid4())
        
        # Default voice settings
        self.voice_settings = {
            "enabled": False,
            "input_enabled": False,
            "output_enabled": False,
            "voice_id": "default",
            "speed": 1.0,
            "pitch": 1.0,
        }
        
        # Default personality settings
        self.personality_settings = {
            "name": "Assistant",
            "style": "helpful",
            "formality": "neutral",
            "verbosity": "balanced",
        }
        
        # Default privacy settings
        self.privacy_settings = {
            "local_storage_only": True,
            "analytics_enabled": False,
            "error_reporting": False,
            "web_search_enabled": True,
        }
        
        # Default storage settings
        self.storage_settings = {
            "base_path": "data",
            "backup_enabled": False,
            "backup_frequency": "weekly",
            "backup_count": 5,
        }
        
        # Default LLM settings
        self.llm_settings = {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.7,
            "max_tokens": 1000,
            "use_local_llm": False,
            "local_model_path": "",
        }
        
        # Default search settings
        self.search_settings = {
            "enabled": True,
            "provider": "duckduckgo",
            "max_results": 5,
        }
        
        # Default memory settings
        self.memory_settings = {
            "vector_db_path": "memory/vectors",
            "max_memory_items": 10000,
            "context_window_size": 10,
        }

    def to_dict(self) -> Dict[str, Any]:
        """Convert the user settings to a dictionary.
        
        Returns:
            Dictionary representation of the user settings
        """
        return {
            "id": self.id,
            "voice_settings": self.voice_settings,
            "personality_settings": self.personality_settings,
            "privacy_settings": self.privacy_settings,
            "storage_settings": self.storage_settings,
            "llm_settings": self.llm_settings,
            "search_settings": self.search_settings,
            "memory_settings": self.memory_settings,
        }

    def update(self, updates: Dict[str, Any]) -> None:
        """Update user settings.
        
        Args:
            updates: Dictionary of settings to update
        """
        if "voice_settings" in updates:
            self.voice_settings.update(updates["voice_settings"])
        
        if "personality_settings" in updates:
            self.personality_settings.update(updates["personality_settings"])
        
        if "privacy_settings" in updates:
            self.privacy_settings.update(updates["privacy_settings"])
        
        if "storage_settings" in updates:
            self.storage_settings.update(updates["storage_settings"])
        
        if "llm_settings" in updates:
            self.llm_settings.update(updates["llm_settings"])
        
        if "search_settings" in updates:
            self.search_settings.update(updates["search_settings"])
        
        if "memory_settings" in updates:
            self.memory_settings.update(updates["memory_settings"])


class VectorEmbedding(Base):
    """Model for tracking vector embeddings stored in the vector database."""
    __tablename__ = "vector_embeddings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    source_type: Mapped[str] = mapped_column(String(50))  # 'memory_item', 'document_chunk', 'web_content_chunk'
    source_id: Mapped[str] = mapped_column(String(36))
    embedding_model: Mapped[str] = mapped_column(String(100))  # Model used for embedding generation
    indexed: Mapped[bool] = mapped_column(Boolean, default=False)  # Whether it's been added to vector DB
    metadata: Mapped[Dict[str, Any]] = mapped_column(JSON, default={})

    def __init__(self, source_type: str, source_id: str, embedding_model: str, 
                 metadata: Optional[Dict[str, Any]] = None):
        """Initialize a new vector embedding record.
        
        Args:
            source_type: Type of the source (memory_item, document_chunk, etc.)
            source_id: ID of the source item
            embedding_model: Name of the embedding model used
            metadata: Optional additional metadata
        """
        self.id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.source_type = source_type
        self.source_id = source_id
        self.embedding_model = embedding_model
        self.indexed = False
        self.metadata = metadata or {}

    def mark_indexed(self) -> None:
        """Mark the embedding as indexed in the vector database."""
        self.indexed = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert the vector embedding to a dictionary.
        
        Returns:
            Dictionary representation of the vector embedding
        """
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "source_type": self.source_type,
            "source_id": self.source_id,
            "embedding_model": self.embedding_model,
            "indexed": self.indexed,
            "metadata": self.metadata,
        }