import pytest
from unittest.mock import AsyncMock, MagicMock
import os
import uuid

from src.backend.services.document_processor import DocumentProcessor
from src.backend.schemas.document import DocumentChunk
from src.backend.utils.document_parsers import get_parser_for_file_type, DocumentParser, PDFParser, DocxParser, TextParser
from src.backend.services.memory_service import MemoryService
from src.backend.services.llm_service import LLMService
from src.backend.utils.event_bus import EventBus

import pytest_asyncio

@pytest_asyncio.fixture
async def setup_document_processor():
    """Fixture to set up a DocumentProcessor instance with mocked dependencies"""
    # Create mock MemoryService
    memory_service = MagicMock(spec=MemoryService)
    memory_service.store_memory = AsyncMock()
    memory_service.batch_store_memory = AsyncMock()

    # Create mock LLMService
    llm_service = MagicMock(spec=LLMService)
    llm_service.generate_response = AsyncMock()

    # Create mock EventBus
    event_bus = MagicMock(spec=EventBus)
    event_bus.publish = MagicMock()

    # Create DocumentProcessor with mocked dependencies
    document_processor = DocumentProcessor(memory_service, llm_service)

    # Return the DocumentProcessor instance
    return document_processor

@pytest_asyncio.fixture
async def mock_pdf_parser():
    """Fixture to create a mock PDF parser"""
    # Create MagicMock for PDFParser
    parser = MagicMock(spec=PDFParser)

    # Configure parse_file method to return sample chunks
    parser.parse_file.return_value = [
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=0, content="Sample PDF chunk 1"),
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=1, content="Sample PDF chunk 2")
    ]

    # Configure extract_metadata method to return sample metadata
    parser.extract_metadata.return_value = {"author": "Test Author", "title": "Test PDF"}

    # Return the mock parser
    return parser

@pytest_asyncio.fixture
async def mock_docx_parser():
    """Fixture to create a mock Word document parser"""
    # Create MagicMock for DocxParser
    parser = MagicMock(spec=DocxParser)

    # Configure parse_file method to return sample chunks
    parser.parse_file.return_value = [
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=0, content="Sample DOCX chunk 1"),
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=1, content="Sample DOCX chunk 2")
    ]

    # Configure extract_metadata method to return sample metadata
    parser.extract_metadata.return_value = {"author": "Test Author", "title": "Test DOCX"}

    # Return the mock parser
    return parser

@pytest_asyncio.fixture
async def mock_text_parser():
    """Fixture to create a mock text file parser"""
    # Create MagicMock for TextParser
    parser = MagicMock(spec=TextParser)

    # Configure parse_file method to return sample chunks
    parser.parse_file.return_value = [
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=0, content="Sample TXT chunk 1"),
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=1, content="Sample TXT chunk 2")
    ]

    # Configure extract_metadata method to return sample metadata
    parser.extract_metadata.return_value = {"author": "Test Author", "title": "Test TXT"}

    # Return the mock parser
    return parser

@pytest_asyncio.fixture
async def sample_document_chunks():
    """Fixture to provide sample document chunks for testing"""
    # Create list of DocumentChunk objects with sample content
    chunks = [
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=0, content="Sample chunk 1"),
        DocumentChunk(document_id=uuid.uuid4(), chunk_index=1, content="Sample chunk 2")
    ]

    # Return the list of chunks
    return chunks

@pytest.mark.asyncio
async def test_process_document_pdf(setup_document_processor, mock_pdf_parser, monkeypatch):
    """Test processing a PDF document"""
    # Patch get_parser_for_file_type to return mock_pdf_parser
    monkeypatch.setattr("src.backend.services.document_processor.get_parser_for_file_type", lambda file_type: mock_pdf_parser)

    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Call process_document with PDF file path
    result = await setup_document_processor.process_document("test.pdf", document_id)

    # Assert that mock_pdf_parser.parse_file was called
    mock_pdf_parser.parse_file.assert_called_once()

    # Assert that mock_pdf_parser.extract_metadata was called
    mock_pdf_parser.extract_metadata.assert_called_once()

    # Assert that memory_service.batch_store_memory was called
    setup_document_processor.memory_service.batch_store_memory.assert_called_once()

    # Assert that llm_service.generate_response was called
    setup_document_processor.llm_service.generate_response.assert_called_once()

    # Assert that event_bus.publish was called with document:processed event
    setup_document_processor.event_bus.publish.assert_called_with("document:processed", {
        "document_id": str(document_id),
        "success": True,
        "summary": setup_document_processor.llm_service.generate_response.return_value,
        "memory_ids": [None, None]
    })

    # Assert that the result contains expected fields
    assert "document_id" in result
    assert result["success"] is True
    assert "summary" in result
    assert "memory_ids" in result

