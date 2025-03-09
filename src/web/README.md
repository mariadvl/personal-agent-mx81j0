# Personal AI Agent - Web Frontend

The web frontend component of the Personal AI Agent - a local-first, memory-augmented AI companion designed to provide users with a private, customizable assistant that stores all information directly on their devices.

## Overview

This web frontend implements a Next.js application that provides the user interface for the Personal AI Agent, including:

- Conversational interface with text and voice interaction
- Memory management and browsing capabilities
- Document upload and processing interface
- Web content extraction and search functionality
- Settings management for customization
- Dashboard with overview of key features

## Features

- **Privacy-First Design**: Clear indicators for local vs. cloud data storage
- **Responsive Interface**: Adapts to different screen sizes from mobile to desktop
- **Accessibility**: Support for keyboard navigation, screen readers, and voice interaction
- **Dark/Light Themes**: User-selectable appearance preferences
- **Electron Integration**: Desktop application packaging for cross-platform support
- **React Native Support**: Mobile application interface sharing core components

## Requirements

- Node.js 18+
- pnpm (recommended) or npm
- Backend API running (see [backend README](../backend/README.md))

## Installation

### Using pnpm (Recommended)

```bash
# Install pnpm if you don't have it already
# https://pnpm.io/installation

# Clone the repository
git clone https://github.com/personal-ai-agent/personal-ai-agent.git
cd personal-ai-agent/src/web

# Install dependencies
pnpm install
```

### Using npm

```bash
# Clone the repository
git clone https://github.com/personal-ai-agent/personal-ai-agent.git
cd personal-ai-agent/src/web

# Install dependencies
npm install
```

## Configuration

Create a `.env.local` file in the web directory with the following variables:

```
# API URL (default is localhost:8000 if not specified)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Analytics (disabled by default)
NEXT_PUBLIC_ANALYTICS_ENABLED=false

# Optional: Default theme (light or dark)
NEXT_PUBLIC_DEFAULT_THEME=light
```

## Running the Application

### Development Mode

```bash
# Using pnpm
pnpm dev

# Using npm
npm run dev
```

The application will be available at http://localhost:3000

### Production Build

```bash
# Using pnpm
pnpm build
pnpm start

# Using npm
npm run build
npm start
```

### Electron Desktop App

```bash
# Development mode
pnpm electron:dev

# Build desktop application
pnpm electron:build
```

## Project Structure

```
src/web/
├── src/
│   ├── app/                 # Next.js app directory (pages and layouts)
│   ├── components/          # React components
│   │   ├── chat/            # Chat interface components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── files/           # Document handling components
│   │   ├── layout/          # Layout components (header, footer, etc.)
│   │   ├── memory/          # Memory management components
│   │   ├── search/          # Search interface components
│   │   ├── settings/        # Settings panel components
│   │   ├── ui/              # Reusable UI components
│   │   └── web/             # Web content components
│   ├── constants/           # Application constants
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API and service integrations
│   ├── store/               # Zustand state management
│   ├── themes/              # Theme definitions
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions
├── public/                  # Static assets
├── electron/                # Electron app configuration
├── react-native/            # React Native app (shared components)
├── __tests__/               # Jest tests
├── cypress/                 # Cypress E2E tests
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # TailwindCSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Project dependencies and scripts
```

## Core Components

### Chat Interface

The main conversational interface that allows users to interact with the AI agent through text and voice.

- `ChatInterface`: Main container for the chat experience
- `MessageList`: Displays conversation history
- `MessageInput`: Text input with voice control
- `VoiceControl`: Voice input and output management

### Memory Browser

Interface for browsing, searching, and managing stored memories.

- `MemoryBrowser`: Main container for memory management
- `MemorySearch`: Search interface for finding memories
- `MemoryItem`: Individual memory item display
- `MemoryDetail`: Detailed view of a memory item

### Document Processing

Components for uploading, viewing, and processing documents.

- `DocumentUploader`: File upload interface
- `DocumentViewer`: Document display and interaction
- `DocumentSummary`: Summary view of processed documents
- `FileProcessingStatus`: Status indicators for document processing

### Dashboard

The main homepage that provides an overview of the application's features.

- `Dashboard`: Main container for the dashboard
- `RecentConversations`: List of recent conversations
- `QuickActions`: Shortcut buttons for common actions
- `MemoryHighlights`: Important memory items
- `SystemStatus`: System health and resource usage

### Settings

Interface for customizing the application.

- `SettingsPanel`: Main container for settings
- `VoiceSettings`: Voice customization options
- `PersonalitySettings`: AI personality configuration
- `PrivacySettings`: Privacy and data storage options
- `ApiSettings`: External API configuration

## State Management

The application uses Zustand for state management with the following stores:

- `conversationStore`: Manages chat conversations and messages
- `memoryStore`: Handles memory items and search
- `settingsStore`: Manages user preferences and settings
- `documentStore`: Tracks document uploads and processing
- `uiStore`: Manages UI state like alerts and modals

## API Integration

The frontend communicates with the backend API using Axios. The main API services include:

- `conversationService`: Handles chat interactions
- `memoryService`: Manages memory storage and retrieval
- `documentService`: Handles document processing
- `webService`: Manages web content extraction
- `searchService`: Provides search functionality
- `voiceService`: Handles speech-to-text and text-to-speech
- `settingsService`: Manages user settings

## Testing

### Unit and Component Tests

```bash
# Run all tests
pnpm test

# Run tests with watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### End-to-End Tests

```bash
# Open Cypress test runner
pnpm cypress

# Run Cypress tests headlessly
pnpm cypress:headless

# Run E2E tests with dev server
pnpm e2e

# Run E2E tests headlessly with dev server
pnpm e2e:headless
```

## Code Quality

```bash
# Run linting
pnpm lint

# Format code with Prettier
pnpm format
```

## Building for Production

### Web Application

```bash
pnpm build
```

### Desktop Application

```bash
pnpm electron:build
```

Built packages will be available in the `electron/out` directory.

### Mobile Application

See the React Native directory for mobile build instructions.

## Contributing

Please see the [CONTRIBUTING.md](../../docs/CONTRIBUTING.md) file for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.