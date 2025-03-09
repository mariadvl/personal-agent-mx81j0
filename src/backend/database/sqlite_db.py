"""
SQLite database interface for the Personal AI Agent.

This module provides a robust interface to the SQLite database for storing
conversations, messages, memory items, documents, and user settings. It ensures
local-first data persistence with efficient querying capabilities while maintaining
data integrity and security.
"""

import os
import logging
import uuid
import datetime
import json
import typing
import shutil
from pathlib import Path

from sqlalchemy import create_engine, select, update, delete, func, and_, or_, desc
from sqlalchemy.orm import sessionmaker, Session

from ..database.models import (
    Base, Conversation, Message, MemoryItem, Document, DocumentChunk,
    WebPage, WebContentChunk, UserSettings, VectorEmbedding
)
from ..config.settings import Settings
from ..utils.encryption import encrypt_value, decrypt_value

# Configure logger
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()


def create_backup(db_path: str, backup_path: str) -> bool:
    """
    Creates a backup of the SQLite database.
    
    Args:
        db_path: Path to the database file
        backup_path: Path where the backup will be stored
        
    Returns:
        True if backup was successful, False otherwise
    """
    try:
        # Check if the database file exists
        if not os.path.exists(db_path):
            logger.error(f"Cannot backup database: file {db_path} does not exist")
            return False
            
        # Create backup directory if it doesn't exist
        backup_dir = os.path.dirname(backup_path)
        os.makedirs(backup_dir, exist_ok=True)
        
        # Copy database file to backup location
        shutil.copy2(db_path, backup_path)
        
        logger.info(f"Database backup created at {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Error creating database backup: {str(e)}")
        return False


def restore_from_backup(backup_path: str, db_path: str) -> bool:
    """
    Restores the SQLite database from a backup.
    
    Args:
        backup_path: Path to the backup file
        db_path: Path where the database will be restored
        
    Returns:
        True if restore was successful, False otherwise
    """
    try:
        # Check if the backup file exists
        if not os.path.exists(backup_path):
            logger.error(f"Cannot restore database: backup file {backup_path} does not exist")
            return False
            
        # Create database directory if it doesn't exist
        db_dir = os.path.dirname(db_path)
        os.makedirs(db_dir, exist_ok=True)
        
        # Copy backup file to database location
        shutil.copy2(backup_path, db_path)
        
        logger.info(f"Database restored from backup {backup_path}")
        return True
    except Exception as e:
        logger.error(f"Error restoring database from backup: {str(e)}")
        return False


