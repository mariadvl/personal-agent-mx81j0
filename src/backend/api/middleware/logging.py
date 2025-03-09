import logging
import time
import uuid
import json
from fastapi import FastAPI, Request, Response
from ...utils.logging_setup import logger
from ...config.logging import sanitize_log_message

# Paths to exclude from logging to avoid log spam
EXCLUDED_PATHS = ['/health', '/metrics', '/docs', '/redoc', '/openapi.json']

# Headers that should have their values redacted for privacy
SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'cookie']

def setup_logging_middleware(app: FastAPI, config: dict) -> FastAPI:
    """
    Configures and sets up logging middleware for the FastAPI application
    
    Args:
        app: The FastAPI application instance
        config: Configuration dictionary with logging settings
        
    Returns:
        The FastAPI application with logging middleware configured
    """
    # Extract logging configuration
    logging_config = config.get('logging', {})
    
    # Create middleware function
    middleware_func = create_logging_middleware(logging_config)
    
    # Add middleware to app
    app.middleware("http")(middleware_func)
    
    logger.info("Logging middleware configured")
    return app

def create_logging_middleware(logging_config: dict):
    """
    Creates a middleware function that logs request and response information
    
    Args:
        logging_config: Logging configuration settings
        
    Returns:
        Middleware function for request/response logging
    """
    # Extract logging settings
    log_level = logging_config.get('level', 'INFO')
    
    async def logging_middleware(request: Request, call_next):
        # Skip logging for excluded paths
        if not should_log_path(request.url.path):
            return await call_next(request)
        
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())
        
        # Log request
        logger.info(f"Request [ID:{request_id}]: {request.method} {request.url.path}")
        
        # Log headers (with sensitive information redacted)
        redacted_headers = redact_headers(dict(request.headers))
        logger.debug(f"Request headers [ID:{request_id}]: {redacted_headers}")
        
        # Try to log request body for appropriate content types
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                # Get a copy of the request body
                body = await request.body()
                if body:
                    formatted_body = format_request_body(body)
                    logger.debug(f"Request body [ID:{request_id}]: {formatted_body}")
                
                # Reset the request body for the actual request handler
                # Since we consumed the body stream, we need to make it available again
                request._body = body
            except Exception as e:
                logger.debug(f"Error reading request body [ID:{request_id}]: {str(e)}")
        
        # Process request and time it
        start_time = time.time()
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(f"Response [ID:{request_id}]: {response.status_code} ({duration:.4f}s)")
            
            # Log response headers (with sensitive information redacted)
            redacted_resp_headers = redact_headers(dict(response.headers))
            logger.debug(f"Response headers [ID:{request_id}]: {redacted_resp_headers}")
            
            return response
        except Exception as e:
            # Log exceptions
            duration = time.time() - start_time
            logger.error(f"Request failed [ID:{request_id}]: {str(e)} ({duration:.4f}s)")
            raise
    
    return logging_middleware

def should_log_path(path: str) -> bool:
    """
    Determines if a path should be logged based on exclusion rules
    
    Args:
        path: The request path
        
    Returns:
        True if the path should be logged, False otherwise
    """
    for excluded_path in EXCLUDED_PATHS:
        if path.startswith(excluded_path):
            return False
    return True

def redact_headers(headers: dict) -> dict:
    """
    Redacts sensitive information from request or response headers
    
    Args:
        headers: Headers dictionary
        
    Returns:
        Headers with sensitive information redacted
    """
    redacted = headers.copy()
    for header in SENSITIVE_HEADERS:
        if header.lower() in redacted:
            redacted[header.lower()] = "[REDACTED]"
    return redacted

def format_request_body(body: bytes) -> str:
    """
    Formats and potentially redacts request body for logging
    
    Args:
        body: Request body content
        
    Returns:
        Formatted and redacted request body
    """
    if not body:
        return ""
    
    try:
        # Try to parse as JSON
        body_str = body.decode('utf-8')
        data = json.loads(body_str)
        formatted_json = json.dumps(data, indent=2)
        
        # Sanitize the formatted JSON
        sanitized = sanitize_log_message(formatted_json)
        return sanitized
    except (UnicodeDecodeError, json.JSONDecodeError):
        # If not valid JSON, return truncated representation
        max_length = 200  # Limit to prevent huge log entries
        body_preview = str(body)[:max_length]
        return f"<binary data or non-JSON content, preview: {body_preview}...>"