import logging
import os
import sys
import time

from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn  # v0.23.0+

from .routes import conversation as conversation_router  # Assuming v1.0
from .routes import memory as memory_router  # Assuming v1.0
from .routes import document as document_router  # Assuming v1.0
from .routes import web as web_router  # Assuming v1.0
from .routes import search as search_router  # Assuming v1.0
from .routes import voice as voice_router  # Assuming v1.0
from .routes import settings as settings_router  # Assuming v1.0
from .middleware.error_handler import setup_error_handler  # Assuming v1.0
from .middleware.authentication import setup_authentication_middleware  # Assuming v1.0
from .middleware.rate_limiter import setup_rate_limiter  # Assuming v1.0
from .middleware.logging import setup_logging_middleware  # Assuming v1.0
from ..utils.logging_setup import logger  # Assuming v1.0
from ..utils.event_bus import event_bus  # Assuming v1.0

# Initialize logger
logger = logging.getLogger(__name__)


def initialize_app(config: dict) -> FastAPI:
    """
    Initializes and configures the FastAPI application with all routes and middleware

    Args:
        config: Application configuration

    Returns:
        Configured FastAPI application instance
    """
    # Create a new FastAPI application instance with title, description, and version
    app = FastAPI(
        title=config.get("general.app_name", "Personal AI Agent"),
        description="Local-first, memory-augmented AI companion",
        version=config.get("general.version", "0.1.0"),
    )

    # Set up CORS middleware with appropriate origins and settings
    configure_cors(app, config)

    # Set up GZip middleware for response compression
    configure_compression(app, config)

    # Set up logging middleware for request/response logging
    setup_logging_middleware(app, config)

    # Set up error handling middleware for consistent error responses
    setup_error_handler(app, config)

    # Set up authentication middleware if enabled in config
    setup_authentication_middleware(app, config)

    # Set up rate limiting middleware if enabled in config
    setup_rate_limiter(app, config)

    # Include all API routers (conversation, memory, document, web, search, voice, settings)
    include_routers(app)

    # Add health check endpoint for monitoring
    @app.get("/api/health")
    async def health_check():
        """Endpoint handler for health check requests"""
        return {"status": "ok"}

    # Set up event handlers for startup and shutdown
    @app.on_event("startup")
    async def startup_event():
        """Event handler that runs when the application starts"""
        startup_event_handler()

    @app.on_event("shutdown")
    async def shutdown_event():
        """Event handler that runs when the application shuts down"""
        shutdown_event_handler()

    # Log successful application initialization
    logger.info("FastAPI application initialized successfully")

    # Return the configured FastAPI application
    return app


def run_server(app: FastAPI, config: dict):
    """
    Runs the FastAPI application using Uvicorn server

    Args:
        app: FastAPI application
        config: Application configuration
    """
    # Extract server configuration (host, port, reload) from config
    host = config.get("server.host", "0.0.0.0")
    port = int(config.get("server.port", 8000))
    reload = config.get("server.reload", True)

    # Log server startup information
    logger.info(f"Starting Uvicorn server on {host}:{port} with reload={reload}")

    try:
        # Start Uvicorn server with the FastAPI application
        uvicorn.run(app, host=host, port=port, reload=reload)
    except Exception as e:
        # Handle any exceptions during server startup
        logger.error(f"Error during server startup: {str(e)}")
    finally:
        # Log server shutdown on exit
        logger.info("Uvicorn server shutting down")


def health_check():
    """Endpoint handler for health check requests"""
    # Check database connectivity
    # Check vector database status
    # Check disk space availability
    # Return health status with component statuses and version information
    return {"status": "ok"}


def startup_event_handler():
    """Event handler that runs when the application starts"""
    # Log application startup
    logger.info("Application starting up")
    # Initialize required services and connections
    # Perform any necessary database migrations
    # Subscribe to relevant events on the event bus
    # Publish application startup event
    event_bus.publish("app:startup")


def shutdown_event_handler():
    """Event handler that runs when the application shuts down"""
    # Log application shutdown
    logger.info("Application shutting down")
    # Close database connections gracefully
    # Release any acquired resources
    # Perform any necessary cleanup operations
    # Publish application shutdown event
    event_bus.publish("app:shutdown")


def configure_cors(app: FastAPI, config: dict) -> FastAPI:
    """
    Configures CORS middleware with appropriate settings

    Args:
        app: FastAPI application
        config: Application configuration

    Returns:
        FastAPI application with CORS middleware
    """
    # Extract CORS configuration from config
    cors_config = config.get("cors", {})

    # Set default values for missing configuration
    allow_origins = cors_config.get("allow_origins", ["*"])
    allow_credentials = cors_config.get("allow_credentials", True)
    allow_methods = cors_config.get("allow_methods", ["*"])
    allow_headers = cors_config.get("allow_headers", ["*"])

    # Add CORSMiddleware to the application
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
    )

    # Log CORS configuration
    logger.info(f"CORS configured with allow_origins={allow_origins}, allow_credentials={allow_credentials}, allow_methods={allow_methods}, allow_headers={allow_headers}")

    # Return the application with CORS middleware
    return app


def configure_compression(app: FastAPI, config: dict) -> FastAPI:
    """
    Configures GZip compression middleware

    Args:
        app: FastAPI application
        config: Application configuration

    Returns:
        FastAPI application with GZip middleware
    """
    # Extract compression configuration from config
    compression_config = config.get("compression", {})

    # Add GZipMiddleware to the application with appropriate settings
    app.add_middleware(
        GZipMiddleware,
        minimum_size=compression_config.get("minimum_size", 1000),
        compresslevel=compression_config.get("compresslevel", 5),
    )

    # Log compression configuration
    logger.info(f"GZip compression configured with minimum_size={compression_config.get('minimum_size', 1000)}, compresslevel={compression_config.get('compresslevel', 5)}")

    # Return the application with GZip middleware
    return app


def include_routers(app: FastAPI) -> FastAPI:
    """
    Includes all API routers in the FastAPI application

    Args:
        app: FastAPI application

    Returns:
        FastAPI application with all routers
    """
    # Include conversation router
    app.include_router(conversation_router.router)
    # Include memory router
    app.include_router(memory_router.router)
    # Include document router
    app.include_router(document_router.router)
    # Include web router
    app.include_router(web_router.router)
    # Include search router
    app.include_router(search_router.router)
    # Include voice router
    app.include_router(voice_router.router)
    # Include settings router
    app.include_router(settings_router.router)

    # Log successful router inclusion
    logger.info("All API routers included successfully")

    # Return the application with all routers
    return app