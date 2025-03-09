# Input: Personal AI Agent

## Platform Purpose

A local-first AI personal agent designed to act as a memory-augmented, customizable AI companion. The agent stores all shared information privately in a vector database on the user's device (or in a personal, encrypted storage). Users can interact via text and voice, customize the agent’s behavior and personality, and retrieve past conversations. The AI can also read files and websites, adding them to memory for context-aware responses. Additionally, it can search the web to provide real-time information.

# Platform Architecture

## Core Workflows

### User Journey

1. **Installation & Setup**

   - Local-first deployment (install on personal device)

   - Optional encrypted cloud backup

   - Quick tutorial on features and privacy settings

2. **User Customization**

   - Voice selection (text-to-speech options)

   - Personality customization (formal, casual, humorous, etc.)

   - Behavior settings (response style, proactivity level, memory depth)

3. **Memory & Context Storage**

   - Vector database on local device for storing conversations and knowledge

   - Ability to categorize and retrieve information upon request

   - Manual memory management (user can edit/delete stored memories)

4. **Interaction & Communication**

   - Text-based chat

   - Voice-based conversations (speech-to-text & text-to-speech)

   - AI remembers previous interactions for context-aware responses

5. **File & Web Reading**

   - Ability to process documents (PDFs, Word, text files)

   - Extracts key insights and stores in memory

   - Reads and summarizes web pages

6. **Web Search & Real-Time Data Retrieval**

   - Internet-enabled search for new information

   - Summarizes findings and adds to memory

   - Option to cross-check sources

7. **Privacy & Security**

   - Fully local storage with no external cloud by default

   - Optional cloud sync with encryption

   - User-controlled data deletion and transparency

## Technical Stack

### Core Technologies

- **Language**: Python (backend) + TypeScript (frontend)

- **Framework**: FastAPI (API) + NextJS (UI)

- **Database**: Local vector DB (e.g., ChromaDB, Weaviate, or Pinecone if cloud is enabled)

- **LLM**: OpenAI GPT-4o (or open-source alternatives like Llama 3 for local use)

- **Voice Processing**: OpenAI Whisper (speech-to-text) + ElevenLabs or Coqui TTS (text-to-speech)

- **Web Scraping & Search**: SerpAPI, Scrapy, or browser automation for real-time searches

### Backend Services

- **Local Storage**: SQLite or Postgres (optional cloud backup with encryption)

- **Vector Database**: ChromaDB / FAISS for memory storage

- **Authentication**: Local authentication (no external login needed)

- **File Processing**: PyMuPDF (PDFs), Pandas (CSV, Excel), BeautifulSoup (web pages)

- **API Calls**: OpenAI API (or self-hosted LLM) for responses

- **Web Search**: SerpAPI or DuckDuckGo API for internet queries

### Architecture Notes

- Local-first by default; optional encrypted cloud storage

- Lightweight, runs on personal devices (PC, mobile, or Raspberry Pi)

- Serverless with a local API server for fast response times

## User Interface

### Required Pages

1. **Home/Dashboard**

   - Recent conversations

   - Quick access to memory retrieval

   - Web search shortcut

2. **Chat Interface**

   - Text input + voice input

   - AI-generated responses

   - Memory recall and suggestions

3. **File Reader**

   - Upload and process documents

   - Extract insights and summarize content

4. **Web Reader**

   - Enter URLs to read and summarize web pages

   - Option to store or discard extracted information

5. **Settings & Customization**

   - Voice and behavior settings

   - Memory management (view/edit stored knowledge)

   - Privacy controls (delete data, manage local vs. cloud storage)

## Business Rules

### Access Control

- No external login required (fully private use)

- User-controlled memory storage (manual deletion & editing)

- Optional encrypted cloud backup (only if enabled by user)

## Implementation Priority

1. Core conversation and memory functionality

2. Local vector database integration

3. File and web reading capabilities

4. Web search and real-time data retrieval

5. Voice interaction and customization

## AI Memory Structure

### Memory Storage System

1. **Vector Database**

   - Stores embeddings of text conversations, documents, and web content

   - Enables fast recall and similarity search

2. **Retrieval Strategy**

   - When a user asks a question, relevant memories are retrieved based on context

   - AI provides responses using both stored knowledge and real-time search

3. **Data Expiry & Cleanup**

   - User can manually delete or edit stored info

   - Optional automatic memory pruning for outdated data

## Example Interaction Scenarios

1. **Personal Assistant Use Case**

   - User: "Remind me what I said about my trip last week?"

   - AI: "You mentioned visiting Tokyo and enjoying sushi at Saito’s restaurant."

2. **File Processing Use Case**

   - User uploads a PDF contract

   - AI extracts key clauses and summarizes them

3. **Web Search Use Case**

   - User: "What’s the latest on AI regulation?"

   - AI searches the web, summarizes key points, and adds them to memory

This AI agent functions as an always-available, memory-enhanced personal companion, helping users retain knowledge, access real-time data, and interact in a customizable way.