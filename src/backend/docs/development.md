# Development Guide

## Introduction

Overview of the development process and philosophy for the Personal AI Agent backend, emphasizing the local-first, privacy-focused approach

## Project Overview

High-level overview of the Personal AI Agent, its purpose, and key features, including the local-first architecture and privacy-focused design.

The Personal AI Agent is a local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices. This system addresses the growing need for AI assistants that prioritize user privacy while delivering personalized support through text and voice interactions.

For a detailed understanding of the system architecture, refer to the [Architecture Documentation](./architecture.md).

## Development Environment Setup

Detailed instructions for setting up the development environment, including prerequisites, installation steps, and configuration

### Prerequisites

- Python 3.11 or higher
- Poetry 1.6.0 or higher
- Git
- Docker and Docker Compose (optional, for containerized development)
- OpenAI API key (optional, for cloud LLM)
- ElevenLabs API key (optional, for cloud TTS)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent/src/backend

# Install dependencies using Poetry
poetry install

# Activate the virtual environment
poetry shell
```

### Configuration

The application uses environment variables and configuration files for settings. Create a `.env` file in the `backend/` directory based on the `.env.example` file.

**Table: Environment Variables**

| Environment Variable | Description | Default |
|------------------------|-------------|--------|
| `OPENAI_API_KEY` | OpenAI API key | None |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | None |
| `CONFIG_DIR` | Configuration directory | `~/.personalai` |
| `DATA_DIR` | Data directory | `data` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `PORT` | API server port | `8000` |
| `HOST` | API server host | `localhost` |

## Local Development

Instructions for running the application locally for development purposes

### Running the Application

```bash
# Run the application in development mode
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Hot Reloading

For faster development, use the `--reload` flag with Uvicorn to enable hot reloading. This will automatically restart the server when code changes are detected.

```bash
# Run the application using Poetry scripts
poetry run dev
```

## Docker Development Environment

Instructions for using Docker and Docker Compose for development

### Docker Setup

Ensure you have Docker and Docker Compose installed on your system.

### Using Docker Compose

```bash
# Start the Docker development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the environment
docker-compose down
```

This will start the application and its dependencies (e.g., ChromaDB) in separate containers.

**Table: Docker Services**

| Service | URL | Description |
|---------|-----|-------------|
| API Server | http://localhost:8000 | FastAPI backend server |
| ChromaDB | http://localhost:8001 | Vector database |
| Mock OpenAI | http://localhost:8002 | Mock OpenAI API for testing |
| Mock ElevenLabs | http://localhost:8003 | Mock ElevenLabs API for testing |
| Mock SerpAPI | http://localhost:8004 | Mock SerpAPI for testing |

### Accessing Services

Once the Docker environment is running, you can access the application and its dependencies through the specified URLs.

## Project Structure

Explanation of the project's directory structure and organization

### Directory Organization

```
backend/
├── api/
│   ├── __init__.py
│   ├── server.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── conversation.py
│   │   ├── memory.py
│   │   ├── document.py
│   │   └── ...
│   └── middleware/
│       ├── __init__.py
│       ├── error_handler.py
│       └── ...
├── services/
│   ├── __init__.py
│   ├── conversation_service.py
│   ├── memory_service.py
│   ├── document_processor.py
│   └── ...
├── database/
│   ├── __init__.py
│   ├── vector_db.py
│   ├── sqlite_db.py
│   └── ...
├── utils/
│   ├── __init__.py
│   ├── embeddings.py
│   ├── text_processing.py
│   └── ...
├── config/
│   ├── __init__.py
│   ├── settings.py
│   └── ...
└── main.py
```

### Key Components

- `api/`: FastAPI application and routes
- `config/`: Configuration management
- `database/`: Database models and connections
- `docs/`: Documentation files
- `integrations/`: External API clients
- `llm/`: Language model integration
- `memory/`: Memory storage and retrieval
- `schemas/`: Pydantic models for data validation
- `services/`: Core business logic
- `tests/`: Test suite
- `utils/`: Utility functions and helpers

## Coding Standards

Coding conventions, style guidelines, and best practices for the project

### Python Style Guide

