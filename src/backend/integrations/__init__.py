"""
Integration module for the Personal AI Agent.

This module provides access to external services such as OpenAI, ElevenLabs,
search providers, and cloud storage services. It implements adapter patterns
and common interfaces for these services to ensure consistent usage throughout
the application while enabling easy switching between different providers.

All integrations follow consistent error handling patterns and implement
appropriate retry and circuit breaking mechanisms.
"""

# OpenAI API Integration
from .openai_client import (
    OpenAIClient,
    get_openai_api_key,
    create_openai_client,
)

# ElevenLabs TTS Integration
from .elevenlabs_client import ElevenLabsClient

# Search Integrations
from .serpapi_client import (
    SerpApiClient,
    SerpApiError,
    SerpApiAuthError,
    SerpApiRateLimitError,
    SerpApiServerError,
)
from .duckduckgo_client import DuckDuckGoClient

# Cloud Storage Integrations
from .cloud_storage import (
    CloudStorageProvider,
    S3StorageProvider,
    GCSStorageProvider,
    AzureStorageProvider,
    CloudStorageManager,
    get_cloud_storage_provider,
    validate_cloud_settings,
)

# Define what gets exported when using 'from integrations import *'
__all__ = [
    # OpenAI
    'OpenAIClient',
    'get_openai_api_key',
    'create_openai_client',
    
    # ElevenLabs
    'ElevenLabsClient',
    
    # Search
    'SerpApiClient',
    'SerpApiError',
    'SerpApiAuthError',
    'SerpApiRateLimitError',
    'SerpApiServerError',
    'DuckDuckGoClient',
    
    # Cloud Storage
    'CloudStorageProvider',
    'S3StorageProvider',
    'GCSStorageProvider',
    'AzureStorageProvider',
    'CloudStorageManager',
    'get_cloud_storage_provider',
    'validate_cloud_settings',
]