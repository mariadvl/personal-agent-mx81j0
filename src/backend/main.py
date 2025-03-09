import os
import sys
import logging
import argparse
import asyncio
import signal
from pathlib import Path

from .api.server import initialize_app, run_server
from .config.settings import Settings
from .database.sqlite_db import SQLiteDatabase
from .database.vector_db import ChromaVectorDatabase
from .services.memory_service import MemoryService
from .services.llm_service import LLMService
from .services.conversation_service import ConversationService
from .services.document_processor import DocumentProcessor
from .services.web_extractor import WebExtractor
from .services.search_service import SearchService
from .services.voice_processor import VoiceProcessor
from .utils.event_bus import EventBus
from .utils.logging_setup import setup_logging
from .schemas.settings import LLMSettings, PersonalitySettings

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Initialize event bus
event_bus = EventBus()

# Default host and port
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000


def main():
    """Main entry point for the application"""
    # Parse command-line arguments
    args = parse_args()

    # Set up logging
    setup_logging(log_level=args.log_level, log_dir=args.log_dir)

    # Initialize settings
    logger.info("Initializing application settings")

    # Initialize services
    services = initialize_services(settings)

    # Initialize API server
    logger.info("Initializing FastAPI application")
    app = initialize_app(settings.config)

    # Set up signal handlers for graceful shutdown
    loop = asyncio.get_event_loop()
    setup_signal_handlers(services, loop)

    # Run the server
    logger.info("Starting the server")
    run_server(app, settings.config)

    # Return exit code
    return 0


def parse_args():
    """Parse command-line arguments"""
    parser = argparse.ArgumentParser(description="Personal AI Agent Backend")
    parser.add_argument(
        "--host", type=str, default=DEFAULT_HOST, help="Host for the API server"
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT, help="Port for the API server"
    )
    parser.add_argument(
        "--config", type=str, help="Path to custom configuration file"
    )
    parser.add_argument(
        "--log-level", type=str, default="INFO", help="Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)"
    )
    parser.add_argument(
        "--log-dir", type=str, help="Path to log directory"
    )
    parser.add_argument(
        "--debug", action="store_true", help="Enable debug mode"
    )
    return parser.parse_args()


def initialize_services(Settings):
    """Initialize all required services with proper dependencies"""
    logger.info("Initializing services")

    # Initialize SQLiteDatabase
    sqlite_db = SQLiteDatabase()

    # Initialize ChromaVectorDatabase
    vector_db = ChromaVectorDatabase()

    # Initialize MemoryService with databases
    memory_service = MemoryService(vector_db, sqlite_db)

    # Get LLM and personality settings from config
    llm_settings = LLMSettings()
    personality_settings = PersonalitySettings()

    # Initialize LLMService with settings
    llm_service = LLMService(llm_settings, personality_settings)

    # Initialize ConversationService with dependencies
    conversation_service = ConversationService(memory_service, llm_service, event_bus)

    # Initialize DocumentProcessor with dependencies
    document_processor = DocumentProcessor(memory_service, llm_service)

    # Initialize WebExtractor with dependencies
    web_extractor = WebExtractor(memory_service, llm_service)

    # Initialize SearchService with dependencies
    search_service = SearchService(llm_service, memory_service, web_extractor)

    # Initialize VoiceProcessor with settings
    voice_processor = VoiceProcessor(settings, event_bus)

    logger.info("All services initialized successfully")

    return {
        "sqlite_db": sqlite_db,
        "vector_db": vector_db,
        "memory_service": memory_service,
        "llm_service": llm_service,
        "conversation_service": conversation_service,
        "document_processor": document_processor,
        "web_extractor": web_extractor,
        "search_service": search_service,
        "voice_processor": voice_processor,
    }


def setup_signal_handlers(services, loop):
    """Set up signal handlers for graceful shutdown"""
    def shutdown_handler(sig):
        logger.info(f"Received signal {sig}, shutting down...")
        asyncio.create_task(cleanup_services(services))
        loop.stop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, shutdown_handler, sig)


async def cleanup_services(services):
    """Clean up services during shutdown"""
    logger.info("Cleaning up services...")

    # Close SQLiteDatabase connection
    try:
        await services["sqlite_db"].close()
        logger.info("SQLiteDatabase connection closed")
    except Exception as e:
        logger.error(f"Error closing SQLiteDatabase connection: {e}")

    # Close ChromaVectorDatabase connection
    try:
        await services["vector_db"].close()
        logger.info("ChromaVectorDatabase connection closed")
    except Exception as e:
        logger.error(f"Error closing ChromaVectorDatabase connection: {e}")

    # Publish application:shutdown event
    event_bus.publish("application:shutdown")

    logger.info("Services cleanup completed")


if __name__ == "__main__":
    sys.exit(main())