@pytest.mark.asyncio
async def test_process_document_docx(setup_document_processor, mock_docx_parser, monkeypatch):
    """Test processing a Word document"""
    # Patch get_parser_for_file_type to return mock_docx_parser
    monkeypatch.setattr("src.backend.services.document_processor.get_parser_for_file_type", lambda file_type: mock_docx_parser)

    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Call process_document with DOCX file path
    result = await setup_document_processor.process_document("test.docx", document_id)

    # Assert that mock_docx_parser.parse_file was called
    mock_docx_parser.parse_file.assert_called_once()

    # Assert that mock_docx_parser.extract_metadata was called
    mock_docx_parser.extract_metadata.assert_called_once()

    # Assert that memory_service.batch_store_memory was called
    setup_document_processor.memory_service.batch_store_memory.assert_called_once()

    # Assert that llm_service.generate_response was called
    setup_document_processor.llm_service.generate_response.assert_called_once()

    # Assert that event_bus.publish was called with document:processed event
    setup_document_processor.event_bus.publish.assert_called_with("document:processed", {
        "document_id": str(document_id),
        "success": True,
        "summary": setup_document_processor.llm_service.generate_response.return_value,
        "memory_ids": [None, None]
    })

    # Assert that the result contains expected fields
    assert "document_id" in result
    assert result["success"] is True
    assert "summary" in result
    assert "memory_ids" in result

@pytest.mark.asyncio
async def test_process_document_txt(setup_document_processor, mock_text_parser, monkeypatch):
    """Test processing a text document"""
    # Patch get_parser_for_file_type to return mock_text_parser
    monkeypatch.setattr("src.backend.services.document_processor.get_parser_for_file_type", lambda file_type: mock_text_parser)

    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Call process_document with TXT file path
    result = await setup_document_processor.process_document("test.txt", document_id)

    # Assert that mock_text_parser.parse_file was called
    mock_text_parser.parse_file.assert_called_once()

    # Assert that mock_text_parser.extract_metadata was called
    mock_text_parser.extract_metadata.assert_called_once()

    # Assert that memory_service.batch_store_memory was called
    setup_document_processor.memory_service.batch_store_memory.assert_called_once()

    # Assert that llm_service.generate_response was called
    setup_document_processor.llm_service.generate_response.assert_called_once()

    # Assert that event_bus.publish was called with document:processed event
    setup_document_processor.event_bus.publish.assert_called_with("document:processed", {
        "document_id": str(document_id),
        "success": True,
        "summary": setup_document_processor.llm_service.generate_response.return_value,
        "memory_ids": [None, None]
    })

    # Assert that the result contains expected fields
    assert "document_id" in result
    assert result["success"] is True
    assert "summary" in result
    assert "memory_ids" in result

@pytest.mark.asyncio
async def test_process_document_file_not_found(setup_document_processor, monkeypatch):
    """Test handling of non-existent file"""
    # Patch os.path.exists to return False
    monkeypatch.setattr("os.path.exists", lambda path: False)

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Call process_document with non-existent file path
    result = await setup_document_processor.process_document("nonexistent.pdf", document_id)

    # Assert that the result contains success=False
    assert result["success"] is False

    # Assert that the result contains an error message about file not found
    assert "error" in result
    assert "File not found" in result["error"]

@pytest.mark.asyncio
async def test_process_document_unsupported_file_type(setup_document_processor, monkeypatch):
    """Test handling of unsupported file type"""
    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Call process_document with unsupported file extension
    result = await setup_document_processor.process_document("test.unsupported", document_id)

    # Assert that the result contains success=False
    assert result["success"] is False

    # Assert that the result contains an error message about unsupported file type
    assert "error" in result
    assert "Unsupported file type" in result["error"]

@pytest.mark.asyncio
async def test_extract_document_metadata(setup_document_processor, mock_pdf_parser, monkeypatch):
    """Test extraction of document metadata"""
    # Patch get_parser_for_file_type to return mock_pdf_parser
    monkeypatch.setattr("src.backend.services.document_processor.get_parser_for_file_type", lambda file_type: mock_pdf_parser)

    # Call extract_document_metadata with file path and type
    metadata = await setup_document_processor.extract_document_metadata("test.pdf", "pdf")

    # Assert that mock_pdf_parser.extract_metadata was called
    mock_pdf_parser.extract_metadata.assert_called_once()

    # Assert that the returned metadata matches expected values
    assert metadata == {"author": "Test Author", "title": "Test PDF"}

@pytest.mark.asyncio
async def test_generate_document_summary(setup_document_processor, sample_document_chunks):
    """Test generation of document summary"""
    # Set up mock LLM response for summary
    setup_document_processor.llm_service.generate_response.return_value = "Test document summary"

    # Create test metadata dictionary
    metadata = {"author": "Test Author", "title": "Test Document"}

    # Call generate_document_summary with chunks and metadata
    summary = await setup_document_processor.generate_document_summary(sample_document_chunks, metadata)

    # Assert that llm_service.generate_response was called with appropriate prompt
    setup_document_processor.llm_service.generate_response.assert_called_once()
    prompt = setup_document_processor.llm_service.generate_response.call_args[0][0]
    assert "Please provide a concise summary" in prompt
    assert "Sample chunk 1" in prompt
    assert "Test Author" in prompt
    assert "Test Document" in prompt

    # Assert that the returned summary matches the mock response
    assert summary == "Test document summary"

