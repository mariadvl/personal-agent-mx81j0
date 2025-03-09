# Personal AI Agent API Documentation

## Introduction

This document provides comprehensive documentation for the Personal AI Agent's API. The API follows RESTful principles and uses JSON for data exchange. All endpoints are designed with a local-first approach, prioritizing user privacy and data ownership.

The API is organized into the following categories:
- Conversation: Managing conversations and messages with the AI agent
- Memory: Storing and retrieving information from the agent's memory system
- Document: Processing and analyzing documents
- Web: Extracting and processing web content
- Search: Performing web searches and retrieving information
- Voice: Converting between speech and text
- Settings: Managing user preferences and application configuration

## Authentication

The Personal AI Agent uses a local-first authentication approach. Since the application runs locally on the user's device, traditional authentication tokens are not required for most operations.

For endpoints that require user identification, the application uses device-level authentication mechanisms. This approach leverages the security of the underlying operating system rather than implementing a separate authentication layer.

In the API documentation, endpoints that require authentication are marked with `[Requires Auth]`.

## Base URL

When running locally, the API is accessible at:

```
http://localhost:8000/api
```

All endpoints described in this document are relative to this base URL.

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response body will contain a JSON object with the following structure:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common error status codes:
- `400 Bad Request`: Invalid request parameters or body
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

Some endpoints may return additional error details specific to their functionality.

## Conversation Endpoints

### Send Message
**POST** `/conversation`

Send a message to the AI agent and receive a response.

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
**POST** `/conversation/create`

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
**GET** `/conversation/{conversation_id}`

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
      "role": "string (user|assistant)",
      "content": "string",
      "created_at": "string (ISO datetime)"
    }
  ]
}
```

### List Conversations
**GET** `/conversation`

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
**PATCH** `/conversation/{conversation_id}`

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
**DELETE** `/conversation/{conversation_id}`

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
**GET** `/conversation/{conversation_id}/history`

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
    "role": "string (user|assistant)",
    "content": "string",
    "created_at": "string (ISO datetime)"
  }
]
```

### Summarize Conversation
**POST** `/conversation/{conversation_id}/summarize`

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

### Create Memory
**POST** `/memory`

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
**GET** `/memory/{memory_id}`

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
**PATCH** `/memory/{memory_id}`

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
**DELETE** `/memory/{memory_id}`

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
**POST** `/memory/search`

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
**POST** `/memory/context`

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

### Get Memories by Category
**GET** `/memory/category/{category}`

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

### Get Memories by Source
**GET** `/memory/source/{source_type}/{source_id}`

Retrieve memory items by source.

**Path Parameters:**
- `source_type`: Type of source (e.g., conversation, document, web)
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
**GET** `/memory/recent`

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

### Mark Memory as Important
**POST** `/memory/{memory_id}/important`

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
**GET** `/memory/count`

Count memory items.

**Response:**
```json
{
  "total": "integer",
  "by_category": {
    "conversation": "integer",
    "document": "integer",
    "web": "integer",
    "search": "integer",
    "important": "integer"
  }
}
```

## Document Endpoints

### Upload Document
**POST** `/document/upload`

Upload a document file and create a document record.

**Request Body:**
Multipart form data with a file field.

**Response:**
```json
{
  "document_id": "string",
  "filename": "string",
  "file_type": "string",
  "file_size": "integer",
  "success": true
}
```

### Process Document
**POST** `/document/{document_id}/process`

Process a previously uploaded document.

**Path Parameters:**
- `document_id`: UUID of the document

**Request Body:**
```json
{
  "store_in_memory": "boolean (optional)",
  "generate_summary": "boolean (optional)",
  "processing_options": "object (optional)"
}
```

**Response:**
```json
{
  "document_id": "string",
  "status": "string",
  "processing_started": "string (ISO datetime)"
}
```

### Get Document Status
**GET** `/document/{document_id}/status`

Get the processing status of a document.

**Path Parameters:**
- `document_id`: UUID of the document

