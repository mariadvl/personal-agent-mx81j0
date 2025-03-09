# Personal AI Agent

A local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices.

## Overview

The Personal AI Agent is a desktop and mobile application that provides an AI companion with the following primary capabilities:

- **Conversational Interface**: Text and voice-based interaction with context-aware responses
- **Memory Management**: Local vector database storing conversation history and knowledge
- **Document Processing**: Ability to read, analyze, and extract information from various file formats
- **Web Integration**: Search capabilities and webpage reading for real-time information
- **Customization**: User-defined personality, voice, and behavior settings

The architecture follows a local-first approach with a Python backend, TypeScript frontend, and vector database for efficient information retrieval. The system leverages large language models (either cloud-based or local) for natural language understanding and generation.

## Key Features

- **Privacy-First Design**: All user data stored locally by default
- **Memory Augmentation**: AI remembers past conversations and learns from user interactions
- **Document Understanding**: Process and extract information from PDFs, Word documents, and more
- **Web Integration**: Search the web and extract information from websites
- **Voice Interaction**: Natural speech recognition and synthesis
- **Customizable Personality**: Adjust the AI's tone, style, and behavior
- **Local LLM Support**: Option to run entirely offline with local language models
- **Cross-Platform**: Available for desktop (Windows, macOS, Linux) and mobile (iOS, Android)

## Screenshots

![Chat Interface](docs/images/chat-interface.png)
![Memory Browser](docs/images/memory-browser.png)
![Document Processing](docs/images/document-processing.png)

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- pnpm 8.0.0+ (recommended over npm)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Run the setup script
./infrastructure/scripts/setup_local_environment.sh all

# Start the backend
cd src/backend
python main.py
```

In another terminal:
```bash
# Start the frontend
cd src/web
pnpm dev
```

The application will be available at http://localhost:3000

For detailed installation instructions, see the [Setup Guide](docs/SETUP.md).

## Using Docker

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Start with Docker Compose
cd src/backend
docker-compose up -d
```

The application will be available at http://localhost:8000

## Project Structure

```
├── src/
│   ├── backend/         # Python backend with FastAPI
│   │   ├── api/         # API routes and middleware
│   │   ├── database/    # Database models and connections
│   │   ├── services/    # Core business logic
│   │   ├── memory/      # Memory management system
│   │   └── ...         # Other backend components
│   ├── web/            # TypeScript frontend with Next.js
│       ├── src/        # Frontend source code
│       ├── electron/   # Electron desktop app
│       └── react-native/ # Mobile app components
├── docs/              # Documentation
├── infrastructure/    # Deployment and infrastructure
└── ...               # Other project files
```

## Technology Stack

### Backend
- **Python 3.11+**: Core language for backend development
- **FastAPI**: High-performance API framework
- **LangChain**: LLM orchestration and context management
- **ChromaDB**: Vector database for memory storage
- **PyTorch**: ML Operations

### Frontend
- **TypeScript**: Type-safe language for frontend development
- **Next.js**: React framework for web interface
- **React Native**: Cross-platform mobile development
- **TailwindCSS**: Utility-first styling
- **Zustand**: State management

### Core Libraries
- **OpenAI API**: Access to GPT-4o (optional)
- **Whisper**: Speech-to-text processing
- **ElevenLabs/Coqui**: Text-to-speech synthesis
- **PyMuPDF**: PDF Processing

For a complete list of dependencies, see the backend [requirements.txt](src/backend/requirements.txt) and frontend [package.json](src/web/package.json).

## Documentation

- [Setup Guide](docs/SETUP.md): Detailed installation instructions
- [Architecture](docs/ARCHITECTURE.md): System architecture and component details
- [API Documentation](docs/API.md): API endpoint reference
- [Contributing Guide](docs/CONTRIBUTING.md): Guidelines for contributing
- [Privacy Policy](docs/PRIVACY.md): Privacy features and data handling
- [Security](docs/SECURITY.md): Security architecture and practices
- [Performance](docs/PERFORMANCE.md): Performance considerations
- [Testing](docs/TESTING.md): Testing strategy and practices
- [Deployment](docs/DEPLOYMENT.md): Production deployment guidelines

## Contributing

We welcome contributions to the Personal AI Agent project! Please read our [Contributing Guide](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Setup

```bash
# Backend development setup
cd src/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend development setup
cd src/web
pnpm install
```

### Running Tests

```bash
# Backend tests
cd src/backend
python -m pytest

# Frontend tests
cd src/web
pnpm test
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for GPT models
- The LangChain community for LLM orchestration tools
- ChromaDB for the vector database
- All contributors who have helped shape this project