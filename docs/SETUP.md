# Setup Guide

## Introduction

This document provides comprehensive setup instructions for the Personal AI Agent, a local-first, memory-augmented AI companion. The guide covers different installation methods, from local development setup to containerized deployment, and includes platform-specific instructions for desktop and mobile environments.

## Project Overview

The Personal AI Agent is a local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices. This system prioritizes user privacy while delivering personalized support through text and voice interactions.

### Key Features

- Complete local storage of user data by default
- Memory-augmented design that recalls past conversations
- Vector database for efficient information retrieval
- Integration of file processing and web search capabilities
- Support for text and voice interaction
- Optional encrypted cloud backup

### Documentation Structure

- SETUP.md (this file): Installation and configuration instructions
- ARCHITECTURE.md: System architecture and component details
- API.md: API endpoint documentation
- CONTRIBUTING.md: Guide for contributing to the project
- PRIVACY.md: Privacy features and data handling
- DEPLOYMENT.md: Production deployment guidelines
- TESTING.md: Testing procedures and guidelines

## Prerequisites

Before setting up the Personal AI Agent, ensure you have the following prerequisites installed on your system:

### Common Requirements

- Git (for cloning the repository)
- Python 3.11 or higher
- Node.js 18 or higher
- pnpm 8.0.0 or higher (recommended over npm)
- Docker and Docker Compose (optional, for containerized setup)

### Platform-Specific Requirements

**Windows:**
- Windows 10 or higher
- Microsoft Visual C++ Redistributable
- Windows Subsystem for Linux (optional, for better Docker support)

**macOS:**
- macOS 12 (Monterey) or higher
- Xcode Command Line Tools
- Homebrew (recommended for package installation)

**Linux:**
- Ubuntu 20.04 or equivalent
- Development packages (build-essential, python3-dev, etc.)

**Mobile Development (Optional):**
- For iOS: macOS with Xcode 14+
- For Android: Android Studio with SDK tools

### External API Keys (Optional)

For full functionality, you may need API keys for the following services:

- OpenAI API key (for GPT-4o access)
- ElevenLabs API key (for high-quality voice synthesis)
- SerpAPI key (for web search capabilities)

Note: The application can run with limited functionality without these API keys by using local alternatives.

## Quick Start

For those who want to get up and running quickly, follow these steps:

### Using the Setup Script

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Run the setup script
./infrastructure/scripts/setup_local_environment.sh all

# Start the application
cd src/backend
python main.py
```

In another terminal:
```bash
cd src/web
pnpm dev
```

The application will be available at http://localhost:3000

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Start with Docker Compose
cd src/backend
docker-compose up -d

# The application will be available at http://localhost:8000
```

## Detailed Setup Instructions

This section provides detailed, step-by-step instructions for setting up the Personal AI Agent in different environments.

### Local Development Setup

Follow these steps to set up a local development environment:

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent
```

#### 2. Backend Setup

```bash
cd src/backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create configuration files
cp .env.example .env
# Edit .env with your API keys and configuration

# Initialize the database
python scripts/initialize_db.py
```

#### 3. Frontend Setup

```bash
cd src/web

# Install dependencies
pnpm install

# Create configuration files
cp .env.example .env.local
# Edit .env.local with your configuration

# Start the development server
pnpm dev
```

#### 4. Start the Backend Server

In another terminal:
```bash
cd src/backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

The backend API will be available at http://localhost:8000 and the frontend at http://localhost:3000

### Docker-Based Setup

For a containerized development environment:

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent
```

#### 2. Configure Environment

```bash
cd src/backend
cp .env.example .env
# Edit .env with your API keys and configuration
```

#### 3. Start Docker Containers

```bash
docker-compose up -d
```

This will start the following services:
- API server at http://localhost:8000
- ChromaDB vector database at http://localhost:8001

#### 4. Frontend Setup (Optional)

If you want to run the frontend separately:
```bash
cd src/web
pnpm install
cp .env.example .env.local
# Edit .env.local to point to the Docker backend
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
pnpm dev
```

### Desktop Application Setup

To build the desktop application using Electron:

#### 1. Prerequisites

Ensure you have completed either the local development setup or Docker-based setup first.

#### 2. Build the Desktop Application

```bash
cd src/web

