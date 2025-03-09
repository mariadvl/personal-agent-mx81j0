import os
import logging
import uuid
from typing import List, Dict, Optional, Any, Union
import asyncio

from ..utils.document_parsers import get_parser_for_file_type, DocumentParser
from ..schemas.document import ALLOWED_FILE_TYPES, DocumentChunk
from .memory_service import MemoryService
from .llm_service import LLMService
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Global constants for chunk size and overlap
DEFAULT_CHUNK_SIZE = settings.get('document.chunk_size', 1000)
DEFAULT_CHUNK_OVERLAP = settings.get('document.chunk_overlap', 100)
MAX_SUMMARY_LENGTH = settings.get('document.max_summary_length', 500)


class DocumentProcessor:
    """
    Service that processes documents, extracting content and storing it in memory.
    """

    def __init__(self, memory_service: MemoryService, llm_service: LLMService,
                 processing_options: Optional[Dict[str, Any]] = None):
        """
        Initializes the document processor with memory and LLM services.

        Args:
            memory_service: Service for storing and retrieving memory items
            llm_service: Service for generating text responses and summaries
            processing_options: Optional dictionary for overriding default processing options
        """
        self.memory_service = memory_service
        self.llm_service = llm_service
        self.processing_options = processing_options or {}
        self.chunk_size = self.processing_options.get('chunk_size', DEFAULT_CHUNK_SIZE)
        self.chunk_overlap = self.processing_options.get('chunk_overlap', DEFAULT_CHUNK_OVERLAP)
        logger.info("DocumentProcessor initialized")

    async def process_document(self, file_path: str, document_id: uuid.UUID, store_in_memory: bool = True,
                               generate_summary: bool = True, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a document file, extracting content and optionally storing in memory.

        Args:
            file_path: Path to the document file
            document_id: Unique ID for the document
            store_in_memory: Whether to store the document content in memory
            generate_summary: Whether to generate a summary of the document
            options: Optional dictionary for overriding default processing options

        Returns:
            Processing results including success status, summary, and memory IDs
        """
        try:
            # Validate that the file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            # Get the file extension and validate the file type
            file_extension = get_file_extension(file_path)
            if not validate_file_type(file_extension):
                raise ValueError(f"Unsupported file type: {file_extension}")

            # Get the appropriate parser for the file type
            parser = get_parser_for_file_type(file_extension)

            # Extract document metadata
            metadata = await self.extract_document_metadata(file_path, file_extension)
            metadata['document_id'] = str(document_id)  # Ensure document_id is in metadata

            # Parse the document content into chunks
            chunks = parser.parse_file(file_path, metadata)

            # Generate a summary if requested
            summary = None
            if generate_summary:
                summary = await self.generate_document_summary(chunks, metadata)

            # Store the chunks in memory if requested
            memory_ids = []
            if store_in_memory:
                memory_ids = await self.store_document_chunks(chunks, document_id, metadata)

            # Publish document:processed event
            event_bus.publish("document:processed", {
                "document_id": str(document_id),
                "success": True,
                "summary": summary,
                "memory_ids": memory_ids
            })

            # Return processing results
            return {
                "document_id": str(document_id),
                "success": True,
                "summary": summary,
                "memory_ids": memory_ids
            }

        except Exception as e:
            # Handle and log any errors during processing
            logger.error(f"Error processing document {file_path}: {str(e)}")
            event_bus.publish("document:processed", {
                "document_id": str(document_id),
                "success": False,
                "error": str(e)
            })
            return {
                "document_id": str(document_id),
                "success": False,
                "error": str(e)
            }

    async def extract_document_metadata(self, file_path: str, file_type: str) -> Dict[str, Any]:
        """
        Extract metadata from a document file.

        Args:
            file_path: Path to the document file
            file_type: Type of the document file

        Returns:
            Document metadata
        """
        try:
            # Get the appropriate parser for the file type
            parser = get_parser_for_file_type(file_type)

            # Extract metadata using the parser
            metadata = parser.extract_metadata(file_path)

            # Return the metadata dictionary
            return metadata
        except Exception as e:
            # Handle and log any errors during extraction
            logger.error(f"Error extracting metadata from document {file_path}: {str(e)}")
            return {}

    async def generate_document_summary(self, chunks: List[DocumentChunk], metadata: Dict[str, Any]) -> str:
        """
        Generate a summary of the document content using LLM.

        Args:
            chunks: List of document chunks
            metadata: Document metadata

        Returns:
            Document summary
        """
        try:
            # Prepare prompt for summarization
            prompt = "Please provide a concise summary of the following document content."

            # Include document metadata in the prompt
            if metadata:
                prompt += f"\nDocument Metadata: {metadata}"

            # Include a sample of the document content in the prompt
            sample_content = "\n".join([chunk.content for chunk in chunks[:3]])  # Use first 3 chunks as sample
            prompt += f"\nSample Content: {sample_content}"

            # Set max length for the summary
            max_length = MAX_SUMMARY_LENGTH

            # Generate the summary using the LLM service
            summary = await self.llm_service.generate_response(prompt, {"max_length": max_length})

            # Return the generated summary
            return summary
        except Exception as e:
            # Handle and log any errors during summarization
            logger.error(f"Error generating document summary: {str(e)}")
            return "Error generating summary."

    async def store_document_chunks(self, chunks: List[DocumentChunk], document_id: uuid.UUID,
                                   metadata: Dict[str, Any]) -> List[str]:
        """
        Store document chunks in memory for future retrieval.

        Args:
            chunks: List of document chunks
            document_id: Unique ID for the document
            metadata: Document metadata

        Returns:
            List of memory item IDs
        """
        try:
            # Prepare memory items from document chunks
            memory_items = []
            for chunk in chunks:
                memory_items.append({
                    "content": chunk.content,
                    "category": "document",
                    "source_type": "document",
                    "source_id": str(document_id),
                    "metadata": {
                        "page_number": chunk.page_number,
                        **metadata
                    }
                })

            # Store memory items in batch
            stored_items = await self.memory_service.batch_store_memory(memory_items)

            # Extract memory item IDs
            memory_ids = [item["id"] for item in stored_items]

            # Return the list of memory item IDs
            return memory_ids
        except Exception as e:
            # Handle and log any errors during storage
            logger.error(f"Error storing document chunks: {str(e)}")
            return []

    async def validate_document(self, file_path: str) -> Dict[str, Any]:
        """
        Validate a document file before processing.

        Args:
            file_path: Path to the document file

        Returns:
            Validation results including success status and file info
        """
        try:
            # Check if the file exists
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")

            # Get file size and check against maximum allowed size
            file_size = os.path.getsize(file_path)
            max_size_bytes = settings.get('storage.max_file_size_mb', 100) * 1024 * 1024  # Convert MB to bytes
            if file_size > max_size_bytes:
                raise ValueError(f"File size exceeds maximum allowed size ({max_size_bytes} bytes)")

            # Get file extension and validate file type
            file_extension = get_file_extension(file_path)
            if not validate_file_type(file_extension):
                raise ValueError(f"Unsupported file type: {file_extension}")

            # Return validation results with success status
            return {
                "success": True,
                "file_path": file_path,
                "file_size": file_size,
                "file_type": file_extension
            }
        except Exception as e:
            # Handle and log any errors during validation
            logger.error(f"Error validating document {file_path}: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def get_processing_status(self, document_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get the current status of document processing.

        Args:
            document_id: ID of the document

        Returns:
            Processing status information
        """
        # Placeholder for future implementation
        return {"status": "Not implemented"}

    async def cancel_processing(self, document_id: uuid.UUID) -> bool:
        """
        Cancel an ongoing document processing task.

        Args:
            document_id: ID of the document

        Returns:
            True if processing was cancelled, False otherwise
        """
        # Placeholder for future implementation
        return False

    def update_processing_options(self, options: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update the default processing options.

        Args:
            options: Dictionary of options to update

        Returns:
            Updated processing options
        """
        try:
            # Update processing_options with new values
            self.processing_options.update(options)

            # Validate option values
            if 'chunk_size' in options:
                self.chunk_size = options['chunk_size']
            if 'chunk_overlap' in options:
                self.chunk_overlap = options['chunk_overlap']

            # Log option updates
            logger.info(f"Updated processing options: {options}")

            # Return updated options
            return self.processing_options
        except Exception as e:
            # Handle and log any errors during update
            logger.error(f"Error updating processing options: {str(e)}")
            return self.processing_options


def validate_file_type(file_type: str) -> bool:
    """
    Validates that the file type is supported for processing.

    Args:
        file_type: File extension

    Returns:
        True if file type is supported, False otherwise
    """
    if file_type.lower() in ALLOWED_FILE_TYPES:
        return True
    logger.warning(f"Unsupported file type: {file_type}")
    return False


def get_file_extension(filename: str) -> str:
    """
    Extracts the file extension from a filename.

    Args:
        filename: Name of the file

    Returns:
        File extension without the dot
    """
    extension = os.path.splitext(filename)[1]
    return extension.lower().lstrip('.')