class SQLiteDatabase:
    """
    Manages SQLite database operations for the Personal AI Agent.
    
    This class provides a comprehensive interface for all database operations,
    including CRUD operations for conversations, messages, memory items,
    documents, web pages, and user settings.
    """
    
    def __init__(self, db_path: str = None, encryption_enabled: bool = None):
        """
        Initializes the SQLite database with the specified path.
        
        Args:
            db_path: Path to the SQLite database file. If not provided, the path from settings is used.
            encryption_enabled: Whether to encrypt sensitive data. If not provided, the value from settings is used.
        """
        try:
            # Get database path from settings if not provided
            self.db_path = db_path or settings.get('storage.database_path', 'data/personal_ai.db')
            
            # Get encryption setting if not provided
            self.encryption_enabled = encryption_enabled if encryption_enabled is not None else settings.get('privacy.encrypt_data', True)
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            # Create SQLite engine
            db_url = f"sqlite:///{self.db_path}"
            self.engine = create_engine(db_url, connect_args={"check_same_thread": False})
            
            # Create tables if they don't exist
            self.create_tables()
            
            # Create session factory
            self.Session = sessionmaker(bind=self.engine)
            
            logger.info(f"Initialized SQLite database at {self.db_path}")
        except Exception as e:
            logger.error(f"Error initializing SQLite database: {str(e)}")
            raise
    
    def create_tables(self) -> None:
        """
        Creates database tables if they don't exist.
        """
        try:
            Base.metadata.create_all(self.engine)
            logger.debug("Created database tables")
        except Exception as e:
            logger.error(f"Error creating database tables: {str(e)}")
            raise
    
    def get_session(self) -> Session:
        """
        Gets a new database session.
        
        Returns:
            SQLAlchemy session object
        """
        return self.Session()
    
    async def get_conversation(self, conversation_id: uuid.UUID, include_messages: bool = False) -> typing.Optional[dict]:
        """
        Retrieves a conversation by ID.
        
        Args:
            conversation_id: ID of the conversation to retrieve
            include_messages: Whether to include messages in the result
            
        Returns:
            Conversation data or None if not found
        """
        session = self.get_session()
        try:
            # Query for conversation
            conversation = session.query(Conversation).filter(Conversation.id == str(conversation_id)).first()
            
            if conversation:
                return conversation.to_dict(include_messages=include_messages)
            else:
                return None
        except Exception as e:
            logger.error(f"Error retrieving conversation {conversation_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def get_conversations(self, filters: dict = None, limit: int = 100, offset: int = 0) -> list:
        """
        Retrieves multiple conversations with optional filtering.
        
        Args:
            filters: Optional filters to apply (dict of field: value)
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip
            
        Returns:
            List of conversation dictionaries
        """
        session = self.get_session()
        try:
            # Build query
            query = select(Conversation)
            
            # Apply filters if provided
            if filters:
                filter_conditions = []
                for field, value in filters.items():
                    if field == 'title':
                        filter_conditions.append(Conversation.title.ilike(f"%{value}%"))
                    elif field == 'created_after':
                        filter_conditions.append(Conversation.created_at >= value)
                    elif field == 'created_before':
                        filter_conditions.append(Conversation.created_at <= value)
                    elif field == 'metadata':
                        # This is simplified and might need adjustment depending on how JSON querying works
                        for meta_key, meta_value in value.items():
                            filter_conditions.append(Conversation.metadata[meta_key].as_string() == str(meta_value))
                
                if filter_conditions:
                    query = query.where(and_(*filter_conditions))
            
            # Apply ordering, limit and offset
            query = query.order_by(desc(Conversation.updated_at)).offset(offset).limit(limit)
            
            # Execute query
            result = session.execute(query).scalars().all()
            
            # Convert to dictionaries
            conversations = [conversation.to_dict() for conversation in result]
            
            return conversations
        except Exception as e:
            logger.error(f"Error retrieving conversations: {str(e)}")
            return []
        finally:
            session.close()
    
    async def create_conversation(self, title: str, summary: str = None, metadata: dict = None) -> dict:
        """
        Creates a new conversation.
        
        Args:
            title: Title of the conversation
            summary: Optional summary of the conversation
            metadata: Optional additional metadata
            
        Returns:
            Created conversation data
        """
        session = self.get_session()
        try:
            # Create new conversation
            conversation = Conversation(
                title=title,
                summary=summary,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(conversation)
            session.commit()
            
            # Return as dictionary
            return conversation.to_dict()
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating conversation: {str(e)}")
            raise
        finally:
            session.close()
    
    async def update_conversation(self, conversation_id: uuid.UUID, updates: dict) -> typing.Optional[dict]:
        """
        Updates an existing conversation.
        
        Args:
            conversation_id: ID of the conversation to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated conversation data or None if not found
        """
        session = self.get_session()
        try:
            # Query for conversation
            conversation = session.query(Conversation).filter(Conversation.id == str(conversation_id)).first()
            
            if conversation:
                # Update fields
                conversation.update(updates)
                
                # Commit changes
                session.commit()
                
                # Return updated conversation
                return conversation.to_dict()
            else:
                return None
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating conversation {conversation_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        """
        Deletes a conversation and its messages.
        
        Args:
            conversation_id: ID of the conversation to delete
            
        Returns:
            True if successful, False if not found
        """
        session = self.get_session()
        try:
            # Query for conversation
            conversation = session.query(Conversation).filter(Conversation.id == str(conversation_id)).first()
            
            if conversation:
                # Delete conversation (cascades to messages)
                session.delete(conversation)
                session.commit()
                return True
            else:
                return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting conversation {conversation_id}: {str(e)}")
            return False
        finally:
            session.close()
    
    async def get_messages(self, conversation_id: uuid.UUID, limit: int = 100, offset: int = 0) -> list:
        """
        Retrieves messages for a conversation.
        
        Args:
            conversation_id: ID of the conversation
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of message dictionaries
        """
        session = self.get_session()
        try:
            # Query for messages
            query = select(Message).where(
                Message.conversation_id == str(conversation_id)
            ).order_by(
                Message.created_at
            ).offset(offset).limit(limit)
            
            # Execute query
            result = session.execute(query).scalars().all()
            
            # Convert to dictionaries and decrypt content if needed
            messages = []
            for message in result:
                message_dict = message.to_dict()
                
                # Decrypt content if encrypted
                if self.encryption_enabled and message.role != 'system':
                    try:
                        encrypted_content = message_dict['content']
                        if isinstance(encrypted_content, str) and encrypted_content.startswith('b64:'):
                            encrypted_bytes = base64.b64decode(encrypted_content[4:])
                            decrypted_bytes = decrypt_value(encrypted_bytes)
                            message_dict['content'] = decrypted_bytes.decode('utf-8')
                    except Exception as e:
                        logger.error(f"Error decrypting message content: {str(e)}")
                
                messages.append(message_dict)
            
            return messages
        except Exception as e:
            logger.error(f"Error retrieving messages for conversation {conversation_id}: {str(e)}")
            return []
        finally:
            session.close()
    
    async def create_message(self, conversation_id: uuid.UUID, role: str, content: str, metadata: dict = None) -> dict:
        """
        Creates a new message in a conversation.
        
        Args:
            conversation_id: ID of the conversation
            role: Message role (user, assistant, system)
            content: Message content
            metadata: Optional additional metadata
            
        Returns:
            Created message data
        """
        session = self.get_session()
        try:
            # Encrypt content if enabled (except for system messages)
            if self.encryption_enabled and role != 'system':
                try:
                    content_bytes = content.encode('utf-8')
                    encrypted_bytes = encrypt_value(content_bytes)
                    # Store as base64 with prefix to indicate encryption
                    content = f"b64:{base64.b64encode(encrypted_bytes).decode('utf-8')}"
                except Exception as e:
                    logger.error(f"Error encrypting message content: {str(e)}")
            
            # Create new message
            message = Message(
                conversation_id=str(conversation_id),
                role=role,
                content=content,
                metadata=metadata or {}
            )
            
            # Add to session
            session.add(message)
            
            # Update conversation's updated_at timestamp
            conversation = session.query(Conversation).filter(Conversation.id == str(conversation_id)).first()
            if conversation:
                conversation.updated_at = datetime.datetime.now()
            
            # Commit changes
            session.commit()
            
            # Return as dictionary
            message_dict = message.to_dict()
            
            # Decrypt content if it was just encrypted
            if self.encryption_enabled and role != 'system':
                try:
                    if message_dict['content'].startswith('b64:'):
                        message_dict['content'] = content  # Return original content
                except Exception:
                    pass
            
            return message_dict
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating message: {str(e)}")
            raise
        finally:
            session.close()
    
    async def get_memory_items(self, filters: dict = None, limit: int = 100, offset: int = 0) -> list:
        """
        Retrieves memory items with optional filtering.
        
        Args:
            filters: Optional filters to apply (dict of field: value)
            limit: Maximum number of items to return
            offset: Number of items to skip
            
        Returns:
            List of memory item dictionaries
        """
        session = self.get_session()
        try:
            # Build query
            query = select(MemoryItem)
            
            # Apply filters if provided
            if filters:
                filter_conditions = []
                for field, value in filters.items():
                    if field == 'category':
                        if isinstance(value, list):
                            filter_conditions.append(MemoryItem.category.in_(value))
                        else:
                            filter_conditions.append(MemoryItem.category == value)
                    elif field == 'source_type':
                        filter_conditions.append(MemoryItem.source_type == value)
                    elif field == 'source_id':
                        filter_conditions.append(MemoryItem.source_id == str(value))
                    elif field == 'importance':
                        filter_conditions.append(MemoryItem.importance >= value)
                    elif field == 'created_after':
                        filter_conditions.append(MemoryItem.created_at >= value)
                    elif field == 'created_before':
                        filter_conditions.append(MemoryItem.created_at <= value)
                    elif field == 'content_contains':
                        filter_conditions.append(MemoryItem.content.ilike(f"%{value}%"))
                
                if filter_conditions:
                    query = query.where(and_(*filter_conditions))
            
            # Apply ordering, limit and offset
            query = query.order_by(desc(MemoryItem.created_at)).offset(offset).limit(limit)
            
            # Execute query
            result = session.execute(query).scalars().all()
            
            # Convert to dictionaries and decrypt content if needed
            memory_items = []
            for item in result:
                item_dict = item.to_dict()
                
                # Decrypt content if encrypted
                if self.encryption_enabled:
                    try:
                        encrypted_content = item_dict['content']
                        if isinstance(encrypted_content, str) and encrypted_content.startswith('b64:'):
                            encrypted_bytes = base64.b64decode(encrypted_content[4:])
                            decrypted_bytes = decrypt_value(encrypted_bytes)
                            item_dict['content'] = decrypted_bytes.decode('utf-8')
                    except Exception as e:
                        logger.error(f"Error decrypting memory item content: {str(e)}")
                
                memory_items.append(item_dict)
            
            return memory_items
        except Exception as e:
            logger.error(f"Error retrieving memory items: {str(e)}")
            return []
        finally:
            session.close()
    
    async def create_memory_item(self, content: str, category: str, source_type: str = None, 
                                source_id: uuid.UUID = None, importance: int = 1, metadata: dict = None) -> dict:
        """
        Creates a new memory item.
        
        Args:
            content: Content of the memory item
            category: Category of the memory item
            source_type: Type of the source (conversation, document, web, etc.)
            source_id: ID of the source
            importance: Importance rating (1-5)
            metadata: Optional additional metadata
            
        Returns:
            Created memory item data
        """
        session = self.get_session()
        try:
            # Encrypt content if enabled
            if self.encryption_enabled:
                try:
                    content_bytes = content.encode('utf-8')
                    encrypted_bytes = encrypt_value(content_bytes)
                    # Store as base64 with prefix to indicate encryption
                    content = f"b64:{base64.b64encode(encrypted_bytes).decode('utf-8')}"
                except Exception as e:
                    logger.error(f"Error encrypting memory item content: {str(e)}")
            
            # Create new memory item
            memory_item = MemoryItem(
                content=content,
                category=category,
                source_type=source_type,
                source_id=str(source_id) if source_id else None,
                importance=importance,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(memory_item)
            session.commit()
            
            # Return as dictionary
            memory_dict = memory_item.to_dict()
            
            # Decrypt content if it was just encrypted
            if self.encryption_enabled:
                try:
                    if memory_dict['content'].startswith('b64:'):
                        memory_dict['content'] = content  # Return original content
                except Exception:
                    pass
            
            return memory_dict
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating memory item: {str(e)}")
            raise
        finally:
            session.close()
    
    async def update_memory_item(self, memory_id: uuid.UUID, updates: dict) -> typing.Optional[dict]:
        """
        Updates an existing memory item.
        
        Args:
            memory_id: ID of the memory item to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated memory item data or None if not found
        """
        session = self.get_session()
        try:
            # Query for memory item
            memory_item = session.query(MemoryItem).filter(MemoryItem.id == str(memory_id)).first()
            
            if memory_item:
                # Handle content encryption if being updated
                if 'content' in updates and self.encryption_enabled:
                    try:
                        content_bytes = updates['content'].encode('utf-8')
                        encrypted_bytes = encrypt_value(content_bytes)
                        # Store as base64 with prefix to indicate encryption
                        updates['content'] = f"b64:{base64.b64encode(encrypted_bytes).decode('utf-8')}"
                    except Exception as e:
                        logger.error(f"Error encrypting updated memory item content: {str(e)}")
                
                # Update fields
                memory_item.update(updates)
                
                # Commit changes
                session.commit()
                
                # Return updated memory item
                memory_dict = memory_item.to_dict()
                
                # Decrypt content for return value
                if self.encryption_enabled:
                    try:
                        encrypted_content = memory_dict['content']
                        if isinstance(encrypted_content, str) and encrypted_content.startswith('b64:'):
                            memory_dict['content'] = updates.get('content', '')  # Return original content
                    except Exception:
                        pass
                
                return memory_dict
            else:
                return None
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating memory item {memory_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def delete_memory_item(self, memory_id: uuid.UUID) -> bool:
        """
        Deletes a memory item.
        
        Args:
            memory_id: ID of the memory item to delete
            
        Returns:
            True if successful, False if not found
        """
        session = self.get_session()
        try:
            # Query for memory item
            memory_item = session.query(MemoryItem).filter(MemoryItem.id == str(memory_id)).first()
            
            if memory_item:
                # Delete memory item
                session.delete(memory_item)
                session.commit()
                return True
            else:
                return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting memory item {memory_id}: {str(e)}")
            return False
        finally:
            session.close()
    
    async def get_document(self, document_id: uuid.UUID, include_chunks: bool = False) -> typing.Optional[dict]:
        """
        Retrieves a document by ID.
        
        Args:
            document_id: ID of the document to retrieve
            include_chunks: Whether to include document chunks in the result
            
        Returns:
            Document data or None if not found
        """
        session = self.get_session()
        try:
            # Query for document
            document = session.query(Document).filter(Document.id == str(document_id)).first()
            
            if document:
                return document.to_dict(include_chunks=include_chunks)
            else:
                return None
        except Exception as e:
            logger.error(f"Error retrieving document {document_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def get_documents(self, filters: dict = None, limit: int = 100, offset: int = 0) -> list:
        """
        Retrieves multiple documents with optional filtering.
        
        Args:
            filters: Optional filters to apply (dict of field: value)
            limit: Maximum number of documents to return
            offset: Number of documents to skip
            
        Returns:
            List of document dictionaries
        """
        session = self.get_session()
        try:
            # Build query
            query = select(Document)
            
            # Apply filters if provided
            if filters:
                filter_conditions = []
                for field, value in filters.items():
                    if field == 'filename':
                        filter_conditions.append(Document.filename.ilike(f"%{value}%"))
                    elif field == 'file_type':
                        if isinstance(value, list):
                            filter_conditions.append(Document.file_type.in_(value))
                        else:
                            filter_conditions.append(Document.file_type == value)
                    elif field == 'processed':
                        filter_conditions.append(Document.processed == value)
                    elif field == 'created_after':
                        filter_conditions.append(Document.created_at >= value)
                    elif field == 'created_before':
                        filter_conditions.append(Document.created_at <= value)
                
                if filter_conditions:
                    query = query.where(and_(*filter_conditions))
            
            # Apply ordering, limit and offset
            query = query.order_by(desc(Document.created_at)).offset(offset).limit(limit)
            
            # Execute query
            result = session.execute(query).scalars().all()
            
            # Convert to dictionaries
            documents = [document.to_dict() for document in result]
            
            return documents
        except Exception as e:
            logger.error(f"Error retrieving documents: {str(e)}")
            return []
        finally:
            session.close()
    
    async def create_document(self, filename: str, file_type: str, storage_path: str, metadata: dict = None) -> dict:
        """
        Creates a new document record.
        
        Args:
            filename: Original filename
            file_type: File type/extension
            storage_path: Path where the file is stored
            metadata: Optional additional metadata
            
        Returns:
            Created document data
        """
        session = self.get_session()
        try:
            # Create new document
            document = Document(
                filename=filename,
                file_type=file_type,
                storage_path=storage_path,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(document)
            session.commit()
            
            # Return as dictionary
            return document.to_dict()
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating document: {str(e)}")
            raise
        finally:
            session.close()
    
    async def update_document(self, document_id: uuid.UUID, updates: dict) -> typing.Optional[dict]:
        """
        Updates an existing document.
        
        Args:
            document_id: ID of the document to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated document data or None if not found
        """
        session = self.get_session()
        try:
            # Query for document
            document = session.query(Document).filter(Document.id == str(document_id)).first()
            
            if document:
                # Update fields
                if 'filename' in updates:
                    document.filename = updates['filename']
                if 'file_type' in updates:
                    document.file_type = updates['file_type']
                if 'storage_path' in updates:
                    document.storage_path = updates['storage_path']
                if 'processed' in updates:
                    document.processed = updates['processed']
                if 'summary' in updates:
                    document.summary = updates['summary']
                if 'metadata' in updates:
                    document.metadata = updates['metadata']
                
                # Commit changes
                session.commit()
                
                # Return updated document
                return document.to_dict()
            else:
                return None
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating document {document_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def delete_document(self, document_id: uuid.UUID) -> bool:
        """
        Deletes a document and its chunks.
        
        Args:
            document_id: ID of the document to delete
            
        Returns:
            True if successful, False if not found
        """
        session = self.get_session()
        try:
            # Query for document
            document = session.query(Document).filter(Document.id == str(document_id)).first()
            
            if document:
                # Delete document (cascades to chunks)
                session.delete(document)
                session.commit()
                return True
            else:
                return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            return False
        finally:
            session.close()
    
    async def create_document_chunk(self, document_id: uuid.UUID, chunk_index: int, content: str, 
                                   page_number: int = None, metadata: dict = None) -> dict:
        """
        Creates a new document chunk.
        
        Args:
            document_id: ID of the parent document
            chunk_index: Index of the chunk within the document
            content: Text content of the chunk
            page_number: Optional page number for page-based documents
            metadata: Optional additional metadata
            
        Returns:
            Created document chunk data
        """
        session = self.get_session()
        try:
            # Encrypt content if enabled
            if self.encryption_enabled:
                try:
                    content_bytes = content.encode('utf-8')
                    encrypted_bytes = encrypt_value(content_bytes)
                    # Store as base64 with prefix to indicate encryption
                    content = f"b64:{base64.b64encode(encrypted_bytes).decode('utf-8')}"
                except Exception as e:
                    logger.error(f"Error encrypting document chunk content: {str(e)}")
            
            # Create new document chunk
            document_chunk = DocumentChunk(
                document_id=str(document_id),
                chunk_index=chunk_index,
                content=content,
                page_number=page_number,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(document_chunk)
            session.commit()
            
            # Return as dictionary
            chunk_dict = document_chunk.to_dict()
            
            # Decrypt content if it was just encrypted
            if self.encryption_enabled:
                try:
                    if chunk_dict['content'].startswith('b64:'):
                        chunk_dict['content'] = content  # Return original content
                except Exception:
                    pass
            
            return chunk_dict
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating document chunk: {str(e)}")
            raise
        finally:
            session.close()
    
    async def get_web_page(self, web_page_id: uuid.UUID, include_chunks: bool = False) -> typing.Optional[dict]:
        """
        Retrieves a web page by ID.
        
        Args:
            web_page_id: ID of the web page to retrieve
            include_chunks: Whether to include web content chunks in the result
            
        Returns:
            Web page data or None if not found
        """
        session = self.get_session()
        try:
            # Query for web page
            web_page = session.query(WebPage).filter(WebPage.id == str(web_page_id)).first()
            
            if web_page:
                web_page.update_last_accessed()
                session.commit()
                return web_page.to_dict(include_chunks=include_chunks)
            else:
                return None
        except Exception as e:
            logger.error(f"Error retrieving web page {web_page_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def get_web_pages(self, filters: dict = None, limit: int = 100, offset: int = 0) -> list:
        """
        Retrieves multiple web pages with optional filtering.
        
        Args:
            filters: Optional filters to apply (dict of field: value)
            limit: Maximum number of web pages to return
            offset: Number of web pages to skip
            
        Returns:
            List of web page dictionaries
        """
        session = self.get_session()
        try:
            # Build query
            query = select(WebPage)
            
            # Apply filters if provided
            if filters:
                filter_conditions = []
                for field, value in filters.items():
                    if field == 'url':
                        filter_conditions.append(WebPage.url.ilike(f"%{value}%"))
                    elif field == 'title':
                        filter_conditions.append(WebPage.title.ilike(f"%{value}%"))
                    elif field == 'processed':
                        filter_conditions.append(WebPage.processed == value)
                    elif field == 'created_after':
                        filter_conditions.append(WebPage.created_at >= value)
                    elif field == 'created_before':
                        filter_conditions.append(WebPage.created_at <= value)
                    elif field == 'accessed_after':
                        filter_conditions.append(WebPage.last_accessed >= value)
                    elif field == 'accessed_before':
                        filter_conditions.append(WebPage.last_accessed <= value)
                
                if filter_conditions:
                    query = query.where(and_(*filter_conditions))
            
            # Apply ordering, limit and offset
            query = query.order_by(desc(WebPage.last_accessed)).offset(offset).limit(limit)
            
            # Execute query
            result = session.execute(query).scalars().all()
            
            # Convert to dictionaries
            web_pages = [web_page.to_dict() for web_page in result]
            
            return web_pages
        except Exception as e:
            logger.error(f"Error retrieving web pages: {str(e)}")
            return []
        finally:
            session.close()
    
    async def create_web_page(self, url: str, title: str, metadata: dict = None) -> dict:
        """
        Creates a new web page record.
        
        Args:
            url: URL of the web page
            title: Title of the web page
            metadata: Optional additional metadata
            
        Returns:
            Created web page data
        """
        session = self.get_session()
        try:
            # Create new web page
            web_page = WebPage(
                url=url,
                title=title,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(web_page)
            session.commit()
            
            # Return as dictionary
            return web_page.to_dict()
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating web page: {str(e)}")
            raise
        finally:
            session.close()
    
    async def update_web_page(self, web_page_id: uuid.UUID, updates: dict) -> typing.Optional[dict]:
        """
        Updates an existing web page.
        
        Args:
            web_page_id: ID of the web page to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated web page data or None if not found
        """
        session = self.get_session()
        try:
            # Query for web page
            web_page = session.query(WebPage).filter(WebPage.id == str(web_page_id)).first()
            
            if web_page:
                # Update fields
                if 'url' in updates:
                    web_page.url = updates['url']
                if 'title' in updates:
                    web_page.title = updates['title']
                if 'processed' in updates:
                    web_page.processed = updates['processed']
                if 'metadata' in updates:
                    web_page.metadata = updates['metadata']
                
                # Always update last_accessed
                web_page.update_last_accessed()
                
                # Commit changes
                session.commit()
                
                # Return updated web page
                return web_page.to_dict()
            else:
                return None
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating web page {web_page_id}: {str(e)}")
            return None
        finally:
            session.close()
    
    async def delete_web_page(self, web_page_id: uuid.UUID) -> bool:
        """
        Deletes a web page and its chunks.
        
        Args:
            web_page_id: ID of the web page to delete
            
        Returns:
            True if successful, False if not found
        """
        session = self.get_session()
        try:
            # Query for web page
            web_page = session.query(WebPage).filter(WebPage.id == str(web_page_id)).first()
            
            if web_page:
                # Delete web page (cascades to chunks)
                session.delete(web_page)
                session.commit()
                return True
            else:
                return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error deleting web page {web_page_id}: {str(e)}")
            return False
        finally:
            session.close()
    
    async def create_web_content_chunk(self, web_page_id: uuid.UUID, chunk_index: int, content: str, 
                                      metadata: dict = None) -> dict:
        """
        Creates a new web content chunk.
        
        Args:
            web_page_id: ID of the parent web page
            chunk_index: Index of the chunk within the web page
            content: Text content of the chunk
            metadata: Optional additional metadata
            
        Returns:
            Created web content chunk data
        """
        session = self.get_session()
        try:
            # Encrypt content if enabled
            if self.encryption_enabled:
                try:
                    content_bytes = content.encode('utf-8')
                    encrypted_bytes = encrypt_value(content_bytes)
                    # Store as base64 with prefix to indicate encryption
                    content = f"b64:{base64.b64encode(encrypted_bytes).decode('utf-8')}"
                except Exception as e:
                    logger.error(f"Error encrypting web content chunk: {str(e)}")
            
            # Create new web content chunk
            web_content_chunk = WebContentChunk(
                web_page_id=str(web_page_id),
                chunk_index=chunk_index,
                content=content,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(web_content_chunk)
            session.commit()
            
            # Return as dictionary
            chunk_dict = web_content_chunk.to_dict()
            
            # Decrypt content if it was just encrypted
            if self.encryption_enabled:
                try:
                    if chunk_dict['content'].startswith('b64:'):
                        chunk_dict['content'] = content  # Return original content
                except Exception:
                    pass
            
            return chunk_dict
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating web content chunk: {str(e)}")
            raise
        finally:
            session.close()
    
    async def get_user_settings(self) -> dict:
        """
        Retrieves user settings or creates default if not found.
        
        Returns:
            User settings data
        """
        session = self.get_session()
        try:
            # Query for user settings (there should only be one record)
            user_settings = session.query(UserSettings).first()
            
            # If no settings exist, create default settings
            if not user_settings:
                user_settings = UserSettings()
                session.add(user_settings)
                session.commit()
            
            # Return as dictionary
            return user_settings.to_dict()
        except Exception as e:
            logger.error(f"Error retrieving user settings: {str(e)}")
            # Create minimal default settings
            return {
                "voice_settings": {"enabled": False},
                "personality_settings": {"name": "Assistant"},
                "privacy_settings": {"local_storage_only": True},
                "storage_settings": {"base_path": "data"},
                "llm_settings": {"provider": "openai"},
                "search_settings": {"enabled": True},
                "memory_settings": {"context_window_size": 10}
            }
        finally:
            session.close()
    
    async def update_user_settings(self, updates: dict) -> dict:
        """
        Updates user settings.
        
        Args:
            updates: Dictionary of settings to update
            
        Returns:
            Updated user settings data
        """
        session = self.get_session()
        try:
            # Query for user settings
            user_settings = session.query(UserSettings).first()
            
            # If no settings exist, create default settings
            if not user_settings:
                user_settings = UserSettings()
                session.add(user_settings)
            
            # Update settings
            user_settings.update(updates)
            
            # Commit changes
            session.commit()
            
            # Return updated settings
            return user_settings.to_dict()
        except Exception as e:
            session.rollback()
            logger.error(f"Error updating user settings: {str(e)}")
            return await self.get_user_settings()  # Fall back to current settings
        finally:
            session.close()
    
    async def create_vector_embedding_record(self, source_type: str, source_id: uuid.UUID, 
                                           embedding_model: str, metadata: dict = None) -> dict:
        """
        Creates a record of a vector embedding in the vector database.
        
        Args:
            source_type: Type of the source (memory_item, document_chunk, web_content_chunk)
            source_id: ID of the source item
            embedding_model: Model used to generate the embedding
            metadata: Optional additional metadata
            
        Returns:
            Created vector embedding record data
        """
        session = self.get_session()
        try:
            # Create new vector embedding record
            vector_embedding = VectorEmbedding(
                source_type=source_type,
                source_id=str(source_id),
                embedding_model=embedding_model,
                metadata=metadata or {}
            )
            
            # Add to session and commit
            session.add(vector_embedding)
            session.commit()
            
            # Return as dictionary
            return vector_embedding.to_dict()
        except Exception as e:
            session.rollback()
            logger.error(f"Error creating vector embedding record: {str(e)}")
            raise
        finally:
            session.close()
    
    async def mark_vector_as_indexed(self, vector_id: uuid.UUID) -> bool:
        """
        Marks a vector embedding as indexed in the vector database.
        
        Args:
            vector_id: ID of the vector embedding record
            
        Returns:
            True if successful, False if not found
        """
        session = self.get_session()
        try:
            # Query for vector embedding
            vector_embedding = session.query(VectorEmbedding).filter(VectorEmbedding.id == str(vector_id)).first()
            
            if vector_embedding:
                # Mark as indexed
                vector_embedding.mark_indexed()
                
                # Commit changes
                session.commit()
                return True
            else:
                return False
        except Exception as e:
            session.rollback()
            logger.error(f"Error marking vector as indexed {vector_id}: {str(e)}")
            return False
        finally:
            session.close()
    
    async def count_records(self, model_class: type, filters: dict = None) -> int:
        """
        Counts records in a table with optional filtering.
        
        Args:
            model_class: The SQLAlchemy model class to count
            filters: Optional filters to apply (dict of field: value)
            
        Returns:
            Count of records
        """
        session = self.get_session()
        try:
            # Build query
            query = select(func.count()).select_from(model_class)
            
            # Apply filters if provided
            if filters:
                filter_conditions = []
                for field, value in filters.items():
                    if hasattr(model_class, field):
                        attr = getattr(model_class, field)
                        if isinstance(value, list):
                            filter_conditions.append(attr.in_(value))
                        else:
                            filter_conditions.append(attr == value)
                
                if filter_conditions:
                    query = query.where(and_(*filter_conditions))
            
            # Execute query
            result = session.execute(query).scalar()
            
            return result or 0
        except Exception as e:
            logger.error(f"Error counting records for {model_class.__name__}: {str(e)}")
            return 0
        finally:
            session.close()
    
    async def optimize_database(self) -> bool:
        """
        Optimizes the database for better performance.
        
        Returns:
            True if successful, False otherwise
        """
        session = self.get_session()
        try:
            # Execute VACUUM command to optimize the database
            session.execute("VACUUM")
            
            # Execute ANALYZE command to update statistics
            session.execute("ANALYZE")
            
            logger.info("Database optimized successfully")
            return True
        except Exception as e:
            logger.error(f"Error optimizing database: {str(e)}")
            return False
        finally:
            session.close()
    
    async def create_backup(self, backup_path: str) -> bool:
        """
        Creates a backup of the database.
        
        Args:
            backup_path: Path where the backup will be stored
            
        Returns:
            True if successful, False otherwise
        """
        try:
            result = create_backup(self.db_path, backup_path)
            logger.info(f"Database backup {'created successfully' if result else 'failed'}")
            return result
        except Exception as e:
            logger.error(f"Error creating database backup: {str(e)}")
            return False
    
    async def restore_from_backup(self, backup_path: str) -> bool:
        """
        Restores the database from a backup.
        
        Args:
            backup_path: Path to the backup file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Close current database connection
            self.engine.dispose()
            
            # Restore database from backup
            result = restore_from_backup(backup_path, self.db_path)
            
            if result:
                # Reinitialize the database connection
                self.engine = create_engine(f"sqlite:///{self.db_path}", connect_args={"check_same_thread": False})
                self.Session = sessionmaker(bind=self.engine)
                
                logger.info("Database restored successfully from backup")
            else:
                logger.error("Failed to restore database from backup")
            
            return result
        except Exception as e:
            logger.error(f"Error restoring database from backup: {str(e)}")
            return False
    
    async def close(self) -> bool:
        """
        Closes the database connection.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            self.engine.dispose()
            logger.info("Database connection closed")
            return True
        except Exception as e:
            logger.error(f"Error closing database connection: {str(e)}")
            return False