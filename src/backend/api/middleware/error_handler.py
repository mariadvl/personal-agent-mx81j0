import logging
import traceback
import sys
from typing import Dict, Any, Callable, Optional

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi import status

from ...utils.logging_setup import logger


class APIError(Exception):
    """Base exception class for API-related errors with structured error information."""
    
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        error_type: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the APIError with error information.
        
        Args:
            message: Human-readable error message
            status_code: HTTP status code
            error_type: Type of error (e.g., validation_error, database_error)
            details: Additional error details
        """
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_type = error_type or get_error_type_from_status(status_code)
        self.details = details or {}


class DatabaseError(APIError):
    """Exception for database-related errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=500,
            error_type="database_error",
            details=details
        )


class ExternalServiceError(APIError):
    """Exception for errors from external service integrations."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=502,
            error_type="external_service_error",
            details=details
        )


class ResourceNotFoundError(APIError):
    """Exception for resource not found errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=404,
            error_type="not_found",
            details=details
        )


class ValidationError(APIError):
    """Exception for input validation errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=422,
            error_type="validation_error",
            details=details
        )


class RateLimitExceededError(APIError):
    """Exception for rate limit exceeded errors."""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=429,
            error_type="rate_limit_exceeded",
            details=details
        )


def get_error_type_from_status(status_code: int) -> str:
    """
    Derives an error type string from an HTTP status code.
    
    Args:
        status_code: HTTP status code
        
    Returns:
        Error type string
    """
    if status_code == 400:
        return "bad_request"
    elif status_code == 401:
        return "unauthorized"
    elif status_code == 403:
        return "forbidden"
    elif status_code == 404:
        return "not_found"
    elif status_code == 422:
        return "validation_error"
    elif status_code == 429:
        return "rate_limit_exceeded"
    elif status_code == 500:
        return "server_error"
    elif status_code == 502:
        return "bad_gateway"
    elif status_code == 503:
        return "service_unavailable"
    elif status_code == 504:
        return "gateway_timeout"
    elif 400 <= status_code < 500:
        return "client_error"
    elif 500 <= status_code < 600:
        return "server_error"
    else:
        return "unknown_error"


def format_error_response(
    status_code: int,
    error_type: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Formats an error response consistently.
    
    Args:
        status_code: HTTP status code
        error_type: Type of error
        message: Human-readable error message
        details: Additional error details
        
    Returns:
        Formatted error response dictionary
    """
    response = {
        "status_code": status_code,
        "error_type": error_type,
        "message": message
    }
    
    if details:
        response["details"] = details
        
    return response


async def handle_api_error(request: Request, exc: APIError) -> JSONResponse:
    """
    Exception handler for APIError and its subclasses.
    
    Args:
        request: FastAPI request object
        exc: APIError instance
        
    Returns:
        Formatted JSON error response
    """
    # Log the error with appropriate level based on status code
    if 400 <= exc.status_code < 500:
        logger.warning(f"API Error ({exc.status_code}): {exc.message}")
    else:
        logger.error(f"API Error ({exc.status_code}): {exc.message}", exc_info=True)
    
    # Format error response
    error_response = format_error_response(
        status_code=exc.status_code,
        error_type=exc.error_type,
        message=exc.message,
        details=exc.details
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Exception handler for FastAPI HTTPException.
    
    Args:
        request: FastAPI request object
        exc: HTTPException instance
        
    Returns:
        Formatted JSON error response
    """
    # Log the error with appropriate level based on status code
    if 400 <= exc.status_code < 500:
        logger.warning(f"HTTP Exception ({exc.status_code}): {exc.detail}")
    else:
        logger.error(f"HTTP Exception ({exc.status_code}): {exc.detail}")
    
    error_type = get_error_type_from_status(exc.status_code)
    
    # Format error response
    error_response = format_error_response(
        status_code=exc.status_code,
        error_type=error_type,
        message=str(exc.detail)
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
    """
    Exception handler for unhandled exceptions.
    
    Args:
        request: FastAPI request object
        exc: Exception instance
        
    Returns:
        Formatted JSON error response
    """
    # Log the unhandled exception with traceback
    logger.error(
        f"Unhandled exception: {str(exc)}",
        exc_info=True
    )
    
    # Format error response
    error_response = format_error_response(
        status_code=500,
        error_type="server_error",
        message="An unexpected error occurred"
    )
    
    # Add more details in development mode
    app = request.app
    development_mode = getattr(app.state, "development_mode", False)
    
    if development_mode:
        error_response["details"] = {
            "exception_type": exc.__class__.__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc()
        }
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )


def create_error_middleware(error_config: Dict[str, Any]) -> Callable:
    """
    Creates a middleware function that handles exceptions and provides consistent error responses.
    
    Args:
        error_config: Configuration for error handling
        
    Returns:
        Middleware function for error handling
    """
    development_mode = error_config.get("development_mode", False)
    
    async def error_middleware(request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as exc:
            # If this is already a handled exception type, let it propagate
            if isinstance(exc, (APIError, HTTPException)):
                raise
            
            # Log the unhandled exception
            logger.error(
                f"Unhandled exception in request {request.method} {request.url.path}: {str(exc)}",
                exc_info=True
            )
            
            # Create a consistent error response
            error_response = format_error_response(
                status_code=500,
                error_type="server_error",
                message="An unexpected error occurred"
            )
            
            # Include additional details in development mode
            if development_mode:
                error_response["details"] = {
                    "exception_type": exc.__class__.__name__,
                    "exception_message": str(exc),
                    "traceback": traceback.format_exc()
                }
            
            return JSONResponse(
                status_code=500,
                content=error_response
            )
    
    return error_middleware


def setup_error_handler(app: FastAPI, config: Dict[str, Any]) -> FastAPI:
    """
    Configures and sets up error handling middleware for the FastAPI application.
    
    Args:
        app: FastAPI application
        config: Application configuration
        
    Returns:
        FastAPI application with error handling middleware configured
    """
    # Set development mode in app state for access in exception handlers
    app.state.development_mode = config.get("development_mode", False)
    
    # Register exception handlers
    app.add_exception_handler(APIError, handle_api_error)
    app.add_exception_handler(HTTPException, handle_http_exception)
    app.add_exception_handler(Exception, handle_generic_exception)
    
    # Add middleware
    error_config = config.get("error_handling", {})
    if "development_mode" not in error_config:
        error_config["development_mode"] = app.state.development_mode
    
    middleware_func = create_error_middleware(error_config)
    app.middleware("http")(middleware_func)
    
    logger.debug("Error handling middleware configured")
    
    return app