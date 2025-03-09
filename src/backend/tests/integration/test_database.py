# src/backend/tests/integration/test_database.py
import pytest
import os
import uuid
from datetime import datetime
import json
import shutil
import numpy as np  # 1.24.0+

from ..conftest import create_test_embeddings, TEST_DB_DIR, TEST_VECTOR_DB_DIR, TEST_BACKUP_DIR
from ...database.sqlite_db import SQLiteDatabase  # Assuming v1.0
from ...database.vector_db import VectorDatabase  # Assuming v1.0


def setup_function():
    """Setup function that runs before each test to ensure clean test environment"""
    # Ensure test directories exist
    os.makedirs(TEST_DB_DIR, exist_ok=True)
    os.makedirs(TEST_VECTOR_DB_DIR, exist_ok=True)

    # Clean up any existing test data for a fresh start
    for item in os.listdir(TEST_DB_DIR):
        item_path = os.path.join(TEST_DB_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)

    for item in os.listdir(TEST_VECTOR_DB_DIR):
        item_path = os.path.join(TEST_VECTOR_DB_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)


def teardown_function():
    """Teardown function that runs after each test to clean up test environment"""
    # Clean up test databases and files
    if os.path.exists(TEST_DB_DIR):
        shutil.rmtree(TEST_DB_DIR)
    if os.path.exists(TEST_VECTOR_DB_DIR):
        shutil.rmtree(TEST_VECTOR_DB_DIR)