**Response:**
```json
{
  "document_id": "string",
  "status": "string",
  "progress": "number",
  "processing_started": "string (ISO datetime)",
  "processing_completed": "string (ISO datetime, if completed)",
  "error": "string (if error occurred)"
}
```

### Cancel Processing
**POST** `/document/{document_id}/cancel`

Cancel an ongoing document processing task.

**Path Parameters:**
- `document_id`: UUID of the document

**Response:**
```json
{
  "document_id": "string",
  "status": "cancelled",
  "success": true
}
```

### Get Document
**GET** `/document/{document_id}`

Get information about a document.

**Path Parameters:**
- `document_id`: UUID of the document

**Response:**
```json
{
  "id": "string",
  "filename": "string",
  "file_type": "string",
  "file_size": "integer",
  "storage_path": "string",
  "created_at": "string (ISO datetime)",
  "processed": "boolean",
  "processing_status": "string",
  "metadata": "object"
}
```

### Delete Document
**DELETE** `/document/{document_id}`

Delete a document and its associated files.

**Path Parameters:**
- `document_id`: UUID of the document

**Response:**
```json
{
  "success": true,
  "deleted_memory_items": "integer"
}
```

### List Documents
**GET** `/document/list`

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
      "file_size": "integer",
      "created_at": "string (ISO datetime)",
      "processed": "boolean",
      "processing_status": "string"
    }
  ],
  "total": "integer",
  "limit": "integer",
  "offset": "integer"
}
```

### Get Document Content
**GET** `/document/{document_id}/content`

Get the processed content of a document.

**Path Parameters:**
- `document_id`: UUID of the document

**Response:**
```json
{
  "document_id": "string",
  "filename": "string",
  "content": [
    {
      "id": "string",
      "content": "string",
      "metadata": "object"
    }
  ],
  "summary": "string"
}
```

## Web Endpoints

### Extract Web Content
**POST** `/web/extract`

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
    "author": "string",
    "published_date": "string",
    "site_name": "string",
    "description": "string"
  },
  "images": [
    {
      "url": "string",
      "alt": "string"
    }
  ]
}
```

### Generate Web Summary
**POST** `/web/summary`

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

### Store Web Content in Memory
**POST** `/web/memory`

Store web content in memory.

**Request Body:**
```json
{
  "url": "string",
  "title": "string",
  "content": "string",
  "summary": "string (optional)",
  "metadata": "object (optional)",
  "importance": "integer (1-5, optional)"
}
```

**Response:**
```json
{
  "success": true,
  "memory_items": [
    "string (memory_id)"
  ]
}
```

### Update Extraction Options
**POST** `/web/options`

Update web extraction configuration options.

**Request Body:**
```json
{
  "readability_options": "object (optional)",
  "content_filters": "object (optional)",
  "user_agent": "string (optional)",
  "timeout": "integer (optional)"
}
```

**Response:**
```json
{
  "updated_options": "object"
}
```

### Get Extraction Status
**GET** `/web/status`

Get the current status of web extraction functionality.

**Response:**
```json
{
  "enabled": "boolean",
  "settings": {
    "readability_options": "object",
    "content_filters": "object",
    "user_agent": "string",
    "timeout": "integer"
  }
}
```

## Search Endpoints

### Perform Search
**POST** `/search`

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
**POST** `/search/summarize`

Summarize search results.