@pytest.mark.asyncio
async def test_store_document_chunks(setup_document_processor, sample_document_chunks):
    """Test storing document chunks in memory"""
    # Set up mock memory_service to return memory IDs
    setup_document_processor.memory_service.batch_store_memory.return_value = [
        {"id": "memory_id_1"},
        {"id": "memory_id_2"}
    ]

    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Create test metadata dictionary
    metadata = {"author": "Test Author", "title": "Test Document"}

    # Call store_document_chunks with chunks, document_id, and metadata
    memory_ids = await setup_document_processor.store_document_chunks(sample_document_chunks, document_id, metadata)

    # Assert that memory_service.batch_store_memory was called with correct parameters
    setup_document_processor.memory_service.batch_store_memory.assert_called_once()
    memory_items = setup_document_processor.memory_service.batch_store_memory.call_args[0][0]
    assert len(memory_items) == 2
    assert memory_items[0]["content"] == "Sample chunk 1"
    assert memory_items[0]["category"] == "document"
    assert memory_items[0]["source_type"] == "document"
    assert memory_items[0]["source_id"] == str(document_id)
    assert memory_items[0]["metadata"]["author"] == "Test Author"
    assert memory_items[0]["metadata"]["title"] == "Test Document"

    # Assert that the returned memory IDs match expected values
    assert memory_ids == ["memory_id_1", "memory_id_2"]

@pytest.mark.asyncio
async def test_validate_document(setup_document_processor, monkeypatch):
    """Test document validation"""
    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Patch os.path.getsize to return valid file size
    monkeypatch.setattr("os.path.getsize", lambda path: 1024)

    # Call validate_document with valid file path
    result = await setup_document_processor.validate_document("test.pdf")

    # Assert that the result contains success=True
    assert result["success"] is True

    # Assert that the result contains valid file info
    assert "file_path" in result
    assert "file_size" in result
    assert "file_type" in result

@pytest.mark.asyncio
async def test_validate_document_file_not_found(setup_document_processor, monkeypatch):
    """Test validation of non-existent file"""
    # Patch os.path.exists to return False
    monkeypatch.setattr("os.path.exists", lambda path: False)

    # Call validate_document with non-existent file path
    result = await setup_document_processor.validate_document("nonexistent.pdf")

    # Assert that the result contains success=False
    assert result["success"] is False

    # Assert that the result contains an error message about file not found
    assert "error" in result
    assert "File not found" in result["error"]

@pytest.mark.asyncio
async def test_validate_document_file_too_large(setup_document_processor, monkeypatch):
    """Test validation of oversized file"""
    # Patch os.path.exists to return True
    monkeypatch.setattr("os.path.exists", lambda path: True)

    # Patch os.path.getsize to return size larger than maximum
    monkeypatch.setattr("os.path.getsize", lambda path: 200 * 1024 * 1024)

    # Call validate_document with file path
    result = await setup_document_processor.validate_document("test.pdf")

    # Assert that the result contains success=False
    assert result["success"] is False

    # Assert that the result contains an error message about file size
    assert "error" in result
    assert "File size exceeds maximum" in result["error"]

@pytest.mark.asyncio
async def test_get_processing_status(setup_document_processor):
    """Test retrieving document processing status"""
    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Create mock DocumentProcessingTask
    task = MagicMock()
    task.get_status.return_value = "Processing"

    # Add task to document processor's processing_tasks
    setup_document_processor.processing_tasks = {document_id: task}

    # Call get_processing_status with document_id
    status = await setup_document_processor.get_processing_status(document_id)

    # Assert that the returned status matches the task's status
    assert status["status"] == "Processing"

@pytest.mark.asyncio
async def test_cancel_processing(setup_document_processor):
    """Test cancellation of document processing"""
    # Create test document_id using uuid
    document_id = uuid.uuid4()

    # Create mock DocumentProcessingTask
    task = MagicMock()
    task.set_cancelled = MagicMock()

    # Add task to document processor's processing_tasks
    setup_document_processor.processing_tasks = {document_id: task}

    # Call cancel_processing with document_id
    result = await setup_document_processor.cancel_processing(document_id)

    # Assert that task.set_cancelled was called
    task.set_cancelled.assert_called_once()

    # Assert that event_bus.publish was called with document:processing_cancelled event
    setup_document_processor.event_bus.publish.assert_called_with("document:processing_cancelled", {"document_id": str(document_id)})

    # Assert that the result is True
    assert result is True

def test_update_processing_options(setup_document_processor):
    """Test updating document processing options"""
    # Create new processing options dictionary
    new_options = {"chunk_size": 500, "chunk_overlap": 50}

    # Call update_processing_options with new options
    updated_options = setup_document_processor.update_processing_options(new_options)

    # Assert that the processor's processing_options were updated
    assert setup_document_processor.processing_options["chunk_size"] == 500
    assert setup_document_processor.processing_options["chunk_overlap"] == 50

    # Assert that the returned options match the updated options
    assert updated_options == setup_document_processor.processing_options