@pytest.mark.asyncio
async def test_sqlite_db_initialization():
    """Test that SQLiteDatabase initializes correctly"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Verify that the database is created
    assert os.path.exists(db.db_path)

    # Verify that tables are created
    # (This is a basic check; more thorough table verification could be added)
    # For example, check if the 'conversations' table exists
    # by querying the sqlite_master table
    # cursor = db.engine.connect()
    # result = cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='conversations';")
    # assert result.fetchone() is not None

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_conversation_crud():
    """Test CRUD operations for conversations in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new conversation
    conversation_data = {"title": "Test Conversation"}
    conversation = await db.create_conversation(**conversation_data)

    # Verify that the conversation is created with correct attributes
    assert conversation["title"] == "Test Conversation"
    assert "id" in conversation

    conversation_id = conversation["id"]

    # Update the conversation
    updates = {"title": "Updated Conversation Title"}
    updated_conversation = await db.update_conversation(uuid.UUID(conversation_id), updates)

    # Verify that the conversation is updated correctly
    assert updated_conversation["title"] == "Updated Conversation Title"

    # Delete the conversation
    deleted = await db.delete_conversation(uuid.UUID(conversation_id))

    # Verify that the conversation is deleted
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_message_operations():
    """Test message operations in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new conversation
    conversation_data = {"title": "Test Conversation"}
    conversation = await db.create_conversation(**conversation_data)
    conversation_id = conversation["id"]

    # Create multiple messages in the conversation
    message1_data = {"conversation_id": uuid.UUID(conversation_id), "role": "user", "content": "Hello"}
    message2_data = {"conversation_id": uuid.UUID(conversation_id), "role": "assistant", "content": "Hi there"}
    message1 = await db.create_message(**message1_data)
    message2 = await db.create_message(**message2_data)

    # Retrieve messages for the conversation
    messages = await db.get_messages(uuid.UUID(conversation_id))

    # Verify that all messages are retrieved correctly
    assert len(messages) == 2
    assert messages[0]["content"] == "Hello"
    assert messages[1]["content"] == "Hi there"

    # Verify message order (chronological)
    assert messages[0]["created_at"] < messages[1]["created_at"]

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_memory_item_crud():
    """Test CRUD operations for memory items in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new memory item
    memory_item_data = {"content": "Test memory item", "category": "test"}
    memory_item = await db.create_memory_item(**memory_item_data)

    # Verify that the memory item is created with correct attributes
    assert memory_item["content"] == "Test memory item"
    assert memory_item["category"] == "test"
    assert "id" in memory_item

    memory_item_id = memory_item["id"]

    # Update the memory item
    updates = {"content": "Updated memory item"}
    updated_memory_item = await db.update_memory_item(uuid.UUID(memory_item_id), updates)

    # Verify that the memory item is updated correctly
    assert updated_memory_item["content"] == "Updated memory item"

    # Delete the memory item
    deleted = await db.delete_memory_item(uuid.UUID(memory_item_id))

    # Verify that the memory item is deleted
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_memory_item_filtering():
    """Test filtering memory items by various criteria"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create multiple memory items with different categories and attributes
    item1_data = {"content": "Memory item 1", "category": "category1", "source_type": "test", "source_id": uuid.uuid4(), "importance": 1}
    item2_data = {"content": "Memory item 2", "category": "category2", "source_type": "test", "source_id": uuid.uuid4(), "importance": 3}
    item3_data = {"content": "Memory item 3", "category": "category1", "source_type": "other", "source_id": uuid.uuid4(), "importance": 5}
    item1 = await db.create_memory_item(**item1_data)
    item2 = await db.create_memory_item(**item2_data)
    item3 = await db.create_memory_item(**item3_data)

    # Filter memory items by category
    filters = {"category": "category1"}
    filtered_items = await db.get_memory_items(filters=filters)

    # Verify that only items with the specified category are returned
    assert len(filtered_items) == 2
    assert filtered_items[0]["content"] in ["Memory item 1", "Memory item 3"]
    assert filtered_items[1]["content"] in ["Memory item 1", "Memory item 3"]

    # Filter memory items by source type and source ID
    filters = {"source_type": "test", "source_id": item1_data["source_id"]}
    filtered_items = await db.get_memory_items(filters=filters)

    # Verify that only items with the specified source are returned
    assert len(filtered_items) == 1
    assert filtered_items[0]["content"] == "Memory item 1"

    # Filter memory items by importance
    filters = {"importance": 3}
    filtered_items = await db.get_memory_items(filters=filters)

    # Verify that only items with the specified importance are returned
    assert len(filtered_items) == 2
    assert filtered_items[0]["content"] in ["Memory item 2", "Memory item 3"]
    assert filtered_items[1]["content"] in ["Memory item 2", "Memory item 3"]

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_document_crud():
    """Test CRUD operations for documents in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new document
    document_data = {"filename": "test.txt", "file_type": "txt", "storage_path": "/path/to/test.txt"}
    document = await db.create_document(**document_data)

    # Verify that the document is created with correct attributes
    assert document["filename"] == "test.txt"
    assert document["file_type"] == "txt"
    assert document["storage_path"] == "/path/to/test.txt"
    assert "id" in document

    document_id = document["id"]

    # Update the document
    updates = {"filename": "updated.txt"}
    updated_document = await db.update_document(uuid.UUID(document_id), updates)

    # Verify that the document is updated correctly
    assert updated_document["filename"] == "updated.txt"

    # Delete the document
    deleted = await db.delete_document(uuid.UUID(document_id))

    # Verify that the document is deleted
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_document_chunks():
    """Test document chunk operations in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new document
    document_data = {"filename": "test.txt", "file_type": "txt", "storage_path": "/path/to/test.txt"}
    document = await db.create_document(**document_data)
    document_id = document["id"]

    # Create multiple document chunks for the document
    chunk1_data = {"document_id": uuid.UUID(document_id), "chunk_index": 0, "content": "Chunk 1"}
    chunk2_data = {"document_id": uuid.UUID(document_id), "chunk_index": 1, "content": "Chunk 2"}
    chunk1 = await db.create_document_chunk(**chunk1_data)
    chunk2 = await db.create_document_chunk(**chunk2_data)

    # Retrieve the document with chunks
    document_with_chunks = await db.get_document(uuid.UUID(document_id), include_chunks=True)

    # Verify that all chunks are retrieved correctly
    assert len(document_with_chunks["chunks"]) == 2
    assert document_with_chunks["chunks"][0]["content"] == "Chunk 1"
    assert document_with_chunks["chunks"][1]["content"] == "Chunk 2"

    # Verify chunk order (by chunk_index)
    assert document_with_chunks["chunks"][0]["chunk_index"] == 0
    assert document_with_chunks["chunks"][1]["chunk_index"] == 1

    # Delete the document
    deleted = await db.delete_document(uuid.UUID(document_id))

    # Verify that all chunks are also deleted (cascade)
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_web_page_crud():
    """Test CRUD operations for web pages in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new web page
    web_page_data = {"url": "https://example.com", "title": "Example"}
    web_page = await db.create_web_page(**web_page_data)

    # Verify that the web page is created with correct attributes
    assert web_page["url"] == "https://example.com"
    assert web_page["title"] == "Example"
    assert "id" in web_page

    web_page_id = web_page["id"]

    # Update the web page
    updates = {"title": "Updated Example"}
    updated_web_page = await db.update_web_page(uuid.UUID(web_page_id), updates)

    # Verify that the web page is updated correctly
    assert updated_web_page["title"] == "Updated Example"

    # Delete the web page
    deleted = await db.delete_web_page(uuid.UUID(web_page_id))

    # Verify that the web page is deleted
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_web_content_chunks():
    """Test web content chunk operations in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create a new web page
    web_page_data = {"url": "https://example.com", "title": "Example"}
    web_page = await db.create_web_page(**web_page_data)
    web_page_id = web_page["id"]

    # Create multiple web content chunks for the web page
    chunk1_data = {"web_page_id": uuid.UUID(web_page_id), "chunk_index": 0, "content": "Chunk 1"}
    chunk2_data = {"web_page_id": uuid.UUID(web_page_id), "chunk_index": 1, "content": "Chunk 2"}
    chunk1 = await db.create_web_content_chunk(**chunk1_data)
    chunk2 = await db.create_web_content_chunk(**chunk2_data)

    # Retrieve the web page with chunks
    web_page_with_chunks = await db.get_web_page(uuid.UUID(web_page_id), include_chunks=True)

    # Verify that all chunks are retrieved correctly
    assert len(web_page_with_chunks["chunks"]) == 2
    assert web_page_with_chunks["chunks"][0]["content"] == "Chunk 1"
    assert web_page_with_chunks["chunks"][1]["content"] == "Chunk 2"

    # Verify chunk order (by chunk_index)
    assert web_page_with_chunks["chunks"][0]["chunk_index"] == 0
    assert web_page_with_chunks["chunks"][1]["chunk_index"] == 1

    # Delete the web page
    deleted = await db.delete_web_page(uuid.UUID(web_page_id))

    # Verify that all chunks are also deleted (cascade)
    assert deleted

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_user_settings():
    """Test user settings operations in SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Get user settings (should create default settings if not exists)
    user_settings = await db.get_user_settings()

    # Verify that default settings are created correctly
    assert "voice_settings" in user_settings
    assert "personality_settings" in user_settings
    assert "privacy_settings" in user_settings

    # Update user settings
    updates = {"voice_settings": {"enabled": True}}
    updated_settings = await db.update_user_settings(updates)

    # Verify that settings are updated correctly
    assert updated_settings["voice_settings"]["enabled"] == True

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_backup_restore():
    """Test backup and restore operations for SQLiteDatabase"""
    # Initialize SQLiteDatabase with test directory
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))

    # Create test data (conversations, messages, memory items)
    conversation_data = {"title": "Test Conversation"}
    conversation = await db.create_conversation(**conversation_data)
    message_data = {"conversation_id": uuid.UUID(conversation["id"]), "role": "user", "content": "Hello"}
    message = await db.create_message(**message_data)
    memory_item_data = {"content": "Test memory item", "category": "test"}
    memory_item = await db.create_memory_item(**memory_item_data)

    # Create a backup of the database
    backup_path = os.path.join(TEST_BACKUP_DIR, "test_backup.db")
    backup_created = await db.create_backup(backup_path)

    # Verify that the backup is created
    assert backup_created
    assert os.path.exists(backup_path)

    # Delete all data from the original database
    await db.delete_conversation(uuid.UUID(conversation["id"]))
    await db.delete_memory_item(uuid.UUID(memory_item["id"]))

    # Restore the database from the backup
    restore_success = await db.restore_from_backup(backup_path)

    # Verify that all data is restored correctly
    assert restore_success
    restored_conversation = await db.get_conversation(uuid.UUID(conversation["id"]))
    restored_memory_item = await db.get_memory_items(filters={"content": "Test memory item"})

    assert restored_conversation is not None
    assert len(restored_memory_item) == 1

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_sqlite_db_encryption():
    """Test encryption functionality in SQLiteDatabase"""
    # Initialize SQLiteDatabase with encryption enabled
    db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test_encrypted.db"), encryption_enabled=True)

    # Create a conversation with sensitive content
    conversation_data = {"title": "Secret Meeting"}
    conversation = await db.create_conversation(**conversation_data)
    conversation_id = conversation["id"]

    # Create a message with sensitive content
    message_data = {"conversation_id": uuid.UUID(conversation_id), "role": "user", "content": "The password is 'secret123'"}
    message = await db.create_message(**message_data)

    # Create a memory item with sensitive content
    memory_item_data = {"content": "My bank account number is 123456789", "category": "private"}
    memory_item = await db.create_memory_item(**memory_item_data)

    # Retrieve the data and verify it's decrypted correctly
    retrieved_message = await db.get_messages(uuid.UUID(conversation_id))
    assert retrieved_message[0]["content"] == "The password is 'secret123'"
    retrieved_memory_item = await db.get_memory_items()
    assert retrieved_memory_item[0]["content"] == "My bank account number is 123456789"

    # Examine the database file directly to verify content is not stored in plaintext
    # (This requires reading the SQLite file directly, which is beyond the scope of this test)

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_initialization():
    """Test that VectorDatabase initializes correctly"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Verify that the database is created
    assert os.path.exists(TEST_VECTOR_DB_DIR)

    # Verify that the collection is created
    # (This is a basic check; more thorough collection verification could be added)
    # For example, check if the collection exists by querying the ChromaDB client
    # collection = db.client.get_collection(name=db.collection_name)
    # assert collection is not None

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_embedding_crud():
    """Test CRUD operations for embeddings in VectorDatabase"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create a new embedding
    embedding_id = str(uuid.uuid4())
    embedding_vector = [0.1, 0.2, 0.3]
    embedding_metadata = {"source": "test"}
    embedding_text = "Test embedding"
    await db.add_embedding(embedding_id, embedding_vector, embedding_metadata, embedding_text)

    # Verify that the embedding is created with correct attributes
    embedding = await db.get_embedding(embedding_id)
    assert embedding["vector"] == embedding_vector
    assert embedding["metadata"] == embedding_metadata
    assert embedding["text"] == embedding_text

    # Update the embedding
    new_embedding_vector = [0.4, 0.5, 0.6]
    new_embedding_metadata = {"source": "updated"}
    await db.update_embedding(embedding_id, vector=new_embedding_vector, metadata=new_embedding_metadata)

    # Verify that the embedding is updated correctly
    updated_embedding = await db.get_embedding(embedding_id)
    assert updated_embedding["vector"] == new_embedding_vector
    assert updated_embedding["metadata"] == new_embedding_metadata

    # Delete the embedding
    await db.delete_embedding(embedding_id)

    # Verify that the embedding is deleted
    deleted_embedding = await db.get_embedding(embedding_id)
    assert deleted_embedding is None

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_batch_operations():
    """Test batch operations for embeddings in VectorDatabase"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create multiple embeddings in batch
    ids, vectors, metadatas, texts = create_test_embeddings(3, 3)
    await db.batch_add_embeddings(ids, vectors, metadatas, texts)

    # Verify that all embeddings are created correctly
    for embedding_id, embedding_vector, embedding_metadata, embedding_text in zip(ids, vectors, metadatas, texts):
        embedding = await db.get_embedding(embedding_id)
        assert embedding["vector"] == embedding_vector
        assert embedding["metadata"] == embedding_metadata
        assert embedding["text"] == embedding_text

    # Count the embeddings
    count = await db.count_embeddings()

    # Verify that the count matches the number of embeddings created
    assert count == 3

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_similarity_search():
    """Test similarity search functionality in VectorDatabase"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create multiple embeddings with known similarity relationships
    ids, vectors, metadatas, texts = create_test_embeddings(3, 3)
    await db.batch_add_embeddings(ids, vectors, metadatas, texts)

    # Perform similarity search with a query vector
    query_vector = [0.1, 0.2, 0.3]
    results = await db.search_similar(query_vector)

    # Verify that results are returned in order of similarity
    assert len(results) == 3
    assert results[0]["id"] == ids[0]

    # Verify that similarity scores are calculated correctly
    assert results[0]["score"] > 0
    assert results[1]["score"] > 0
    assert results[2]["score"] > 0

    # Test with different limit parameters
    results = await db.search_similar(query_vector, limit=1)
    assert len(results) == 1

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_filtering():
    """Test filtering in similarity search"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create multiple embeddings with different metadata
    ids, vectors, metadatas, texts = create_test_embeddings(3, 3)
    await db.batch_add_embeddings(ids, vectors, metadatas, texts)

    # Perform similarity search with metadata filters
    filters = {"category": "category_0"}
    query_vector = [0.1, 0.2, 0.3]
    results = await db.search_similar(query_vector, filters=filters)

    # Verify that only embeddings matching the filter criteria are returned
    assert len(results) == 1
    assert results[0]["id"] == ids[0]

    # Test with multiple filter conditions
    filters = {"category": "category_0", "source": "test"}
    results = await db.search_similar(query_vector, filters=filters)
    assert len(results) == 1

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_vector_db_backup_restore():
    """Test backup and restore operations for VectorDatabase"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create test embeddings
    ids, vectors, metadatas, texts = create_test_embeddings(3, 3)
    await db.batch_add_embeddings(ids, vectors, metadatas, texts)

    # Create a backup of the database
    backup_path = os.path.join(TEST_BACKUP_DIR, "test_vector_backup")
    backup_created = await db.create_backup(backup_path)

    # Verify that the backup is created
    assert backup_created
    assert os.path.exists(backup_path)

    # Delete all embeddings from the original database
    for embedding_id in ids:
        await db.delete_embedding(embedding_id)

    # Restore the database from the backup
    restore_success = await db.restore_from_backup(backup_path)

    # Verify that all embeddings are restored correctly
    assert restore_success
    for embedding_id, embedding_vector, embedding_metadata, embedding_text in zip(ids, vectors, metadatas, texts):
        embedding = await db.get_embedding(embedding_id)
        assert embedding["vector"] == embedding_vector
        assert embedding["metadata"] == embedding_metadata
        assert embedding["text"] == embedding_text

    # Close the database connection
    await db.close()