**Request Body:**
```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string"
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
**POST** `/search/store`

Store search results in memory.

**Request Body:**
```json
{
  "results": [
    {
      "title": "string",
      "link": "string",
      "snippet": "string"
    }
  ],
  "query": "string",
  "summary": "string (optional)",
  "conversation_id": "string (optional)",
  "importance": "integer (1-5, optional)"
}
```

**Response:**
```json
{
  "success": true,
  "memory_items": [
    "string (memory_id)"
  ]
}
```

### Search and Summarize
**POST** `/search/search-and-summarize`

Perform search and generate summary in one operation.

**Request Body:**
```json
{
  "query": "string",
  "num_results": "integer (optional)",
  "provider": "string (optional)",
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
  "summary": "string",
  "search_time": "number",
  "provider": "string"
}
```

### Search, Store, and Summarize
**POST** `/search/search-store-summarize`

Perform search, store results in memory, and generate summary.

**Request Body:**
```json
{
  "query": "string",
  "num_results": "integer (optional)",
  "provider": "string (optional)",
  "max_summary_length": "integer (optional)",
  "conversation_id": "string (optional)",
  "importance": "integer (1-5, optional)"
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
  "summary": "string",
  "memory_items": [
    "string (memory_id)"
  ],
  "search_time": "number",
  "provider": "string"
}
```

### Get Provider Info
**GET** `/search/providers`

Get information about available search providers.

**Response:**
```json
{
  "providers": [
    {
      "name": "string",
      "description": "string",
      "features": ["string"],
      "is_default": "boolean",
      "requires_api_key": "boolean",
      "configured": "boolean"
    }
  ],
  "default_provider": "string"
}
```

### Clear Search Cache
**POST** `/search/clear-cache`

Clear the search cache.

**Query Parameters:**
- `query`: Clear cache for specific query (optional)
- `provider`: Clear cache for specific provider (optional)

**Response:**
```json
{
  "success": true,
  "items_cleared": "integer"
}
```

## Voice Endpoints

### Transcribe Audio
**POST** `/voice/transcribe`

Convert speech to text.

**Request Body:**
```json
{
  "audio_data": "string (base64 encoded audio)",
  "audio_format": "string (optional)",
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
  "confidence": "number",
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
**POST** `/voice/transcribe/file`

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
  "confidence": "number",
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
**POST** `/voice/synthesize`

Convert text to speech.

**Request Body:**
```json
{
  "text": "string",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "speed": "number (optional)",
  "pitch": "number (optional)",
  "output_format": "string (optional)"
}
```

**Response:**
```json
{
  "audio_data": "string (base64 encoded audio)",
  "format": "string",
  "duration": "number",
  "voice_id": "string"
}
```

### Synthesize Speech Stream
**POST** `/voice/synthesize/stream`

Stream audio data from text.

**Request Body:**
```json
{
  "text": "string",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "speed": "number (optional)",
  "pitch": "number (optional)",
  "output_format": "string (optional)"
}
```

**Response:**
Streaming audio data with appropriate content type.

### Get Voices
**POST** `/voice/voices`

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
  ],
  "default_voice": "string"
}
```

### Get Voices (Query)
**GET** `/voice/voices`

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
  ],
  "default_voice": "string"
}
```

### Check Voice Availability
**GET** `/voice/voices/{voice_id}/check`

Check if a specific voice is available.

**Path Parameters:**
- `voice_id`: ID of the voice to check

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

## Settings Endpoints

### Get Settings
**GET** `/settings`

Retrieve all user settings.

**Response:**
```json
{
  "id": "string",
  "voice_settings": {
    "enabled": "boolean",
    "input_enabled": "boolean",
    "output_enabled": "boolean",
    "voice_id": "string",
    "provider": "string",
    "speed": "number",
    "pitch": "number"
  },
  "personality_settings": {
    "name": "string",
    "style": "string",
    "formality": "string",
    "verbosity": "string",
    "humor": "string",
    "empathy": "string"
  },
  "privacy_settings": {
    "local_storage_only": "boolean",
    "analytics_enabled": "boolean",
    "error_reporting": "boolean",
    "web_search_enabled": "boolean",
    "external_apis_enabled": "boolean"
  },
  "storage_settings": {
    "base_path": "string",
    "backup_enabled": "boolean",
    "backup_frequency": "string",
    "backup_count": "integer",
    "cloud_backup_enabled": "boolean",
    "cloud_provider": "string"
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
    "retention_policy": "string"
  }
}
```

### Update Settings
**PUT** `/settings`

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
  "id": "string",
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
**PUT** `/settings/voice`

Update voice-specific settings.

**Request Body:**
```json
{
  "enabled": "boolean (optional)",
  "input_enabled": "boolean (optional)",
  "output_enabled": "boolean (optional)",
  "voice_id": "string (optional)",
  "provider": "string (optional)",
  "speed": "number (optional)",
  "pitch": "number (optional)"
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
  "speed": "number",
  "pitch": "number"
}
```

