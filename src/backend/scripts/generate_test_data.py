#!/usr/bin/env python3
"""
Script for generating realistic test data for the Personal AI Agent.

This script creates sample conversations, documents, and web pages with
associated memory items and vector embeddings to help with development,
testing, and demonstration of the application.
"""

import os
import sys
import argparse
import logging
import random
import datetime
import uuid
import json
from pathlib import Path

from faker import Faker

from ..database.sqlite_db import SQLiteDatabase
from ..database.vector_db import VectorDatabase
from ..utils.embeddings import generate_embedding, batch_generate_embeddings
from ..utils.text_processing import TextChunker, clean_text
from ..config.settings import Settings
from ..utils.logging_setup import setup_logging
from ..database.models import MEMORY_CATEGORIES

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Initialize Faker for generating realistic data
fake = Faker()

# Default values
DEFAULT_NUM_CONVERSATIONS = 5
DEFAULT_MESSAGES_PER_CONVERSATION = 10
DEFAULT_NUM_DOCUMENTS = 3
DEFAULT_NUM_WEB_PAGES = 3
DEFAULT_DB_PATH = Path('data/personal_ai.db')
DEFAULT_VECTOR_DB_PATH = Path('data/vector_db')

# Constants for generating realistic data
USER_ROLES = ['user']
ASSISTANT_ROLES = ['assistant']
DOCUMENT_TYPES = ['pdf', 'docx', 'txt']
CONVERSATION_TOPICS = [
    "Project planning",
    "Travel arrangements",
    "Book recommendations",
    "Recipe ideas",
    "Fitness plan",
    "Learning Python",
    "Home renovation",
    "Career advice",
    "Movie recommendations",
    "Technology news"
]

def parse_arguments():
    """Parse command-line arguments for test data generation."""
    parser = argparse.ArgumentParser(
        description="Generate test data for the Personal AI Agent"
    )
    
    parser.add_argument(
        "--db-path",
        type=str,
        default=DEFAULT_DB_PATH,
        help=f"Path to the SQLite database (default: {DEFAULT_DB_PATH})"
    )
    
    parser.add_argument(
        "--vector-db-path",
        type=str,
        default=DEFAULT_VECTOR_DB_PATH,
        help=f"Path to the vector database (default: {DEFAULT_VECTOR_DB_PATH})"
    )
    
    parser.add_argument(
        "--conversations",
        type=int,
        default=DEFAULT_NUM_CONVERSATIONS,
        help=f"Number of conversations to generate (default: {DEFAULT_NUM_CONVERSATIONS})"
    )
    
    parser.add_argument(
        "--messages",
        type=int,
        default=DEFAULT_MESSAGES_PER_CONVERSATION,
        help=f"Number of messages per conversation (default: {DEFAULT_MESSAGES_PER_CONVERSATION})"
    )
    
    parser.add_argument(
        "--documents",
        type=int,
        default=DEFAULT_NUM_DOCUMENTS,
        help=f"Number of documents to generate (default: {DEFAULT_NUM_DOCUMENTS})"
    )
    
    parser.add_argument(
        "--web-pages",
        type=int,
        default=DEFAULT_NUM_WEB_PAGES,
        help=f"Number of web pages to generate (default: {DEFAULT_NUM_WEB_PAGES})"
    )
    
    parser.add_argument(
        "--no-vectors",
        action="store_true",
        help="Disable vector embedding generation (faster but less realistic)"
    )
    
    parser.add_argument(
        "--log-level",
        type=str,
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        default="INFO",
        help="Set the logging level (default: INFO)"
    )
    
    return parser.parse_args()

