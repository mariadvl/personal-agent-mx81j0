# Personal AI Agent API Documentation

## Introduction

This document provides comprehensive documentation for the Personal AI Agent API. The API follows a RESTful design pattern and is built using FastAPI. All endpoints return JSON responses unless otherwise specified.

The Personal AI Agent is a local-first application, meaning all data is stored on the user's device by default. The API server runs locally on the user's machine and is not accessible from the internet unless explicitly configured otherwise.

## Base URL

When running locally, the API is accessible at:

```
http://localhost:8000/api
```

All endpoints are prefixed with `/api`.

## Authentication

The Personal AI Agent uses a local-first authentication approach. By default, the API server only accepts connections from the local machine. For additional security, some endpoints may require device-level authentication.

When authentication is required, include the authentication token in the request headers:

```
Authorization: Bearer {token}
```

The token is generated during the application setup and stored securely on the device.

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response body will contain additional information about the error.

Example error response:

```json
{
  "detail": {
    "message": "Error message describing what went wrong",
    "code": "ERROR_CODE",
    "params": {}
  }
}
```

Common error status codes:

- `400 Bad Request`: The request was invalid or cannot be served
- `401 Unauthorized`: Authentication is required or failed
- `403 Forbidden`: The authenticated user doesn't have permission
- `404 Not Found`: The requested resource doesn't exist
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: An unexpected error occurred on the server

## Conversation Endpoints

Endpoints for managing conversations with the AI agent.

### Send Message

```
POST /api/conversation
```

Send a message to the AI agent and get a response.

**Request Body:**

```json
{
  "message": "string",
  "conversation_id": "string (optional)",
  "voice": "boolean (optional)"
}
```

**Response:**

```json
{
  "response": "string",
  "conversation_id": "string",
  "audio_url": "string (if voice=true)"
}
```

### Create Conversation

```
POST /api/conversation/create
```

Create a new conversation.

**Request Body:**

```json
{
  "title": "string (optional)",
  "metadata": "object (optional)"
}
```

**Response:**

