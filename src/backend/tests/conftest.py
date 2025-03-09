# src/backend/tests/conftest.py
import pytest
import os
import tempfile
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, AsyncMock, patch

from fastapi.testclient import TestClient
from httpx import AsyncClient

from ..config.settings import Settings
from ..database.sqlite_db import SQLiteDatabase
from ..database.vector_db import VectorDatabase
from ..services.memory_service import MemoryService
from ..services.conversation_service import ConversationService
from ..services.llm_service import LLMService
from ..services.document_processor import DocumentProcessor
from ..services.search_service import SearchService
from ..services.voice_processor import VoiceProcessor
from ..services.web_extractor import WebExtractor
from ..utils.event_bus import EventBus
from ..api.server import create_app
from ..llm.context_manager import ContextManager
from ..utils.embeddings import get_embedding_model

# Define global test directories
TEST_DB_DIR = Path(tempfile.gettempdir()) / 'personal_ai_test_db'
TEST_VECTOR_DB_DIR = Path(tempfile.gettempdir()) / 'personal_ai_test_vector_db'
TEST_DOCS_DIR = Path(tempfile.gettempdir()) / 'personal_ai_test_docs'
TEST_BACKUP_DIR = Path(tempfile.gettempdir()) / 'personal_ai_test_backup'

