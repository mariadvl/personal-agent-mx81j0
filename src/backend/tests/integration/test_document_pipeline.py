# src/backend/tests/integration/test_document_pipeline.py
import pytest
import os
import tempfile
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient
from httpx import AsyncClient

from ..services.document_processor import DocumentProcessor
from ..services.memory_service import MemoryService
from ..services.llm_service import LLMService
from ..schemas.document import ALLOWED_FILE_TYPES, DocumentChunk
from ..utils.document_parsers import get_parser_for_file_type
from .conftest import create_test_document

TEST_TEXT_CONTENT = """This is a test document for the Personal AI Agent.

It contains multiple paragraphs to test the document chunking functionality.

The document processor should extract this text and split it into appropriate chunks.

These chunks should then be stored in the memory system for later retrieval.

The document should also be summarized using the LLM service.
"""
TEST_PDF_CONTENT = """Sample PDF content for testing.

This simulates a PDF document with multiple pages.

Page 1 content would be here.

Page 2 content would be here.

Page 3 content would be here.
"""
TEST_DOCX_CONTENT = """Sample Word document content for testing.

This simulates a DOCX file with formatting.

It should contain multiple paragraphs and sections.

The document processor should handle the extraction correctly.
"""
TEST_CSV_CONTENT = """name,age,email
John Doe,30,john@example.com
Jane Smith,25,jane@example.com
Bob Johnson,45,bob@example.com
"""

def setup_test_files():
    """Creates test files of different formats for document processing tests"""
    test_files = {}
    file_path_txt, document_id_txt = create_test_document(TEST_TEXT_CONTENT, "txt", "test_document")
    test_files["txt"] = {"file_path": file_path_txt, "document_id": document_id_txt}
    file_path_pdf, document_id_pdf = create_test_document(TEST_PDF_CONTENT, "pdf", "test_pdf")
    test_files["pdf"] = {"file_path": file_path_pdf, "document_id": document_id_pdf}
    file_path_docx, document_id_docx = create_test_document(TEST_DOCX_CONTENT, "docx", "test_docx")
    test_files["docx"] = {"file_path": file_path_docx, "document_id": document_id_docx}
    file_path_csv, document_id_csv = create_test_document(TEST_CSV_CONTENT, "csv", "test_csv")
    test_files["csv"] = {"file_path": file_path_csv, "document_id": document_id_csv}
    return test_files

