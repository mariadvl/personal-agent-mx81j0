# Personal AI Agent - Backend

The backend component of the Personal AI Agent - a local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices.

## Overview

This backend implements a FastAPI server that provides the core functionality for the Personal AI Agent, including:

- Conversation management with context-aware responses
- Memory storage and retrieval using vector embeddings
- Document processing for various file formats
- Web content extraction and search capabilities
- Voice processing (speech-to-text and text-to-speech)
- Local-first architecture with optional encrypted cloud backup

## Features

- **Local-First Design**: All user data is stored locally by default, ensuring privacy and data ownership
- **Memory-Augmented AI**: Leverages vector database for efficient storage and retrieval of conversation history and knowledge
- **Document Processing**: Extract, analyze, and store information from PDFs, Word documents, text files, and more
- **Web Integration**: Search capabilities and webpage reading for real-time information
- **Voice Interaction**: Support for speech-to-text and text-to-speech conversion
- **Customization**: User-defined personality, voice, and behavior settings

## Requirements

- Python 3.11+
- Poetry for dependency management
- Optional: CUDA-compatible GPU for local LLM support

## Installation

### Using Poetry (Recommended)

```bash
# Install Poetry if you don't have it already
# https://python-poetry.org/docs/#installation

# Clone the repository
git clone https://github.com/personal-ai-agent/personal-ai-agent.git
cd personal-ai-agent/src/backend

# Install dependencies
poetry install

# Activate the virtual environment
poetry shell
```

### Using pip

```bash
# Clone the repository
git clone https://github.com/personal-ai-agent/personal-ai-agent.git
cd personal-ai-agent/src/backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Configuration

The application uses a configuration system that looks for settings in the following order:

1. Command-line arguments
2. Environment variables
3. Configuration files (YAML)
4. Default values

### Configuration File

Create a `config.yaml` file in the configuration directory (default: `~/.personalai` or `%APPDATA%\PersonalAI` on Windows):

```yaml
general:
  app_name: "Personal AI Agent"
  version: "1.0.0"
  language: "en"
  
privacy:
  local_storage_only: true
  analytics_enabled: false
  error_reporting: false
  
llm:
  provider: "openai"
  model: "gpt-4o"
  temperature: 0.7
  max_tokens: 1000
  use_local_llm: false
  local_model_path: ""
  
memory:
  vector_db_path: "memory/vectors"
  max_memory_items: 10000
  context_window_size: 10
  
storage:
  base_path: "data"
  backup_enabled: false
  backup_frequency: "weekly"
  backup_count: 5
```

### Environment Variables

You can also use environment variables to configure the application. Create a `.env` file in the backend directory:

```
PERSONAL_AI_CONFIG=/path/to/config/directory
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

## Running the Application

### Development Mode

```bash
# Using Poetry
poetry run python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Or using the script
poetry run dev

# Without Poetry
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode

```bash
# Using Poetry
poetry run python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Or using the script
poetry run start

# Without Poetry
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Command-line Arguments

```bash
python main.py --config /path/to/config --log-level DEBUG --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, you can access the API documentation at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
src/backend/
├── api/                  # API routes and middleware
│   ├── middleware/       # Authentication, error handling, etc.
│   ├── routes/           # API endpoint definitions
│   └── server.py         # FastAPI server setup
├── config/               # Configuration management
├── database/             # Database models and connections
│   ├── migrations/       # Database migration scripts
│   ├── models.py         # SQLite database models
│   ├── sqlite_db.py      # SQLite database interface
│   └── vector_db.py      # Vector database interface
├── integrations/         # External service integrations
├── llm/                  # LLM-related functionality
│   ├── models/           # LLM model implementations
│   ├── context_manager.py # Context window management
│   └── prompt_templates.py # Prompt engineering templates
├── memory/               # Memory management system
├── schemas/              # Pydantic models for data validation
├── services/             # Core business logic services
├── utils/                # Utility functions and helpers
├── tests/                # Test suite
├── main.py              # Application entry point
├── pyproject.toml       # Poetry configuration
└── README.md            # This file
```

## Core Services

### Conversation Service

Manages conversations between users and the AI agent, including:
- Processing user messages
- Generating AI responses
- Maintaining conversation context
- Storing conversation history

### Memory Service

Provides a unified interface for storing, retrieving, and searching memory items:
- Vector-based semantic search
- Metadata filtering
- Context retrieval for conversations
- Memory management operations

### Document Processor

Processes various document formats to extract and store information:
- PDF, Word, text, and other formats
- Content extraction and chunking
- Document summarization
- Storage in vector database

### LLM Service

Provides language model capabilities for generating responses:
- Integration with OpenAI API
- Optional local LLM support
- Prompt engineering and context management
- Response generation and formatting

### Web Extractor

Extracts and processes content from web pages:
- URL validation and fetching
- HTML parsing and content extraction
- Content summarization
- Storage in memory system

### Search Service

Provides web search capabilities for real-time information:
- Query formulation
- Search API integration
- Result processing and ranking
- Information extraction

### Voice Processor

Handles speech-to-text and text-to-speech conversion:
- Audio capture and processing
- Speech recognition
- Voice synthesis
- Voice customization

## Development

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run tests with coverage report
poetry run pytest --cov=. --cov-report=xml

# Run specific test file
poetry run pytest tests/unit/services/test_conversation_service.py
```

### Code Quality

```bash
# Run linting
poetry run flake8 .

# Run type checking
poetry run mypy .

# Format code
poetry run black . && poetry run isort .

# Run security checks
poetry run bandit -r .
```

### Pre-commit Hooks

Set up pre-commit hooks to ensure code quality before committing:

```bash
poetry run pre-commit install
```

## Contributing

Please see the [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.