def setup_module():
    """Setup function that runs before all tests to prepare test directories"""
    # Create test directories if they don't exist
    os.makedirs(TEST_DB_DIR, exist_ok=True)
    os.makedirs(TEST_VECTOR_DB_DIR, exist_ok=True)
    os.makedirs(TEST_DOCS_DIR, exist_ok=True)
    os.makedirs(TEST_BACKUP_DIR, exist_ok=True)

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
    
    for item in os.listdir(TEST_DOCS_DIR):
        item_path = os.path.join(TEST_DOCS_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
    
    for item in os.listdir(TEST_BACKUP_DIR):
        item_path = os.path.join(TEST_BACKUP_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)

def teardown_module():
    """Teardown function that runs after all tests to clean up test directories"""
    # Clean up test directories and files
    if os.path.exists(TEST_DB_DIR):
        shutil.rmtree(TEST_DB_DIR)
    if os.path.exists(TEST_VECTOR_DB_DIR):
        shutil.rmtree(TEST_VECTOR_DB_DIR)
    if os.path.exists(TEST_DOCS_DIR):
        shutil.rmtree(TEST_DOCS_DIR)
    if os.path.exists(TEST_BACKUP_DIR):
        shutil.rmtree(TEST_BACKUP_DIR)

    # Remove temporary test data
    for item in os.listdir(tempfile.gettempdir()):
        if item.startswith("personal_ai_test"):
            item_path = os.path.join(tempfile.gettempdir(), item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)

def create_test_document(content: str, file_type: str, filename: str) -> tuple:
    """Creates a test document file for testing the document processor"""
    # Generate a unique document_id using uuid.uuid4()
    document_id = uuid.uuid4()

    # Create the test document directory if it doesn't exist
    os.makedirs(TEST_DOCS_DIR, exist_ok=True)

    # Determine the file extension based on file_type
    if file_type == "pdf":
        file_extension = ".pdf"
    elif file_type == "txt":
        file_extension = ".txt"
    else:
        file_extension = ".txt"  # Default to .txt if file_type is not recognized

    # Create the full file path using the filename and extension
    file_path = os.path.join(TEST_DOCS_DIR, filename + file_extension)

    # Write the content to the file
    with open(file_path, "w") as f:
        f.write(content)

    # Return the file path and document_id
    return file_path, document_id

def generate_random_embedding(dimension: int) -> list:
    """Generates a random embedding vector for testing"""
    # Generate a numpy array of random values with the specified dimension
    vector = np.random.rand(dimension)

    # Normalize the vector to unit length
    vector /= np.linalg.norm(vector)

    # Convert to a Python list and return
    return vector.tolist()

def create_test_embeddings(count: int, dimension: int) -> tuple:
    """Creates a set of test embeddings with associated metadata"""
    # Generate 'count' unique IDs
    ids = [str(uuid.uuid4()) for _ in range(count)]

    # Generate 'count' random embedding vectors of specified dimension
    vectors = [generate_random_embedding(dimension) for _ in range(count)]

    # Create metadata dictionaries with category, importance, and timestamp
    metadatas = [
        {
            "category": f"category_{i % 3}",
            "importance": i % 5 + 1,
            "timestamp": datetime.now().isoformat(),
        }
        for i in range(count)
    ]

    # Generate sample texts for each embedding
    texts = [f"Test document {i}" for i in range(count)]

    # Return tuple of (ids, vectors, metadatas, texts)
    return ids, vectors, metadatas, texts

@pytest.fixture
def test_config():
    """Fixture that provides test configuration settings"""
    config = {
        "general": {"app_name": "Test App", "version": "0.1.0"},
        "server": {"host": "0.0.0.0", "port": 8001, "reload": False},
        "database": {"path": str(TEST_DB_DIR / "test.db")},
        "vector_database": {"path": str(TEST_VECTOR_DB_DIR)},
    }
    settings = Settings()
    settings.get = MagicMock(side_effect=lambda key, default=None: config.get(key, default))
    return settings

@pytest.fixture
def sqlite_db(test_config):
    """Fixture that provides a SQLite database instance for testing"""
    db_path = test_config.get("database.path")
    db = SQLiteDatabase(db_path)
    return db

@pytest.fixture
def vector_db(test_config):
    """Fixture that provides a vector database instance for testing"""
    db_path = test_config.get("vector_database.path")
    db = VectorDatabase(persist_directory=db_path)
    return db

@pytest.fixture
def event_bus():
    """Fixture that provides an event bus instance for testing"""
    bus = EventBus()
    return bus

@pytest.fixture
def mock_llm_service():
    """Fixture that provides a mocked LLM service for testing"""
    with patch("src.backend.services.llm_service.LLMService") as MockLLMService:
        instance = MockLLMService.return_value
        instance.generate_response = AsyncMock(return_value="This is a test response from the AI.")
        instance.summarize_text = AsyncMock(return_value="This is a test summary.")
        yield instance

@pytest.fixture
def context_manager():
    """Fixture that provides a context manager for LLM prompts"""
    context_manager = MagicMock()
    context_manager.build_prompt_with_context = MagicMock(return_value={"system_prompt": "Test system prompt", "messages": [{"role": "user", "content": "Test user message"}]})
    return context_manager

@pytest.fixture
def memory_service(sqlite_db, vector_db):
    """Fixture that provides a memory service instance for testing"""
    memory_service = MemoryService(vector_db, sqlite_db)
    memory_service.store_memory = AsyncMock()
    memory_service.retrieve_context = AsyncMock()
    memory_service.get_memory = AsyncMock()
    memory_service.update_memory = AsyncMock()
    memory_service.delete_memory = AsyncMock()
    memory_service.search_memory = AsyncMock()
    return memory_service

@pytest.fixture
def conversation_service(memory_service, mock_llm_service, event_bus):
    """Fixture that provides a conversation service instance for testing"""
    conversation_service = ConversationService(memory_service, mock_llm_service, event_bus)
    conversation_service.process_message = AsyncMock()
    conversation_service.get_conversation_history = AsyncMock()
    conversation_service.delete_conversation = AsyncMock()
    return conversation_service

@pytest.fixture
def document_processor(memory_service):
    """Fixture that provides a document processor instance for testing"""
    document_processor = DocumentProcessor(memory_service, MagicMock())
    document_processor.process_document = AsyncMock()
    document_processor.validate_document = AsyncMock()
    document_processor.store_document_chunks = AsyncMock()
    return document_processor

@pytest.fixture
def search_service(mock_llm_service, memory_service):
    """Fixture that provides a search service instance for testing"""
    search_service = SearchService(mock_llm_service, memory_service, MagicMock())
    search_service.execute_search = AsyncMock()
    return search_service

@pytest.fixture
def voice_processor():
    """Fixture that provides a voice processor instance for testing"""
    voice_processor = VoiceProcessor(MagicMock(), MagicMock())
    voice_processor.transcribe_audio = AsyncMock()
    voice_processor.synthesize_speech = AsyncMock()
    return voice_processor

@pytest.fixture
def web_extractor():
    """Fixture that provides a web extractor instance for testing"""
    web_extractor = WebExtractor(MagicMock(), MagicMock())
    web_extractor.extract_from_url = AsyncMock()
    return web_extractor

@pytest.fixture
def app_client(test_config):
    """Fixture that provides a FastAPI TestClient for API testing"""
    app = create_app(test_config)
    return TestClient(app)

@pytest.fixture
async def async_app_client(test_config):
    """Fixture that provides an async HTTP client for testing async API endpoints"""
    app = create_app(test_config)
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_conversation(sqlite_db):
    """Fixture that creates a test conversation for testing"""
    conversation_data = {"title": "Test Conversation"}
    conversation = await sqlite_db.create_conversation(**conversation_data)
    return conversation

@pytest.fixture
async def test_memory_items(sqlite_db):
    """Fixture that creates test memory items for testing"""
    memory_items = [
        {"content": "Test memory item 1", "category": "test"},
        {"content": "Test memory item 2", "category": "test"},
    ]
    created_items = []
    for item in memory_items:
        created_item = await sqlite_db.create_memory_item(**item)
        created_items.append(created_item)
    return created_items

@pytest.fixture
async def test_document(sqlite_db):
    """Fixture that creates a test document for testing"""
    document_data = {"filename": "test.txt", "file_type": "txt", "storage_path": "/path/to/test.txt"}
    document = await sqlite_db.create_document(**document_data)
    return document

@pytest.fixture
def embedding_model():
    """Fixture that provides an embedding model for testing"""
    model = MagicMock()
    model.encode = MagicMock(return_value=[0.1, 0.2, 0.3])
    return model