def cleanup_test_files(test_files):
    """Removes test files created for document processing tests"""
    for file_type, file_info in test_files.items():
        file_path = file_info["file_path"]
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Cleaned up test file: {file_path}")

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_validation(document_processor):
    """Tests the document validation functionality"""
    test_files = setup_test_files()
    for file_type, file_info in test_files.items():
        file_path = file_info["file_path"]
        result = await document_processor.validate_document(file_path)
        assert result["success"] == True, f"Validation failed for {file_type}: {result.get('error')}"
    
    invalid_file_path = "invalid_file.xyz"
    result = await document_processor.validate_document(invalid_file_path)
    assert result["success"] == False, "Validation should fail for invalid file type"
    
    non_existent_file_path = "non_existent_file.txt"
    result = await document_processor.validate_document(non_existent_file_path)
    assert result["success"] == False, "Validation should fail for non-existent file"
    
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_metadata_extraction(document_processor):
    """Tests the extraction of metadata from different document types"""
    test_files = setup_test_files()
    for file_type, file_info in test_files.items():
        file_path = file_info["file_path"]
        metadata = await document_processor.extract_document_metadata(file_path, file_type)
        assert "file_size_bytes" in metadata, f"Missing file_size_bytes in {file_type}"
        assert "creation_time" in metadata, f"Missing creation_time in {file_type}"
        if file_type == "pdf":
            assert "page_count" in metadata, "Missing page_count in PDF metadata"
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_processing_text(document_processor, memory_service, mock_llm_service):
    """Tests the complete document processing pipeline for text files"""
    test_files = setup_test_files()
    file_path = test_files["txt"]["file_path"]
    document_id = test_files["txt"]["document_id"]
    mock_llm_service.generate_response.return_value = "Test summary"
    result = await document_processor.process_document(file_path, document_id, store_in_memory=True, generate_summary=True)
    assert result["success"] == True, f"Processing failed: {result.get('error')}"
    assert result["memory_ids"] != None, "Memory IDs should be returned"
    assert result["summary"] == "Test summary", "Summary should be returned"
    chunks = await memory_service.get_by_source(source_type="document", source_id=document_id)
    assert len(chunks) > 0, "Chunks should be stored in memory"
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_processing_pdf(document_processor, memory_service, mock_llm_service):
    """Tests the complete document processing pipeline for PDF files"""
    test_files = setup_test_files()
    file_path = test_files["pdf"]["file_path"]
    document_id = test_files["pdf"]["document_id"]
    mock_llm_service.generate_response.return_value = "Test summary"
    result = await document_processor.process_document(file_path, document_id, store_in_memory=True, generate_summary=True)
    assert result["success"] == True, f"Processing failed: {result.get('error')}"
    assert result["memory_ids"] != None, "Memory IDs should be returned"
    assert result["summary"] == "Test summary", "Summary should be returned"
    chunks = await memory_service.get_by_source(source_type="document", source_id=document_id)
    assert len(chunks) > 0, "Chunks should be stored in memory"
    for chunk in chunks:
        assert "page_number" in chunk["metadata"], "Page number should be assigned to chunks"
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_processing_docx(document_processor, memory_service, mock_llm_service):
    """Tests the complete document processing pipeline for Word documents"""
    test_files = setup_test_files()
    file_path = test_files["docx"]["file_path"]
    document_id = test_files["docx"]["document_id"]
    mock_llm_service.generate_response.return_value = "Test summary"
    result = await document_processor.process_document(file_path, document_id, store_in_memory=True, generate_summary=True)
    assert result["success"] == True, f"Processing failed: {result.get('error')}"
    assert result["memory_ids"] != None, "Memory IDs should be returned"
    assert result["summary"] == "Test summary", "Summary should be returned"
    chunks = await memory_service.get_by_source(source_type="document", source_id=document_id)
    assert len(chunks) > 0, "Chunks should be stored in memory"
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_processing_csv(document_processor, memory_service, mock_llm_service):
    """Tests the complete document processing pipeline for CSV files"""
    test_files = setup_test_files()
    file_path = test_files["csv"]["file_path"]
    document_id = test_files["csv"]["document_id"]
    mock_llm_service.generate_response.return_value = "Test summary"
    result = await document_processor.process_document(file_path, document_id, store_in_memory=True, generate_summary=True)
    assert result["success"] == True, f"Processing failed: {result.get('error')}"
    assert result["memory_ids"] != None, "Memory IDs should be returned"
    assert result["summary"] == "Test summary", "Summary should be returned"
    chunks = await memory_service.get_by_source(source_type="document", source_id=document_id)
    assert len(chunks) > 0, "Chunks should be stored in memory"
    for chunk in chunks:
        assert "name" in chunk["content"] or "age" in chunk["content"] or "email" in chunk["content"], "Tabular data should be properly formatted in chunks"
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_chunking(document_processor):
    """Tests the document chunking functionality with different chunk sizes"""
    test_files = setup_test_files()
    file_path = test_files["txt"]["file_path"]
    document_id = test_files["txt"]["document_id"]
    
    # Process with default chunk size
    result_default = await document_processor.process_document(file_path, document_id, store_in_memory=False, generate_summary=False)
    parser = get_parser_for_file_type("txt")
    chunks_default = parser.parse_file(file_path, {})
    num_chunks_default = len(chunks_default)
    
    # Process with smaller chunk size
    document_processor.chunk_size = 500
    result_smaller = await document_processor.process_document(file_path, document_id, store_in_memory=False, generate_summary=False)
    parser = get_parser_for_file_type("txt")
    chunks_smaller = parser.parse_file(file_path, {})
    num_chunks_smaller = len(chunks_smaller)
    
    # Process with larger chunk size
    document_processor.chunk_size = 2000
    result_larger = await document_processor.process_document(file_path, document_id, store_in_memory=False, generate_summary=False)
    parser = get_parser_for_file_type("txt")
    chunks_larger = parser.parse_file(file_path, {})
    num_chunks_larger = len(chunks_larger)
    
    assert num_chunks_smaller > num_chunks_default, "Smaller chunk size should create more chunks"
    assert num_chunks_larger < num_chunks_default, "Larger chunk size should create fewer chunks"
    
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_summary_generation(document_processor, mock_llm_service):
    """Tests the document summary generation functionality"""
    test_files = setup_test_files()
    file_path = test_files["txt"]["file_path"]
    document_id = test_files["txt"]["document_id"]
    mock_llm_service.generate_response.return_value = "Test summary"
    
    # Extract text content
    parser = get_parser_for_file_type("txt")
    chunks = parser.parse_file(file_path, {})
    
    # Generate summary
    summary = await document_processor.generate_document_summary(chunks, {})
    
    # Assert that the summary matches the expected output
    assert summary == "Test summary", "Summary should match the expected output"
    
    # Assert that the LLM service was called with the appropriate prompt
    mock_llm_service.generate_response.assert_called_once()
    
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_memory_storage(document_processor, memory_service):
    """Tests the storage of document chunks in memory"""
    test_files = setup_test_files()
    file_path = test_files["txt"]["file_path"]
    document_id = test_files["txt"]["document_id"]
    
    # Extract text content
    parser = get_parser_for_file_type("txt")
    chunks = parser.parse_file(file_path, {})
    
    # Store chunks in memory
    memory_ids = await document_processor.store_document_chunks(chunks, document_id, {})
    
    # Assert that memory IDs are returned
    assert len(memory_ids) > 0, "Memory IDs should be returned"
    
    # Retrieve stored chunks
    stored_chunks = await memory_service.get_by_source(source_type="document", source_id=document_id)
    
    # Assert that chunks are stored with correct metadata
    assert len(stored_chunks) == len(chunks), "All chunks should be stored"
    for chunk in stored_chunks:
        assert chunk["source_type"] == "document", "Source type should be 'document'"
        assert chunk["category"] == "document", "Category should be 'document'"
    
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_search(document_processor, memory_service):
    """Tests searching for information in processed documents"""
    test_files = setup_test_files()
    file_path = test_files["txt"]["file_path"]
    document_id = test_files["txt"]["document_id"]
    
    # Process document
    parser = get_parser_for_file_type("txt")
    chunks = parser.parse_file(file_path, {})
    await document_processor.store_document_chunks(chunks, document_id, {})
    
    # Search for information
    search_results = await memory_service.search_memory(query="document processor", filters={"source_type": "document", "source_id": document_id})
    
    # Assert that relevant chunks are returned
    assert len(search_results) > 0, "Relevant chunks should be returned"
    
    # Test with a query that shouldn't match
    search_results_empty = await memory_service.search_memory(query="nonexistent topic", filters={"source_type": "document", "source_id": document_id})
    assert len(search_results_empty) == 0, "No results should be returned for non-matching query"
    
    cleanup_test_files(test_files)

@pytest.mark.asyncio
@pytest.mark.integration
async def test_document_processing_error_handling(document_processor):
    """Tests error handling in the document processing pipeline"""
    # Test with an invalid file
    invalid_file_path = "invalid_file.xyz"
    result = await document_processor.process_document(invalid_file_path, uuid.uuid4())
    assert result["success"] == False, "Processing should fail for invalid file"
    assert "Unsupported file type" in result["error"], "Error message should indicate invalid file type"
    
    # Test with a non-existent file
    non_existent_file_path = "non_existent_file.txt"
    result = await document_processor.process_document(non_existent_file_path, uuid.uuid4())
    assert result["success"] == False, "Processing should fail for non-existent file"
    assert "No such file or directory" in result["error"], "Error message should indicate file not found"