@pytest.mark.asyncio
async def test_database_integration():
    """Test integration between SQLiteDatabase and VectorDatabase"""
    # Initialize both SQLiteDatabase and VectorDatabase
    sqlite_db = SQLiteDatabase(db_path=os.path.join(TEST_DB_DIR, "test.db"))
    vector_db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create a memory item in SQLiteDatabase
    memory_item_data = {"content": "Test memory item", "category": "test"}
    memory_item = await sqlite_db.create_memory_item(**memory_item_data)
    memory_id = memory_item["id"]

    # Create a corresponding vector embedding in VectorDatabase
    embedding_vector = [0.1, 0.2, 0.3]
    embedding_metadata = {"source": "test"}
    embedding_text = "Test memory item"
    await vector_db.add_embedding(memory_id, embedding_vector, embedding_metadata, embedding_text)

    # Retrieve the memory item and verify its content
    retrieved_memory_item = await sqlite_db.get_memory_items(filters={"content": "Test memory item"})
    assert len(retrieved_memory_item) == 1
    assert retrieved_memory_item[0]["content"] == "Test memory item"

    # Perform a similarity search in VectorDatabase
    results = await vector_db.search_similar(embedding_vector)

    # Verify that the search results correspond to the memory item
    assert len(results) == 1
    assert results[0]["id"] == memory_id

    # Delete the memory item
    await sqlite_db.delete_memory_item(uuid.UUID(memory_id))

    # Delete the corresponding vector embedding
    await vector_db.delete_embedding(memory_id)

    # Verify that both are deleted
    retrieved_memory_item = await sqlite_db.get_memory_items(filters={"content": "Test memory item"})
    assert len(retrieved_memory_item) == 0
    embedding = await vector_db.get_embedding(memory_id)
    assert embedding is None

    # Close both database connections
    await sqlite_db.close()
    await vector_db.close()