# Install dependencies if not already done
pnpm install

# Build the Electron application
pnpm run electron:build
```

#### 3. Find the Installers

The built installers will be available in the `src/web/out` directory, with platform-specific installers:

- Windows: `.exe` installer in `out/make/squirrel.windows/x64`
- macOS: `.dmg` file in `out/make/`
- Linux: `.deb`, `.rpm`, or `.AppImage` in `out/make/`

### Mobile Application Setup

To build the mobile application using React Native:

#### 1. Prerequisites

- For iOS: macOS with Xcode 14+
- For Android: Android Studio with SDK tools
- React Native CLI: `npm install -g react-native-cli`

#### 2. Setup React Native Project

```bash
cd src/web/react-native

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration
```

#### 3. Run on Android

```bash
# Start Metro bundler
pnpm start

# In another terminal, run on Android
pnpm android
```

#### 4. Run on iOS (macOS only)

```bash
# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Start Metro bundler if not already running
pnpm start

# In another terminal, run on iOS
pnpm ios
```

#### 5. Building for Production

For Android:
```bash
cd android
./gradlew assembleRelease
```

For iOS:
```bash
cd ios
xcodebuild -workspace PersonalAIAgent.xcworkspace -scheme PersonalAIAgent -configuration Release
```

## Configuration

The Personal AI Agent can be configured through environment variables and configuration files.

### Backend Configuration

The backend is configured through the `.env` file in the `src/backend` directory. Key configuration options include:

```
# Application Settings
PERSONAL_AI_CONFIG=/path/to/config/directory
LOG_LEVEL=INFO
HOST=127.0.0.1
PORT=8000

# LLM Service Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
USE_LOCAL_LLM=false
LOCAL_MODEL_PATH=/path/to/local/model

# Voice Service Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_DEFAULT_MODEL_ID=eleven_monolingual_v1

# Search Service Configuration
SERPAPI_API_KEY=your_serpapi_key_here
SEARCH_ENGINE=google
SEARCH_COUNTRY=us
SEARCH_LANGUAGE=en

# Database Configuration
VECTOR_DB_PATH=data/vector_db
SQLITE_DB_PATH=data/sqlite.db
```

See the `.env.example` file for a complete list of configuration options.

### Frontend Configuration

The frontend is configured through the `.env.local` file in the `src/web` directory. Key configuration options include:

```
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api

# Feature Flags
NEXT_PUBLIC_ENABLE_CLOUD_FEATURES=false
NEXT_PUBLIC_DEV_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false

# Application Settings
NEXT_PUBLIC_DEFAULT_SEARCH_PROVIDER=duckduckgo
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=openai
NEXT_PUBLIC_DEFAULT_VOICE_PROVIDER=system
NEXT_PUBLIC_LOCAL_STORAGE_PATH=./data
```

See the `.env.example` file for a complete list of configuration options.

### Docker Configuration

When using Docker, the configuration is managed through environment variables in the `docker-compose.yml` file. You can override these by creating a `.env` file in the same directory as the `docker-compose.yml` file.

## Running the Application

This section describes how to run the Personal AI Agent in different environments.

### Local Development

To run the application in development mode:

1. Start the backend server:
```bash
cd src/backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

2. Start the frontend development server:
```bash
cd src/web
pnpm dev
```

3. Access the application at http://localhost:3000

### Docker Environment

To run the application using Docker:

```bash
cd src/backend
docker-compose up -d
```

Access the API at http://localhost:8000 and the frontend at http://localhost:3000 (if running separately).

### Desktop Application

After building the desktop application, you can run it by:

1. Installing the generated installer for your platform
2. Launching the application from your applications menu or desktop shortcut

Alternatively, for development:
```bash
cd src/web
pnpm run electron:dev
```

### Mobile Application

For development:

```bash
cd src/web/react-native
pnpm start
```