```json
{
  "id": "string",
  "title": "string",
  "created_at": "string (ISO datetime)",
  "updated_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Get Conversation

```
GET /api/conversation/{conversation_id}
```

Retrieve a specific conversation by ID.

**Path Parameters:**

- `conversation_id`: UUID of the conversation

**Query Parameters:**

- `message_limit`: Maximum number of messages to return (default: 100)

**Response:**

```json
{
  "id": "string",
  "title": "string",
  "created_at": "string (ISO datetime)",
  "updated_at": "string (ISO datetime)",
  "metadata": "object",
  "messages": [
    {
      "id": "string",
      "role": "string (user or assistant)",
      "content": "string",
      "created_at": "string (ISO datetime)"
    }
  ]
}
```

### List Conversations

```
GET /api/conversation
```

List all conversations with pagination.

**Query Parameters:**

- `limit`: Maximum number of conversations to return (default: 50)
- `offset`: Number of conversations to skip (default: 0)

**Response:**

```json
[
  {
    "id": "string",
    "title": "string",
    "created_at": "string (ISO datetime)",
    "updated_at": "string (ISO datetime)",
    "metadata": "object"
  }
]
```

### Update Conversation

```
PATCH /api/conversation/{conversation_id}
```

Update conversation metadata.

**Path Parameters:**

- `conversation_id`: UUID of the conversation

**Request Body:**

```json
{
  "title": "string (optional)",
  "metadata": "object (optional)"
}
```

**Response:**

```json
{
  "id": "string",
  "title": "string",
  "created_at": "string (ISO datetime)",
  "updated_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Delete Conversation

```
DELETE /api/conversation/{conversation_id}
```

Delete a conversation and all its messages.

**Path Parameters:**

- `conversation_id`: UUID of the conversation

**Response:**

```json
{
  "success": true
}
```

### Get Conversation History

```
GET /api/conversation/{conversation_id}/history
```

Retrieve message history for a conversation.

**Path Parameters:**

- `conversation_id`: UUID of the conversation

**Query Parameters:**

- `limit`: Maximum number of messages to return (default: 100)
- `offset`: Number of messages to skip (default: 0)

**Response:**

```json
[
  {
    "id": "string",
    "role": "string (user or assistant)",
    "content": "string",
    "created_at": "string (ISO datetime)"
  }
]
```

### Summarize Conversation

```
POST /api/conversation/{conversation_id}/summarize
```

Generate or update a summary for a conversation.

**Path Parameters:**

- `conversation_id`: UUID of the conversation

**Response:**

```json
{
  "summary": "string"
}
```

## Memory Endpoints

Endpoints for managing the AI agent's memory system.

### Create Memory

```
POST /api/memory
```

Create a new memory item.

**Request Body:**

```json
{
  "content": "string",
  "category": "string",
  "source_type": "string (optional)",
  "source_id": "string (optional)",
  "importance": "integer (1-5, optional)",
  "metadata": "object (optional)"
}
```

**Response:**

```json
{
  "id": "string",
  "content": "string",
  "category": "string",
  "source_type": "string",
  "source_id": "string",
  "importance": "integer",
  "created_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Get Memory

```
GET /api/memory/{memory_id}
```

Retrieve a specific memory item by ID.

**Path Parameters:**

- `memory_id`: UUID of the memory item

**Response:**

```json
{
  "id": "string",
  "content": "string",
  "category": "string",
  "source_type": "string",
  "source_id": "string",
  "importance": "integer",
  "created_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Update Memory

```
PATCH /api/memory/{memory_id}
```

Update an existing memory item.

**Path Parameters:**

- `memory_id`: UUID of the memory item

**Request Body:**

```json
{
  "content": "string (optional)",
  "category": "string (optional)",
  "importance": "integer (1-5, optional)",
  "metadata": "object (optional)"
}
```

**Response:**

```json
{
  "id": "string",
  "content": "string",
  "category": "string",
  "source_type": "string",
  "source_id": "string",
  "importance": "integer",
  "created_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Delete Memory

```
DELETE /api/memory/{memory_id}
```

Delete a memory item.

**Path Parameters:**

- `memory_id`: UUID of the memory item

**Response:**

```json
{
  "success": true
}
```

### Search Memory

```
POST /api/memory/search
```

Search for memory items.

**Request Body:**

```json
{
  "query": "string",
  "limit": "integer (optional)",
  "categories": ["string (optional)"],
  "filters": "object (optional)"
}
```

**Response:**

```json
{
  "results": [
    {
      "id": "string",
      "content": "string",
      "category": "string",
      "source_type": "string",
      "source_id": "string",
      "importance": "integer",
      "created_at": "string (ISO datetime)",
      "metadata": "object",
      "score": "number"
    }
  ],
  "total": "integer",
  "query": "string"
}
```

### Retrieve Context

```
POST /api/memory/context
```

Retrieve context based on a query.

**Request Body:**

```json
{
  "query": "string",
  "limit": "integer (optional)",
  "categories": ["string (optional)"],
  "filters": "object (optional)",
  "conversation_id": "string (optional)",
  "format_type": "string (optional)"
}
```

**Response:**

```json
{
  "items": [
    {
      "id": "string",
      "content": "string",
      "category": "string",
      "source_type": "string",
      "source_id": "string",
      "importance": "integer",
      "created_at": "string (ISO datetime)",
      "metadata": "object",
      "score": "number"
    }
  ],
  "formatted_context": "string",
  "query": "string"
}
```

### Get by Category

```
GET /api/memory/category/{category}
```

Retrieve memory items by category.

**Path Parameters:**

- `category`: Category name

**Query Parameters:**

- `limit`: Maximum number of items to return (default: 50)
- `offset`: Number of items to skip (default: 0)

**Response:**

```json
[
  {
    "id": "string",
    "content": "string",
    "category": "string",
    "source_type": "string",
    "source_id": "string",
    "importance": "integer",
    "created_at": "string (ISO datetime)",
    "metadata": "object"
  }
]
```

### Get by Source

```
GET /api/memory/source/{source_type}/{source_id}
```

Retrieve memory items by source.

**Path Parameters:**

- `source_type`: Type of source (e.g., "conversation", "document", "web")
- `source_id`: UUID of the source

**Query Parameters:**

- `limit`: Maximum number of items to return (default: 50)
- `offset`: Number of items to skip (default: 0)

**Response:**

```json
[
  {
    "id": "string",
    "content": "string",
    "category": "string",
    "source_type": "string",
    "source_id": "string",
    "importance": "integer",
    "created_at": "string (ISO datetime)",
    "metadata": "object"
  }
]
```

### Get Recent Memories

```
GET /api/memory/recent
```

Retrieve the most recent memory items.

**Query Parameters:**

- `limit`: Maximum number of items to return (default: 50)

**Response:**

```json
[
  {
    "id": "string",
    "content": "string",
    "category": "string",
    "source_type": "string",
    "source_id": "string",
    "importance": "integer",
    "created_at": "string (ISO datetime)",
    "metadata": "object"
  }
]
```

### Mark as Important

```
POST /api/memory/{memory_id}/important
```

Mark a memory item as important.

**Path Parameters:**

- `memory_id`: UUID of the memory item

**Query Parameters:**

- `importance_level`: Importance level (1-5, default: 3)

**Response:**

```json
{
  "id": "string",
  "content": "string",
  "category": "string",
  "source_type": "string",
  "source_id": "string",
  "importance": "integer",
  "created_at": "string (ISO datetime)",
  "metadata": "object"
}
```

### Count Memories

```
GET /api/memory/count
```

Count memory items.

**Response:**

```json
{
  "total": "integer",
  "by_category": {
    "category_name": "integer"
  }
}
```

## Document Endpoints

Endpoints for managing document processing.

### Upload Document

```
POST /api/document/upload
```

Upload a document file.

**Request Body:**

Multipart form data with a `file` field containing the document file.

**Response:**

```json
{
  "document_id": "string",
  "filename": "string",
  "file_type": "string",
  "size": "integer",
  "success": true
}
```

### Process Document

```
POST /api/document/{document_id}/process
```

Process a previously uploaded document.

**Path Parameters:**

- `document_id`: UUID of the document

**Request Body:**

```json
{
  "store_in_memory": "boolean (optional, default: true)",
  "generate_summary": "boolean (optional, default: true)",
  "processing_options": "object (optional)"
}
```

**Response:**

```json
{
  "document_id": "string",
  "status": "string",
  "message": "string"
}
```

### Get Document Status

```
GET /api/document/{document_id}/status
```

Get the processing status of a document.

**Path Parameters:**

- `document_id`: UUID of the document

**Response:**

```json
{
  "document_id": "string",
  "status": "string",
  "progress": "number",
  "message": "string",
  "started_at": "string (ISO datetime, optional)",
  "completed_at": "string (ISO datetime, optional)"
}
```

### Cancel Processing

```
POST /api/document/{document_id}/cancel
```

Cancel an ongoing document processing task.

**Path Parameters:**

- `document_id`: UUID of the document

**Response:**

```json
{
  "document_id": "string",
  "status": "string",
  "message": "string"
}
```

### Get Document

```
GET /api/document/{document_id}
```

Get information about a document.

**Path Parameters:**

- `document_id`: UUID of the document

**Response:**

```json
{
  "id": "string",
  "filename": "string",
  "file_type": "string",
  "storage_path": "string",
  "created_at": "string (ISO datetime)",
  "processed": "boolean",
  "processing_status": "string",
  "metadata": "object"
}
```

### Delete Document

```
DELETE /api/document/{document_id}
```

Delete a document and its associated files.

**Path Parameters:**

- `document_id`: UUID of the document

**Response:**

```json
{
  "success": true,
  "message": "string"
}
```

### List Documents

```
GET /api/document/list
```

List all documents with optional filtering.

**Query Parameters:**

- `file_type`: Filter by file type (optional)
- `processed`: Filter by processed status (optional)
- `limit`: Maximum number of documents to return (default: 50)
- `offset`: Number of documents to skip (default: 0)

**Response:**

```json
{
  "documents": [
    {
      "id": "string",
      "filename": "string",
      "file_type": "string",
      "created_at": "string (ISO datetime)",
      "processed": "boolean",
      "processing_status": "string",
      "metadata": "object"
    }
  ],
  "total": "integer",
  "limit": "integer",
  "offset": "integer"
}
```

### Get Document Content

```
GET /api/document/{document_id}/content
```

Get the processed content of a document.

**Path Parameters:**

- `document_id`: UUID of the document

**Response:**

```json
{
  "document_id": "string",
  "content": "string",
  "summary": "string",
  "metadata": "object",
  "memory_items": [
    {
      "id": "string",
      "content": "string",
      "category": "string",
      "created_at": "string (ISO datetime)"
    }
  ]
}
```

## Voice Endpoints

Endpoints for voice processing.

### Transcribe Audio

```
POST /api/voice/transcribe
```

Convert speech to text.

**Request Body:**

```json
{
  "audio_data": "string (base64 encoded audio)",
  "language": "string (optional)",
  "model": "string (optional)",
  "temperature": "number (optional)",
  "word_timestamps": "boolean (optional)"
}
```

**Response:**

```json
{
  "text": "string",
  "language": "string",
  "duration": "number",
  "word_timestamps": [
    {
      "word": "string",
      "start": "number",
      "end": "number"
    }
  ]
}
```

### Transcribe Audio File

```
POST /api/voice/transcribe/file
```

Convert speech to text from uploaded file.

**Request Body:**

Multipart form data with:
- `file`: Audio file
- `language`: Language code (optional)
- `model`: Model name (optional)
- `temperature`: Sampling temperature (optional)
- `word_timestamps`: Whether to include word timestamps (optional)

**Response:**

```json
{
  "text": "string",
  "language": "string",
  "duration": "number",
  "word_timestamps": [
    {
      "word": "string",
      "start": "number",
      "end": "number"
    }
  ]
}
```

### Synthesize Speech

```
POST /api/voice/synthesize
```

Convert text to speech.

**Request Body:**

```json
{
  "text": "string",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "output_format": "string (optional, default: 'mp3')",
  "speaking_rate": "number (optional)",
  "pitch": "number (optional)",
  "volume": "number (optional)"
}
```

**Response:**

```json
{
  "audio_data": "string (base64 encoded audio)",
  "duration": "number",
  "format": "string",
  "voice_id": "string"
}
```

### Synthesize Speech Stream

```
POST /api/voice/synthesize/stream
```

Stream audio data from text.

**Request Body:**

```json
{
  "text": "string",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "output_format": "string (optional, default: 'mp3')",
  "speaking_rate": "number (optional)",
  "pitch": "number (optional)",
  "volume": "number (optional)"
}
```

**Response:**

Streaming audio data with appropriate content type.

### Get Voices

```
POST /api/voice/voices
```

Get available voices.

**Request Body:**

```json
{
  "provider": "string (optional)",
  "force_refresh": "boolean (optional)"
}
```

**Response:**

```json
{
  "voices": [
    {
      "voice_id": "string",
      "name": "string",
      "provider": "string",
      "language": "string",
      "gender": "string",
      "preview_url": "string (optional)",
      "description": "string (optional)"
    }
  ]
}
```

### Get Voices (Query)

```
GET /api/voice/voices
```

Get available voices using query parameters.

**Query Parameters:**

- `provider`: Voice provider (optional)
- `force_refresh`: Force refresh of voice list (optional)

**Response:**

```json
{
  "voices": [
    {
      "voice_id": "string",
      "name": "string",
      "provider": "string",
      "language": "string",
      "gender": "string",
      "preview_url": "string (optional)",
      "description": "string (optional)"
    }
  ]
}
```

### Check Voice Availability

```
GET /api/voice/voices/{voice_id}/check
```

Check if a specific voice is available.

**Path Parameters:**

- `voice_id`: ID of the voice

**Query Parameters:**

- `provider`: Voice provider (optional)

**Response:**

```json
{
  "available": "boolean",
  "voice_id": "string",
  "provider": "string"
}
```

## Web Endpoints

Endpoints for web content extraction and processing.

### Extract Web Content

```
POST /api/web/extract
```

Extract content from a web page URL.

**Request Body:**

```json
{
  "url": "string",
  "include_images": "boolean (optional)",
  "max_content_length": "integer (optional)",
  "extraction_options": "object (optional)"
}
```

**Response:**

```json
{
  "url": "string",
  "title": "string",
  "content": "string",
  "metadata": {
    "author": "string (optional)",
    "published_date": "string (optional)",
    "site_name": "string (optional)",
    "description": "string (optional)",
    "image_url": "string (optional)"
  },
  "extracted_at": "string (ISO datetime)"
}
```

### Generate Web Summary

```
POST /api/web/summary
```

Generate a summary of web content.

**Request Body:**

```json
{
  "content": "string",
  "title": "string (optional)",
  "max_length": "integer (optional)"
}
```

**Response:**

```json
{
  "summary": "string",
  "title": "string"
}
```

### Store Web Content

```
POST /api/web/memory
```

Store web content in memory.

**Request Body:**

```json
{
  "url": "string",
  "title": "string",
  "content": "string",
  "summary": "string (optional)",
  "metadata": "object (optional)",
  "importance": "integer (optional)"
}
```

**Response:**

```json
{
  "success": "boolean",
  "memory_items": [
    {
      "id": "string",
      "content": "string",
      "category": "string"
    }
  ],
  "url": "string"
}
```

### Update Extraction Options

```
POST /api/web/options
```

Update web extraction configuration options.

**Request Body:**

```json
{
  "include_images": "boolean (optional)",
  "max_content_length": "integer (optional)",
  "extraction_depth": "integer (optional)",
  "follow_links": "boolean (optional)",
  "user_agent": "string (optional)"
}
```

**Response:**

```json
{
  "options": "object (updated options)"
}
```

### Get Extraction Status

```
GET /api/web/status
```

Get the current status of web extraction functionality.

**Response:**

```json
{
  "enabled": "boolean",
  "settings": "object"
}
```

## Search Endpoints

Endpoints for web search functionality.

### Perform Search

```
POST /api/search
```

Perform a web search.

**Request Body:**

```json
{
  "query": "string",
  "num_results": "integer (optional)",
  "provider": "string (optional)",
  "search_type": "string (optional)",
  "filters": "object (optional)"
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string",
      "source": "string",
      "published_date": "string (optional)",
      "position": "integer"
    }
  ],
  "query": "string",
  "total_results": "integer",
  "search_time": "number",
  "provider": "string"
}
```

### Summarize Search Results

```
POST /api/search/summarize
```

Summarize search results.

**Request Body:**

```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string",
      "source": "string"
    }
  ],
  "query": "string",
  "max_length": "integer (optional)"
}
```

**Response:**

```json
{
  "summary": "string",
  "query": "string"
}
```

### Store Search in Memory

```
POST /api/search/store
```

Store search results in memory.

**Request Body:**

```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string",
      "source": "string"
    }
  ],
  "query": "string",
  "summary": "string (optional)",
  "conversation_id": "string (optional)",
  "importance": "integer (optional)"
}
```

**Response:**

```json
{
  "success": "boolean",
  "memory_items": [
    {
      "id": "string",
      "content": "string",
      "category": "string"
    }
  ],
  "query": "string"
}
```

### Search and Summarize

```
POST /api/search/search-and-summarize
```

Perform search and generate summary in one operation.

**Request Body:**

```json
{
  "query": "string",
  "num_results": "integer (optional)",
  "provider": "string (optional)",
  "search_type": "string (optional)",
  "filters": "object (optional)",
  "max_summary_length": "integer (optional)"
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string",
      "source": "string",
      "published_date": "string (optional)",
      "position": "integer"
    }
  ],
  "query": "string",
  "total_results": "integer",
  "search_time": "number",
  "provider": "string",
  "summary": "string"
}
```

### Search, Store, and Summarize

```
POST /api/search/search-store-summarize
```

Perform search, store results in memory, and generate summary.

**Request Body:**

```json
{
  "query": "string",
  "num_results": "integer (optional)",
  "provider": "string (optional)",
  "search_type": "string (optional)",
  "filters": "object (optional)",
  "max_summary_length": "integer (optional)",
  "conversation_id": "string (optional)",
  "importance": "integer (optional)"
}
```

**Response:**

```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string",
      "source": "string",
      "published_date": "string (optional)",
      "position": "integer"
    }
  ],
  "query": "string",
  "total_results": "integer",
  "search_time": "number",
  "provider": "string",
  "summary": "string",
  "memory_items": [
    {
      "id": "string",
      "content": "string",
      "category": "string"
    }
  ]
}
```

### Get Provider Info

```
GET /api/search/providers
```

Get information about available search providers.

**Response:**

```json
{
  "providers": [
    {
      "name": "string",
      "description": "string",
      "features": ["string"],
      "default": "boolean",
      "requires_api_key": "boolean"
    }
  ],
  "default_provider": "string"
}
```

### Clear Search Cache

```
POST /api/search/clear-cache
```

Clear the search cache.

**Query Parameters:**

- `query`: Specific query to clear from cache (optional)
- `provider`: Specific provider to clear from cache (optional)

**Response:**

```json
{
  "success": "boolean",
  "cleared_items": "integer"
}
```

## Settings Endpoints

Endpoints for managing user settings.

### Get Settings

```
GET /api/settings
```

Retrieve all user settings.

**Response:**

```json
{
  "voice_settings": {
    "enabled": "boolean",
    "input_enabled": "boolean",
    "output_enabled": "boolean",
    "voice_id": "string",
    "provider": "string",
    "speaking_rate": "number",
    "pitch": "number",
    "volume": "number"
  },
  "personality_settings": {
    "name": "string",
    "style": "string",
    "formality": "string",
    "verbosity": "string",
    "humor": "string",
    "empathy": "string",
    "creativity": "string"
  },
  "privacy_settings": {
    "local_storage_only": "boolean",
    "analytics_enabled": "boolean",
    "error_reporting": "boolean",
    "data_retention_days": "integer",
    "allow_external_services": "boolean"
  },
  "storage_settings": {
    "base_path": "string",
    "backup_enabled": "boolean",
    "backup_frequency": "string",
    "backup_count": "integer",
    "backup_location": "string"
  },
  "llm_settings": {
    "provider": "string",
    "model": "string",
    "temperature": "number",
    "max_tokens": "integer",
    "use_local_llm": "boolean",
    "local_model_path": "string"
  },
  "search_settings": {
    "enabled": "boolean",
    "provider": "string",
    "max_results": "integer",
    "safe_search": "boolean"
  },
  "memory_settings": {
    "vector_db_path": "string",
    "max_memory_items": "integer",
    "context_window_size": "integer",
    "recency_weight": "number",
    "importance_weight": "number"
  }
}
```

### Update Settings

```
PUT /api/settings
```

Update user settings.

**Request Body:**

```json
{
  "voice_settings": "object (optional)",
  "personality_settings": "object (optional)",
  "privacy_settings": "object (optional)",
  "storage_settings": "object (optional)",
  "llm_settings": "object (optional)",
  "search_settings": "object (optional)",
  "memory_settings": "object (optional)"
}
```

**Response:**

```json
{
  "voice_settings": "object",
  "personality_settings": "object",
  "privacy_settings": "object",
  "storage_settings": "object",
  "llm_settings": "object",
  "search_settings": "object",
  "memory_settings": "object"
}
```

### Update Voice Settings

```
PUT /api/settings/voice
```

Update voice-specific settings.

**Request Body:**

```json
{
  "enabled": "boolean (optional)",
  "input_enabled": "boolean (optional)",
  "output_enabled": "boolean (optional)",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "speaking_rate": "number (optional)",
  "pitch": "number (optional)",
  "volume": "number (optional)"
}
```

**Response:**

```json
{
  "enabled": "boolean",
  "input_enabled": "boolean",
  "output_enabled": "boolean",
  "voice_id": "string",
  "provider": "string",
  "speaking_rate": "number",
  "pitch": "number",
  "volume": "number"
}
```

### Update Personality Settings

```
PUT /api/settings/personality
```

Update personality-specific settings.

**Request Body:**

```json
{
  "name": "string (optional)",
  "style": "string (optional)",
  "formality": "string (optional)",
  "verbosity": "string (optional)",
  "humor": "string (optional)",
  "empathy": "string (optional)",
  "creativity": "string (optional)"
}
```

**Response:**

```json
{
  "name": "string",
  "style": "string",
  "formality": "string",
  "verbosity": "string",
  "humor": "string",
  "empathy": "string",
  "creativity": "string"
}
```

### Update Privacy Settings

```
PUT /api/settings/privacy
```

Update privacy-specific settings.

**Request Body:**

```json
{
  "local_storage_only": "boolean (optional)",
  "analytics_enabled": "boolean (optional)",
  "error_reporting": "boolean (optional)",
  "data_retention_days": "integer (optional)",
  "allow_external_services": "boolean (optional)"
}
```

**Response:**

```json
{
  "local_storage_only": "boolean",
  "analytics_enabled": "boolean",
  "error_reporting": "boolean",
  "data_retention_days": "integer",
  "allow_external_services": "boolean"
}
```

### Update Storage Settings

```
PUT /api/settings/storage
```

Update storage-specific settings.

**Request Body:**

```json
{
  "base_path": "string (optional)",
  "backup_enabled": "boolean (optional)",
  "backup_frequency": "string (optional)",
  "backup_count": "integer (optional)",
  "backup_location": "string (optional)"
}
```

**Response:**

```json
{
  "base_path": "string",
  "backup_enabled": "boolean",
  "backup_frequency": "string",
  "backup_count": "integer",
  "backup_location": "string"
}
```

### Update LLM Settings

```
PUT /api/settings/llm
```

Update LLM-specific settings.

**Request Body:**

```json
{
  "provider": "string (optional)",
  "model": "string (optional)",
  "temperature": "number (optional)",
  "max_tokens": "integer (optional)",
  "use_local_llm": "boolean (optional)",
  "local_model_path": "string (optional)"
}
```

**Response:**

```json
{
  "provider": "string",
  "model": "string",
  "temperature": "number",
  "max_tokens": "integer",
  "use_local_llm": "boolean",
  "local_model_path": "string"
}
```

### Update Search Settings

```
PUT /api/settings/search
```

Update search-specific settings.

**Request Body:**

```json
{
  "enabled": "boolean (optional)",
  "provider": "string (optional)",
  "max_results": "integer (optional)",
  "safe_search": "boolean (optional)"
}
```

**Response:**

```json
{
  "enabled": "boolean",
  "provider": "string",
  "max_results": "integer",
  "safe_search": "boolean"
}
```

### Update Memory Settings

```
PUT /api/settings/memory
```

Update memory-specific settings.

**Request Body:**

```json
{
  "vector_db_path": "string (optional)",
  "max_memory_items": "integer (optional)",
  "context_window_size": "integer (optional)",
  "recency_weight": "number (optional)",
  "importance_weight": "number (optional)"
}
```

**Response:**

```json
{
  "vector_db_path": "string",
  "max_memory_items": "integer",
  "context_window_size": "integer",
  "recency_weight": "number",
  "importance_weight": "number"
}
```

### Reset Settings

```
POST /api/settings/reset
```

Reset settings to default values.

**Query Parameters:**

- `category`: Specific category to reset (optional)

**Response:**

```json
{
  "success": "boolean",
  "message": "string",
  "reset_categories": ["string"]
}
```

### Export Settings

```
GET /api/settings/export
```

Export settings to a file.

**Query Parameters:**

- `include_sensitive`: Whether to include sensitive information (default: false)

**Response:**

```json
{
  "success": "boolean",
  "file_path": "string",
  "message": "string"
}
```

### Import Settings

```
POST /api/settings/import
```

Import settings from a file.

**Query Parameters:**

- `file_path`: Path to the settings file
- `merge`: Whether to merge with existing settings (default: false)

**Response:**

```json
{
  "success": "boolean",
  "message": "string",
  "settings": "object"
}
```

### Get Storage Stats

```
GET /api/settings/storage/stats
```

Get storage usage statistics.

**Response:**

```json
{
  "total_size": "integer (bytes)",
  "available_space": "integer (bytes)",
  "database_size": "integer (bytes)",
  "vector_db_size": "integer (bytes)",
  "document_storage_size": "integer (bytes)",
  "backup_size": "integer (bytes)",
  "memory_count": "integer",
  "conversation_count": "integer",
  "document_count": "integer"
}
```

### Optimize Storage

```
POST /api/settings/storage/optimize
```

Optimize storage for better performance.

**Response:**

```json
{
  "success": "boolean",
  "message": "string",
  "space_saved": "integer (bytes)",
  "optimizations": ["string"]
}
```

### Create Backup

```
POST /api/settings/backup/create
```

Create a backup of all data.

**Query Parameters:**

- `backup_name`: Name for the backup (optional)
- `include_files`: Whether to include document files (default: true)
- `encrypt`: Whether to encrypt the backup (default: true)
- `upload_to_cloud`: Whether to upload to cloud storage (default: false)

**Response:**

```json
{
  "success": "boolean",
  "backup_id": "string",
  "backup_path": "string",
  "timestamp": "string (ISO datetime)",
  "size": "integer (bytes)",
  "encrypted": "boolean",
  "cloud_uploaded": "boolean"
}
```

### List Backups

```
GET /api/settings/backup/list
```

List available backups.

**Query Parameters:**

- `include_cloud`: Whether to include cloud backups (default: false)

**Response:**

```json
[
  {
    "backup_id": "string",
    "backup_name": "string",
    "timestamp": "string (ISO datetime)",
    "size": "integer (bytes)",
    "location": "string",
    "encrypted": "boolean"
  }
]
```

### Restore Backup

```
POST /api/settings/backup/restore
```

Restore data from a backup.

**Query Parameters:**

- `backup_name`: Name of the backup to restore
- `decrypt`: Whether the backup is encrypted (default: true)
- `download_from_cloud`: Whether to download from cloud storage (default: false)

**Response:**

```json
{
  "success": "boolean",
  "message": "string",
  "restored_items": {
    "conversations": "integer",
    "memories": "integer",
    "documents": "integer",
    "settings": "boolean"
  }
}
```

### Delete Backup

```
DELETE /api/settings/backup/{backup_name}
```

Delete a backup.

**Path Parameters:**

- `backup_name`: Name of the backup to delete

**Query Parameters:**

- `delete_from_cloud`: Whether to delete from cloud storage (default: false)

**Response:**

```json
{
  "success": "boolean",
  "message": "string"
}
```

## Health Check Endpoint

Endpoint for checking the health of the API server.

### Health Check

```
GET /api/health
```

Check the health of the API server and its components.

**Response:**

```json
{
  "status": "string (ok, warning, error)",
  "version": "string",
  "components": {
    "database": {
      "status": "string (ok, warning, error)",
      "message": "string"
    },
    "vector_db": {
      "status": "string (ok, warning, error)",
      "message": "string"
    },
    "storage": {
      "status": "string (ok, warning, error)",
      "message": "string"
    },
    "llm": {
      "status": "string (ok, warning, error)",
      "message": "string"
    }
  },
  "uptime": "number (seconds)"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse and ensure fair usage. Rate limits are applied on a per-endpoint basis.

When a rate limit is exceeded, the API will return a `429 Too Many Requests` status code with information about when the rate limit will reset.

Example rate limit exceeded response:

```json
{
  "detail": {
    "message": "Rate limit exceeded",
    "code": "RATE_LIMIT_EXCEEDED",
    "retry_after": 30
  }
}
```

The `retry_after` field indicates the number of seconds to wait before retrying the request.

## Versioning

The API follows semantic versioning. The current version is included in the response headers:

```
X-API-Version: 1.0.0
```

Future versions may introduce breaking changes. When this happens, the major version number will be incremented.

## Privacy Considerations

The Personal AI Agent is designed with privacy as a core principle. By default, all data is stored locally on the user's device. The API server only accepts connections from the local machine unless explicitly configured otherwise.

When external services are used (e.g., OpenAI API, ElevenLabs API), only the minimum necessary data is sent to these services. The API will clearly indicate when external services are being used and provide options to disable them.

All sensitive data is encrypted at rest using AES-256 encryption. API keys for external services are stored in a secure keychain or encrypted configuration file.