def generate_conversation_data(topic, num_messages):
    """
    Generate a realistic conversation with messages between user and assistant.
    
    Args:
        topic (str): Topic of the conversation
        num_messages (int): Number of messages to generate
        
    Returns:
        dict: Dictionary with conversation title, messages, and metadata
    """
    # Generate a conversation title based on the topic
    title = f"Conversation about {topic}"
    
    # Generate messages
    messages = []
    current_role_index = 0  # Start with user message
    
    for i in range(num_messages):
        # Alternate between user and assistant roles
        if current_role_index == 0:
            role = random.choice(USER_ROLES)  # Always 'user' with current setup
            if i == 0:
                # First user message is a question or instruction about the topic
                content = fake.sentence(nb_words=10) + f" {topic}?"
            else:
                # Subsequent user messages are follow-ups
                content = fake.paragraph(nb_sentences=random.randint(1, 3))
            current_role_index = 1
        else:
            role = random.choice(ASSISTANT_ROLES)  # Always 'assistant' with current setup
            # Assistant responses are more detailed and helpful
            content = fake.paragraph(nb_sentences=random.randint(2, 5))
            current_role_index = 0
        
        # Create message timestamp
        timestamp = datetime.datetime.now() - datetime.timedelta(
            minutes=random.randint(0, 60) * (num_messages - i)
        )
        
        # Create message metadata
        metadata = {
            "timestamp": timestamp.isoformat(),
            "topic": topic,
        }
        
        messages.append({
            "role": role,
            "content": content,
            "metadata": metadata
        })
    
    # Create conversation metadata
    metadata = {
        "topic": topic,
        "generated_at": datetime.datetime.now().isoformat()
    }
    
    return {
        "title": title,
        "messages": messages,
        "metadata": metadata
    }

def generate_document_data(index):
    """
    Generate sample document data with content chunks.
    
    Args:
        index (int): Index of the document (for unique naming)
        
    Returns:
        dict: Dictionary with document metadata and content chunks
    """
    # Choose document type
    file_type = random.choice(DOCUMENT_TYPES)
    
    # Generate filename based on document type
    topic = random.choice(CONVERSATION_TOPICS)
    filename = f"{topic.replace(' ', '_')}_{index}.{file_type}"
    
    # Generate fake file path
    storage_path = f"data/documents/{filename}"
    
    # Generate document content
    content = fake.text(max_nb_chars=2000)
    
    # Create text chunker
    chunker = TextChunker(chunk_size=500, chunk_overlap=50)
    
    # Split content into chunks
    chunks = []
    for i, chunk_text in enumerate(chunker.split_text(content)):
        chunk = {
            "chunk_index": i,
            "content": chunk_text,
            "metadata": {
                "page_number": i + 1,  # Simulate pages
                "topic": topic
            }
        }
        chunks.append(chunk)
    
    # Create document metadata
    metadata = {
        "topic": topic,
        "generated_at": datetime.datetime.now().isoformat(),
        "word_count": len(content.split())
    }
    
    return {
        "filename": filename,
        "file_type": file_type,
        "storage_path": storage_path,
        "chunks": chunks,
        "metadata": metadata
    }

def generate_web_page_data(index):
    """
    Generate sample web page data with content chunks.
    
    Args:
        index (int): Index of the web page (for unique generation)
        
    Returns:
        dict: Dictionary with web page metadata and content chunks
    """
    # Choose topic
    topic = random.choice(CONVERSATION_TOPICS)
    
    # Generate fake URL
    domain = fake.domain_name()
    path = topic.lower().replace(' ', '-')
    url = f"https://www.{domain}/{path}"
    
    # Generate title
    title = f"{topic} - {fake.company()}"
    
    # Generate web page content
    content = fake.text(max_nb_chars=3000)
    
    # Create text chunker
    chunker = TextChunker(chunk_size=500, chunk_overlap=50)
    
    # Split content into chunks
    chunks = []
    for i, chunk_text in enumerate(chunker.split_text(content)):
        chunk = {
            "chunk_index": i,
            "content": chunk_text,
            "metadata": {
                "section": f"Section {i + 1}",
                "topic": topic
            }
        }
        chunks.append(chunk)
    
    # Create web page metadata
    metadata = {
        "topic": topic,
        "generated_at": datetime.datetime.now().isoformat(),
        "source": domain
    }
    
    return {
        "url": url,
        "title": title,
        "chunks": chunks,
        "metadata": metadata
    }