### Update Personality Settings
**PUT** `/settings/personality`

Update personality-specific settings.

**Request Body:**
```json
{
  "name": "string (optional)",
  "style": "string (optional)",
  "formality": "string (optional)",
  "verbosity": "string (optional)",
  "humor": "string (optional)",
  "empathy": "string (optional)"
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
  "empathy": "string"
}
```

### Update Privacy Settings
**PUT** `/settings/privacy`

Update privacy-specific settings.

**Request Body:**
```json
{
  "local_storage_only": "boolean (optional)",
  "analytics_enabled": "boolean (optional)",
  "error_reporting": "boolean (optional)",
  "web_search_enabled": "boolean (optional)",
  "external_apis_enabled": "boolean (optional)"
}
```

**Response:**
```json
{
  "local_storage_only": "boolean",
  "analytics_enabled": "boolean",
  "error_reporting": "boolean",
  "web_search_enabled": "boolean",
  "external_apis_enabled": "boolean"
}
```

### Update Storage Settings
**PUT** `/settings/storage`

Update storage-specific settings.

**Request Body:**
```json
{
  "base_path": "string (optional)",
  "backup_enabled": "boolean (optional)",
  "backup_frequency": "string (optional)",
  "backup_count": "integer (optional)",
  "cloud_backup_enabled": "boolean (optional)",
  "cloud_provider": "string (optional)"
}
```

**Response:**
```json
{
  "base_path": "string",
  "backup_enabled": "boolean",
  "backup_frequency": "string",
  "backup_count": "integer",
  "cloud_backup_enabled": "boolean",
  "cloud_provider": "string"
}
```

### Update LLM Settings
**PUT** `/settings/llm`

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
**PUT** `/settings/search`

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
**PUT** `/settings/memory`

Update memory-specific settings.

**Request Body:**
```json
{
  "vector_db_path": "string (optional)",
  "max_memory_items": "integer (optional)",
  "context_window_size": "integer (optional)",
  "retention_policy": "string (optional)"
}
```

**Response:**
```json
{
  "vector_db_path": "string",
  "max_memory_items": "integer",
  "context_window_size": "integer",
  "retention_policy": "string"
}
```

### Reset Settings
**POST** `/settings/reset`

Reset settings to default values.

**Query Parameters:**
- `category`: Specific category to reset (optional)

**Response:**
```json
{
  "success": true,
  "reset_category": "string (or 'all')"
}
```

### Export Settings
**GET** `/settings/export`

Export settings to a file.

**Query Parameters:**
- `include_sensitive`: Whether to include sensitive information like API keys (default: false)

**Response:**
```json
{
  "success": true,
  "file_path": "string"
}
```

### Import Settings
**POST** `/settings/import`

Import settings from a file.

**Query Parameters:**
- `file_path`: Path to the settings file
- `merge`: Whether to merge with existing settings (default: false)

**Response:**
```json
{
  "id": "string",
  "voice_settings": "object",
  "personality_settings": "object",
  "privacy_settings": "object",
  "storage_settings": "object",
  "llm_settings": "object",
  "search_settings": "object",
  "memory_settings": "object"
}
```

### Get Storage Stats
**GET** `/settings/storage/stats`

Get storage usage statistics.

**Response:**
```json
{
  "total_storage": "integer (bytes)",
  "available_storage": "integer (bytes)",
  "database_size": "integer (bytes)",
  "vector_db_size": "integer (bytes)",
  "document_storage": "integer (bytes)",
  "backup_storage": "integer (bytes)",
  "memory_count": "integer",
  "document_count": "integer",
  "conversation_count": "integer"
}
```

### Optimize Storage
**POST** `/settings/storage/optimize`

Optimize storage for better performance.

**Response:**
```json
{
  "success": true,
  "optimized_components": ["string"],
  "space_saved": "integer (bytes)",
  "time_taken": "number (seconds)"
}
```

### Create Backup
**POST** `/settings/backup/create`

