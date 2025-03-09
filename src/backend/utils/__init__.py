import logging
from typing import List

# Import all utility modules
from . import document_parsers
from . import embeddings
from . import encryption
from . import text_processing
from . import event_bus
from . import web_scraper
from . import validators
from . import logging_setup

# Configure logger
logger = logging.getLogger(__name__)

# List of all exported names from the utils module
__all__ = [
    "DocumentParser",
    "PDFParser",
    "DocxParser",
    "TextParser",
    "SpreadsheetParser",
    "get_parser_for_file_type",
    "chunk_text",
    "EmbeddingModel",
    "OpenAIEmbeddingModel",
    "LocalEmbeddingModel",
    "EmbeddingCache",
    "get_embedding_model",
    "get_embedding_dimension",
    "normalize_embedding",
    "cosine_similarity",
    "batch_texts_for_embeddings",
    "encrypt_value",
    "decrypt_value",
    "encrypt_string",
    "decrypt_string",
    "encrypt_file",
    "decrypt_file",
    "get_master_key",
    "create_key_from_password",
    "EncryptionManager",
    "TextChunker",
    "TextSummarizer",
    "clean_text",
    "count_tokens",
    "truncate_text_to_token_limit",
    "split_text_by_sentences",
    "split_text_by_paragraphs",
    "extract_text_from_html",
    "extract_main_content",
    "merge_text_chunks",
    "EventBus",
    "AsyncEventBus",
    "create_event",
    "WebScraper",
    "ReadabilityExtractor",
    "fetch_url",
    "check_robots_txt",
    "extract_metadata",
    "extract_images",
    "normalize_url",
    "is_valid_url",
    "validate_url",
    "validate_email",
    "validate_file_type",
    "validate_file_content",
    "validate_filename",
    "validate_file_path",
    "sanitize_text",
    "validate_content_length",
    "validate_numeric_range",
    "validate_api_key",
    "validate_json",
    "InputValidator",
    "FileValidator",
    "setup_logging",
    "get_log_level",
    "get_default_log_directory",
    "DEFAULT_CHUNK_SIZE",
    "DEFAULT_CHUNK_OVERLAP",
    "DEFAULT_EMBEDDING_MODEL",
    "EMBEDDING_DIMENSION",
    "DANGEROUS_FILE_EXTENSIONS",
    "MAX_CONTENT_LENGTH",
    "MAX_FILENAME_LENGTH"
]

# Document parsing and text extraction utilities
DocumentParser = document_parsers.DocumentParser
PDFParser = document_parsers.PDFParser
DocxParser = document_parsers.DocxParser
TextParser = document_parsers.TextParser
SpreadsheetParser = document_parsers.SpreadsheetParser
get_parser_for_file_type = document_parsers.get_parser_for_file_type
chunk_text = document_parsers.chunk_text
DEFAULT_CHUNK_SIZE = document_parsers.DEFAULT_CHUNK_SIZE
DEFAULT_CHUNK_OVERLAP = document_parsers.DEFAULT_CHUNK_OVERLAP

# Vector embedding generation and management
EmbeddingModel = embeddings.EmbeddingModel
OpenAIEmbeddingModel = embeddings.OpenAIEmbeddingModel
LocalEmbeddingModel = embeddings.LocalEmbeddingModel
EmbeddingCache = embeddings.EmbeddingCache
get_embedding_model = embeddings.get_embedding_model
get_embedding_dimension = embeddings.get_embedding_dimension
normalize_embedding = embeddings.normalize_embedding
cosine_similarity = embeddings.cosine_similarity
batch_texts_for_embeddings = embeddings.batch_texts_for_embeddings
DEFAULT_EMBEDDING_MODEL = embeddings.DEFAULT_EMBEDDING_MODEL
EMBEDDING_DIMENSION = embeddings.EMBEDDING_DIMENSION

# Data encryption and security utilities
encrypt_value = encryption.encrypt_value
decrypt_value = encryption.decrypt_value
encrypt_string = encryption.encrypt_string
decrypt_string = encryption.decrypt_string
encrypt_file = encryption.encrypt_file
decrypt_file = encryption.decrypt_file
get_master_key = encryption.get_master_key
create_key_from_password = encryption.create_key_from_password
EncryptionManager = encryption.EncryptionManager

# Text processing and manipulation utilities
TextChunker = text_processing.TextChunker
TextSummarizer = text_processing.TextSummarizer
clean_text = text_processing.clean_text
count_tokens = text_processing.count_tokens
truncate_text_to_token_limit = text_processing.truncate_text_to_token_limit
split_text_by_sentences = text_processing.split_text_by_sentences
split_text_by_paragraphs = text_processing.split_text_by_paragraphs
extract_text_from_html = text_processing.extract_text_from_html
extract_main_content = text_processing.extract_main_content
merge_text_chunks = text_processing.merge_text_chunks
DEFAULT_CHUNK_SIZE = text_processing.DEFAULT_CHUNK_SIZE
DEFAULT_CHUNK_OVERLAP = text_processing.DEFAULT_CHUNK_OVERLAP

# Event-based communication between components
EventBus = event_bus.EventBus
AsyncEventBus = event_bus.AsyncEventBus
create_event = event_bus.create_event

# Web content extraction and processing
WebScraper = web_scraper.WebScraper
ReadabilityExtractor = web_scraper.ReadabilityExtractor
fetch_url = web_scraper.fetch_url
check_robots_txt = web_scraper.check_robots_txt
extract_metadata = web_scraper.extract_metadata
extract_images = web_scraper.extract_images
normalize_url = web_scraper.normalize_url
is_valid_url = web_scraper.is_valid_url

# Input validation and sanitization utilities
validate_url = validators.validate_url
validate_email = validators.validate_email
validate_file_type = validators.validate_file_type
validate_file_content = validators.validate_file_content
validate_filename = validators.validate_filename
validate_file_path = validators.validate_file_path
sanitize_text = validators.sanitize_text
validate_content_length = validators.validate_content_length
validate_numeric_range = validators.validate_numeric_range
validate_api_key = validators.validate_api_key
validate_json = validators.validate_json
InputValidator = validators.InputValidator
FileValidator = validators.FileValidator
DANGEROUS_FILE_EXTENSIONS = validators.DANGEROUS_FILE_EXTENSIONS
MAX_CONTENT_LENGTH = validators.MAX_CONTENT_LENGTH
MAX_FILENAME_LENGTH = validators.MAX_FILENAME_LENGTH

# Logging configuration and setup
setup_logging = logging_setup.setup_logging
get_log_level = logging_setup.get_log_level
get_default_log_directory = logging_setup.get_default_log_directory