async def create_conversation_in_db(db, vector_db, conversation_data, generate_vectors):
    """
    Create a conversation with messages in the database.
    
    Args:
        db (SQLiteDatabase): SQLite database instance
        vector_db (VectorDatabase): Vector database instance
        conversation_data (dict): Conversation data to store
        generate_vectors (bool): Whether to generate vector embeddings
        
    Returns:
        dict: Created conversation data with IDs
    """
    # Extract conversation details
    title = conversation_data["title"]
    messages = conversation_data["messages"]
    metadata = conversation_data["metadata"]
    
    # Create conversation in database
    conversation = await db.create_conversation(
        title=title,
        summary=title,  # Using title as summary for simplicity
        metadata=metadata
    )
    
    # Get conversation ID
    conversation_id = uuid.UUID(conversation["id"])
    
    # Create messages for the conversation
    for message in messages:
        role = message["role"]
        content = message["content"]
        msg_metadata = message["metadata"]
        
        # Create message in database
        msg = await db.create_message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata=msg_metadata
        )
        
        # Generate vector embedding for message content
        if generate_vectors:
            # Generate embedding
            embedding = generate_embedding(content)
            
            # Add to vector database
            await vector_db.add_embedding(
                id=msg["id"],
                vector=embedding,
                metadata={
                    "source_type": "message",
                    "source_id": msg["id"],
                    "conversation_id": str(conversation_id),
                    "role": role
                },
                text=content
            )
        
        # Create memory item for the message
        memory_item = await db.create_memory_item(
            content=content,
            category="conversation",
            source_type="message",
            source_id=uuid.UUID(msg["id"]),
            importance=1,
            metadata={
                "conversation_id": str(conversation_id),
                "role": role,
                "topic": metadata.get("topic", "")
            }
        )
    
    logger.info(f"Created conversation: {title} with {len(messages)} messages")
    return conversation

async def create_document_in_db(db, vector_db, document_data, generate_vectors):
    """
    Create a document with chunks in the database.
    
    Args:
        db (SQLiteDatabase): SQLite database instance
        vector_db (VectorDatabase): Vector database instance
        document_data (dict): Document data to store
        generate_vectors (bool): Whether to generate vector embeddings
        
    Returns:
        dict: Created document data with IDs
    """
    # Extract document details
    filename = document_data["filename"]
    file_type = document_data["file_type"]
    storage_path = document_data["storage_path"]
    chunks = document_data["chunks"]
    metadata = document_data["metadata"]
    
    # Create document in database
    document = await db.create_document(
        filename=filename,
        file_type=file_type,
        storage_path=storage_path,
        metadata=metadata
    )
    
    # Get document ID
    document_id = uuid.UUID(document["id"])
    
    # Create chunks for the document
    for chunk in chunks:
        chunk_index = chunk["chunk_index"]
        content = chunk["content"]
        chunk_metadata = chunk["metadata"]
        
        # Create document chunk in database
        chunk_obj = await db.create_document_chunk(
            document_id=document_id,
            chunk_index=chunk_index,
            content=content,
            page_number=chunk_metadata.get("page_number", 1),
            metadata=chunk_metadata
        )
        
        # Generate vector embedding for chunk content
        if generate_vectors:
            # Generate embedding
            embedding = generate_embedding(content)
            
            # Add to vector database
            await vector_db.add_embedding(
                id=chunk_obj["id"],
                vector=embedding,
                metadata={
                    "source_type": "document_chunk",
                    "source_id": chunk_obj["id"],
                    "document_id": str(document_id),
                    "page_number": chunk_metadata.get("page_number", 1)
                },
                text=content
            )
        
        # Create memory item for the document chunk
        memory_item = await db.create_memory_item(
            content=content,
            category="document",
            source_type="document_chunk",
            source_id=uuid.UUID(chunk_obj["id"]),
            importance=2,  # Documents slightly more important than conversations
            metadata={
                "document_id": str(document_id),
                "filename": filename,
                "topic": metadata.get("topic", "")
            }
        )
    
    logger.info(f"Created document: {filename} with {len(chunks)} chunks")
    return document