Create a backup of all data.

**Query Parameters:**
- `backup_name`: Name for the backup (optional)
- `include_files`: Whether to include document files (default: true)
- `encrypt`: Whether to encrypt the backup (default: true)
- `upload_to_cloud`: Whether to upload to cloud storage (default: false)

**Response:**
```json
{
  "success": true,
  "backup_id": "string",
  "backup_path": "string",
  "timestamp": "string (ISO datetime)",
  "size": "integer (bytes)",
  "encrypted": "boolean",
  "cloud_uploaded": "boolean"
}
```

### List Backups
**GET** `/settings/backup/list`

List available backups.

**Query Parameters:**
- `include_cloud`: Whether to include cloud backups (default: false)

**Response:**
```json
[
  {
    "backup_id": "string",
    "name": "string",
    "timestamp": "string (ISO datetime)",
    "size": "integer (bytes)",
    "encrypted": "boolean",
    "location": "string (local|cloud)"
  }
]
```

### Restore Backup
**POST** `/settings/backup/restore`

Restore data from a backup.

**Query Parameters:**
- `backup_name`: Name of the backup to restore
- `decrypt`: Whether the backup is encrypted (default: true)
- `download_from_cloud`: Whether to download from cloud storage (default: false)

**Response:**
```json
{
  "success": true,
  "restored_items": {
    "conversations": "integer",
    "memories": "integer",
    "documents": "integer",
    "settings": "boolean"
  },
  "timestamp": "string (ISO datetime)"
}
```

### Delete Backup
**DELETE** `/settings/backup/{backup_name}`

Delete a backup.

**Path Parameters:**
- `backup_name`: Name of the backup to delete

**Query Parameters:**
- `delete_from_cloud`: Whether to delete from cloud storage (default: false)

**Response:**
```json
{
  "success": true,
  "backup_name": "string"
}
```

## Rate Limiting

The Personal AI Agent implements rate limiting to prevent abuse and ensure system stability. Rate limits are applied to certain API endpoints, particularly those that interact with external services.

When a rate limit is exceeded, the API will return a `429 Too Many Requests` status code with a response that includes:

```json
{
  "detail": "Rate limit exceeded",
  "retry_after": 30
}
```

The `retry_after` field indicates the number of seconds to wait before retrying the request.

Rate limits are configurable and may vary by endpoint. The following endpoints have specific rate limits:

- Search endpoints: Limited to prevent excessive API usage
- Voice processing endpoints: Limited based on processing requirements
- External API integrations: Limited according to the external service's constraints

## Versioning

The API follows semantic versioning principles. The current version is included in the API base path:

```
http://localhost:8000/api/v1
```

Breaking changes will be introduced in new major versions, while backward-compatible enhancements will be added in minor versions.

Clients should specify the API version they are designed to work with to ensure compatibility as the API evolves.

## Privacy Considerations

The Personal AI Agent is designed with privacy as a core principle. All API endpoints operate with the following privacy considerations:

1. **Local-First Processing**: By default, all data processing occurs locally on the user's device.

2. **Explicit Consent**: Endpoints that use external services (like web search or cloud LLMs) require explicit user consent through privacy settings.

3. **Data Minimization**: When external services are used, only the minimum necessary data is transmitted.

4. **Transparency**: API responses include indicators when external services have been used.

5. **User Control**: Users can configure privacy settings to control which features can access external services.

Endpoints that may use external services include:
- `/search/*` - May use external search APIs
- `/web/extract` - May access external websites
- `/voice/*` - May use external speech-to-text or text-to-speech services
- `/conversation` - May use external LLM APIs depending on settings

## Webhook Support

The Personal AI Agent does not currently support webhooks due to its local-first architecture. Future versions may introduce webhook capabilities for integration with other local applications.

## Conclusion

This API documentation provides a comprehensive reference for all endpoints available in the Personal AI Agent. The API is designed to be intuitive, consistent, and privacy-focused, enabling developers to build extensions and integrations while respecting user data ownership.

For additional support or to report issues, please refer to the project repository.