Then in another terminal:
```bash
pnpm android  # For Android
# OR
pnpm ios      # For iOS (macOS only)
```

For production, install the built APK (Android) or IPA (iOS) on your device.

## Troubleshooting

Common issues and their solutions:

### Backend Issues

**Issue**: `ModuleNotFoundError: No module named 'xyz'`
**Solution**: Ensure you've installed all dependencies with `pip install -r requirements.txt`

**Issue**: Database connection errors
**Solution**: Check that the database paths in your `.env` file are correct and the directories exist

**Issue**: API key errors
**Solution**: Verify that you've set the correct API keys in your `.env` file

### Frontend Issues

**Issue**: `Module not found: Can't resolve 'xyz'`
**Solution**: Ensure you've installed all dependencies with `pnpm install`

**Issue**: API connection errors
**Solution**: Verify that the backend server is running and `NEXT_PUBLIC_API_BASE_URL` is set correctly

**Issue**: Build errors
**Solution**: Check for TypeScript errors and ensure your Node.js version is compatible

### Docker Issues

**Issue**: Container fails to start
**Solution**: Check Docker logs with `docker-compose logs`

**Issue**: Volume mount issues
**Solution**: Ensure the directories specified in volume mounts exist and have appropriate permissions

**Issue**: Network connectivity issues
**Solution**: Verify that the Docker network is created correctly and containers can communicate

### Mobile Issues

**Issue**: Build fails for iOS
**Solution**: Ensure you've run `pod install` in the `ios` directory

**Issue**: Android build fails
**Solution**: Check that Android SDK is properly configured and Gradle can access the internet

**Issue**: React Native packager issues
**Solution**: Clear Metro bundler cache with `npx react-native start --reset-cache`

## Advanced Topics

Additional information for advanced users and developers.

### Using Local LLMs

The Personal AI Agent supports running with local language models for complete privacy and offline operation:

1. Download a compatible model (e.g., Llama 3 8B or 70B)
2. Set the following in your backend `.env` file:
```
USE_LOCAL_LLM=true
LOCAL_MODEL_PATH=/path/to/your/model.gguf
```
3. Set the following in your frontend `.env.local` file:
```
NEXT_PUBLIC_ENABLE_LOCAL_LLM=true
NEXT_PUBLIC_DEFAULT_LLM_PROVIDER=local
```

Note: Local LLMs require more system resources, especially RAM. The 8B model requires at least 8GB RAM, while the 70B model requires 24GB+ RAM.

### Custom Voice Configuration

To use custom voices with ElevenLabs:

1. Create a voice on the ElevenLabs platform
2. Get the voice ID from your ElevenLabs dashboard
3. Set the following in your backend `.env` file:
```
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_VOICE_ID=your_custom_voice_id
```

To use local TTS with Coqui:
1. Set the following in your frontend `.env.local` file:
```
NEXT_PUBLIC_DEFAULT_VOICE_PROVIDER=coqui
```

### Backup and Restore

To backup your data:

```bash
cd src/backend
python scripts/backup_manager.py create --output /path/to/backup/directory
```

To restore from a backup:

```bash
cd src/backend
python scripts/backup_manager.py restore --input /path/to/backup/file.zip
```

You can also configure automatic backups by setting up a cron job or scheduled task to run the backup script.

### Performance Optimization

For better performance:

1. Use a local vector database by setting appropriate paths in your `.env` file
2. Optimize the ChromaDB settings for your hardware in `config/default_config.yaml`
3. Consider using quantized models for local LLM to reduce memory usage
4. Adjust the context window size based on your available memory
5. Use SSD storage for the vector database and SQLite database

## Next Steps

After setting up the Personal AI Agent, you may want to explore the following resources:

- [Architecture Documentation](ARCHITECTURE.md) - Learn about the system architecture
- [API Documentation](API.md) - Explore the API endpoints
- [Contributing Guide](CONTRIBUTING.md) - Contribute to the project
- [Privacy Documentation](PRIVACY.md) - Understand the privacy features

For any questions or issues, please open an issue on the GitHub repository.