Follow the [Python Style Guide (PEP 8)](https://peps.python.org/pep-0008/) for code formatting and style.

### Type Hints

Use type hints for function parameters and return values to improve code readability and maintainability.

```python
# Example of a well-documented function with type hints
from typing import List, Dict, Optional

def process_document(file_path: str, metadata: Optional[Dict[str, any]] = None) -> List[Dict[str, any]]:
    """
    Process a document and extract its content as memory items.
    
    Args:
        file_path: Path to the document file
        metadata: Optional metadata to associate with the document
        
    Returns:
        List of memory items extracted from the document
        
    Raises:
        FileNotFoundError: If the document file does not exist
        UnsupportedFileTypeError: If the file type is not supported
    """
    # Implementation
    pass
```

### Documentation Standards

Write docstrings for all public functions, classes, and modules to provide clear and concise documentation.

### Pre-commit Hooks

Use pre-commit hooks to automatically run code formatting and linting checks before committing changes.

```yaml
# Example .pre-commit-config.yaml
repos:
-   repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
    -   id: trailing-whitespace
    -   id: end-of-file-fixer
    -   id: check-yaml
    -   id: check-added-large-files

-   repo: https://github.com/psf/black
    rev: 23.9.0
    hooks:
    -   id: black
        args: [--line-length=100]

-   repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
    -   id: isort
        args: [--profile=black, --line-length=100]

-   repo: https://github.com/pycqa/flake8
    rev: 6.1.0
    hooks:
    -   id: flake8
        additional_dependencies: [flake8-docstrings]
```

## Testing

Comprehensive guide to writing and running tests, including unit tests, integration tests, and end-to-end tests

### Unit Testing

Write unit tests for individual components to ensure they function correctly in isolation.

### Integration Testing

Write integration tests to verify the interactions between different components and services.

### End-to-End Testing

Write end-to-end tests to simulate user workflows and ensure the application functions correctly from start to finish.

### Test Coverage

Aim for high test coverage to ensure that most of the codebase is tested.

### Mocking External Services

Use mocking to isolate components during testing and avoid dependencies on external services.

```python
# Example test case
import pytest
from unittest.mock import MagicMock

def test_conversation_service_processes_message(mock_llm_service, memory_service):
    # Arrange
    conversation_service = ConversationService(memory_service, mock_llm_service)
    mock_llm_service.generate_response.return_value = "Test response"
    
    # Act
    result = conversation_service.process_message("Test message")
    
    # Assert
    assert result["response"] == "Test response"
    mock_llm_service.generate_response.assert_called_once()
    # More assertions...
```

**Table: Testing Commands**

| Test Type | Command | Purpose |
|-----------|---------|----------|
| Unit Tests | `pytest tests/unit/` | Test individual components in isolation |
| Integration Tests | `pytest tests/integration/` | Test component interactions |
| API Tests | `pytest tests/api/` | Test API endpoints |
| Performance Tests | `pytest tests/benchmarks/` | Measure performance metrics |

## Debugging

Techniques and tools for debugging the application

### Logging

Use logging to record events, errors, and warnings during application execution.

### Debugging Tools

Use debugging tools like `pdb` (Python Debugger) or IDE-integrated debuggers to step through code and inspect variables.

### Common Issues

Refer to the troubleshooting section for solutions to common issues.

## Performance Optimization

Guidelines for optimizing performance, including profiling and benchmarking

### Profiling

Use profiling tools to identify performance bottlenecks in the code.

### Benchmarking

Use benchmarking tools to measure the performance of critical operations.

```bash
# Run benchmarks
pytest tests/benchmarks/ --benchmark-only

# Compare benchmarks against previous run
pytest tests/benchmarks/ --benchmark-compare
```

### Optimization Techniques

- Caching frequently accessed data
- Asynchronous processing for non-blocking operations
- Efficient database queries
- Optimized vector search algorithms

## Contribution Workflow

Process for contributing to the project, including branching strategy, pull requests, and code reviews

### Branching Strategy

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Requests

Submit pull requests with clear descriptions of the changes and their purpose.

### Code Reviews

Participate in code reviews to ensure code quality and maintainability.

### Continuous Integration

The project uses continuous integration to automatically run tests and checks on each pull request.

## Documentation

Guidelines for writing and maintaining documentation

### Code Documentation

Write docstrings for all public functions, classes, and modules.

### API Documentation

Keep the [API Documentation](./api.md) up-to-date with any changes to the API.

### User Documentation

Provide clear and concise user documentation for the application.

## Troubleshooting

Common issues and their solutions

### Common Issues

- Installation problems
- Configuration errors
- Performance bottlenecks
- API key issues

### Getting Help

Refer to the project's README for common troubleshooting steps and contact information.