async def create_web_page_in_db(db, vector_db, web_page_data, generate_vectors):
    """
    Create a web page with chunks in the database.
    
    Args:
        db (SQLiteDatabase): SQLite database instance
        vector_db (VectorDatabase): Vector database instance
        web_page_data (dict): Web page data to store
        generate_vectors (bool): Whether to generate vector embeddings
        
    Returns:
        dict: Created web page data with IDs
    """
    # Extract web page details
    url = web_page_data["url"]
    title = web_page_data["title"]
    chunks = web_page_data["chunks"]
    metadata = web_page_data["metadata"]
    
    # Create web page in database
    web_page = await db.create_web_page(
        url=url,
        title=title,
        metadata=metadata
    )
    
    # Get web page ID
    web_page_id = uuid.UUID(web_page["id"])
    
    # Create chunks for the web page
    for chunk in chunks:
        chunk_index = chunk["chunk_index"]
        content = chunk["content"]
        chunk_metadata = chunk["metadata"]
        
        # Create web content chunk in database
        chunk_obj = await db.create_web_content_chunk(
            web_page_id=web_page_id,
            chunk_index=chunk_index,
            content=content,
            metadata=chunk_metadata
        )
        
        # Generate vector embedding for chunk content
        if generate_vectors:
            # Generate embedding
            embedding = generate_embedding(content)
            
            # Add to vector database
            await vector_db.add_embedding(
                id=chunk_obj["id"],
                vector=embedding,
                metadata={
                    "source_type": "web_content_chunk",
                    "source_id": chunk_obj["id"],
                    "web_page_id": str(web_page_id),
                    "section": chunk_metadata.get("section", "")
                },
                text=content
            )
        
        # Create memory item for the web content chunk
        memory_item = await db.create_memory_item(
            content=content,
            category="web",
            source_type="web_content_chunk",
            source_id=uuid.UUID(chunk_obj["id"]),
            importance=1,
            metadata={
                "web_page_id": str(web_page_id),
                "url": url,
                "title": title,
                "topic": metadata.get("topic", "")
            }
        )
    
    logger.info(f"Created web page: {title} with {len(chunks)} chunks")
    return web_page

async def main():
    """
    Main function to generate test data for the Personal AI Agent.
    
    Returns:
        int: Exit code (0 for success, 1 for failure)
    """
    try:
        # Parse command-line arguments
        args = parse_arguments()
        
        # Set up logging
        setup_logging(log_level=args.log_level)
        
        # Initialize SQLite database
        logger.info(f"Initializing SQLite database at {args.db_path}")
        db = SQLiteDatabase(str(args.db_path))
        
        # Initialize vector database
        logger.info(f"Initializing vector database at {args.vector_db_path}")
        vector_db = VectorDatabase(str(args.vector_db_path))
        
        logger.info(f"Starting test data generation: {args.conversations} conversations, "
                   f"{args.documents} documents, {args.web_pages} web pages")
        
        # Generate and store conversations
        logger.info("Generating conversations...")
        for i in range(args.conversations):
            # Choose a random topic
            topic = random.choice(CONVERSATION_TOPICS)
            
            # Generate conversation data
            conversation_data = generate_conversation_data(topic, args.messages)
            
            # Create conversation in database
            await create_conversation_in_db(
                db, vector_db, conversation_data, not args.no_vectors
            )
        
        # Generate and store documents
        logger.info("Generating documents...")
        for i in range(args.documents):
            # Generate document data
            document_data = generate_document_data(i)
            
            # Create document in database
            await create_document_in_db(
                db, vector_db, document_data, not args.no_vectors
            )
        
        # Generate and store web pages
        logger.info("Generating web pages...")
        for i in range(args.web_pages):
            # Generate web page data
            web_page_data = generate_web_page_data(i)
            
            # Create web page in database
            await create_web_page_in_db(
                db, vector_db, web_page_data, not args.no_vectors
            )
        
        logger.info("Test data generation complete!")
        
        # Close database connections
        await db.close()
        await vector_db.close()
        
        return 0
    
    except Exception as e:
        logger.error(f"Error generating test data: {str(e)}", exc_info=True)
        return 1

def run():
    """Entry point for the script that sets up asyncio event loop."""
    import asyncio
    exit_code = asyncio.run(main())
    return exit_code

if __name__ == "__main__":
    sys.exit(run())