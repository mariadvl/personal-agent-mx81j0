"""
Middleware initialization module that provides a unified interface for setting up all middleware 
components for the Personal AI Agent API. This module imports and exposes middleware setup 
functions from individual middleware modules, allowing for centralized configuration and 
application of middleware to the FastAPI application.
"""

from fastapi import FastAPI
from .authentication import setup_authentication_middleware, get_current_user
from .error_handler import (
    setup_error_handler, APIError, DatabaseError, 
    ExternalServiceError, ResourceNotFoundError,
    ValidationError, RateLimitExceededError
)
from .logging import setup_logging_middleware
from .rate_limiter import setup_rate_limiter
from ...utils.logging_setup import logger

def setup_middleware(app: FastAPI, config: dict) -> FastAPI:
    """
    Sets up all middleware components for the FastAPI application.
    
    Args:
        app: The FastAPI application instance
        config: Configuration dictionary with middleware settings
        
    Returns:
        The FastAPI application with all middleware configured
    """
    # Log the start of middleware setup process
    logger.info("Setting up API middleware components")
    
    # Set up error handling middleware first
    logger.debug("Configuring error handling middleware")
    app = setup_error_handler(app, config)
    
    # Set up logging middleware
    logger.debug("Configuring logging middleware")
    app = setup_logging_middleware(app, config)
    
    # Set up authentication middleware if enabled in config
    logger.debug("Configuring authentication middleware")
    app = setup_authentication_middleware(app, config)
    
    # Set up rate limiting middleware if enabled in config
    logger.debug("Configuring rate limiting middleware")
    app = setup_rate_limiter(app, config)
    
    # Log completion of middleware setup
    logger.info("All middleware components configured successfully")
    
    return app

# Explicitly define exports for better clarity
__all__ = [
    "setup_middleware",
    "setup_authentication_middleware", 
    "setup_error_handler",
    "setup_logging_middleware",
    "setup_rate_limiter",
    "get_current_user",
    "APIError",
    "DatabaseError",
    "ExternalServiceError", 
    "ResourceNotFoundError",
    "ValidationError",
    "RateLimitExceededError"
]