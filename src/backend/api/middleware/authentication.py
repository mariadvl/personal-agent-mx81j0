import logging
import time
import uuid
from fastapi import FastAPI, Request, Response, Depends, HTTPException, status
from fastapi.security import SecurityScopes
from ...utils.logging_setup import logger
from ...config.settings import Settings
from .error_handler import APIError

# Global dictionary to track active sessions
active_sessions = {}

class AuthenticationError(APIError):
    """Custom exception for authentication-related errors"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=401,
            error_type="authentication_error",
            details=details
        )

class AuthorizationError(APIError):
    """Custom exception for authorization-related errors"""
    
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=403,
            error_type="authorization_error",
            details=details
        )

def setup_authentication_middleware(app: FastAPI, config: dict) -> FastAPI:
    """
    Configures and sets up authentication middleware for the FastAPI application.
    
    Args:
        app: FastAPI application
        config: Application configuration
        
    Returns:
        FastAPI application with authentication middleware configured
    """
    # Check if authentication is enabled
    if not config.get("authentication", {}).get("enabled", True):
        logger.info("Authentication disabled by configuration")
        return app
    
    # Configure authentication middleware
    auth_config = config.get("authentication", {})
    middleware_func = create_auth_middleware(auth_config)
    app.middleware("http")(middleware_func)
    
    # Log setup
    logger.info(f"Authentication middleware configured with method: {auth_config.get('method', 'device')}")
    
    return app

def create_auth_middleware(auth_config: dict):
    """
    Creates a middleware function that handles authentication.
    
    Args:
        auth_config: Authentication configuration
        
    Returns:
        Middleware function for authentication
    """
    auth_method = auth_config.get("method", "device")
    session_timeout = auth_config.get("session_timeout", 30 * 60)  # 30 minutes default
    
    async def authentication_middleware(request: Request, call_next):
        # Skip authentication for public routes
        if not is_protected_route(request.url.path, request.method):
            return await call_next(request)
        
        # Get session token from request
        session_token = request.headers.get("X-Session-Token") or request.cookies.get("session_token")
        
        # Validate session
        if session_token:
            session = validate_session(session_token)
            if session:
                # Session is valid, update last activity
                active_sessions[session_token]["last_activity"] = time.time()
                
                # Continue request processing
                response = await call_next(request)
                return response
        
        # Check if this is an authentication request
        if request.url.path.endswith("/auth/login") and request.method == "POST":
            return await call_next(request)
        
        # Authentication failed, return 401 Unauthorized
        return Response(
            content='{"detail":"Not authenticated"}',
            status_code=status.HTTP_401_UNAUTHORIZED,
            media_type="application/json",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return authentication_middleware

async def get_current_user(request: Request, security_scopes: SecurityScopes = None):
    """
    Dependency function to get the current authenticated user.
    
    Args:
        request: FastAPI request
        security_scopes: Optional security scopes for authorization
        
    Returns:
        User information if authenticated
        
    Raises:
        HTTPException: If not authenticated or not authorized
    """
    # Get session token from request
    session_token = request.headers.get("X-Session-Token") or request.cookies.get("session_token")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if session exists
    if session_token not in active_sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    session = active_sessions[session_token]
    
    # Check if session has required scopes
    if security_scopes and security_scopes.scopes:
        user_scopes = set(session.get("scopes", []))
        required_scopes = set(security_scopes.scopes)
        
        if not required_scopes.issubset(user_scopes):
            missing_scopes = required_scopes - user_scopes
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Not authorized. Missing scopes: {', '.join(missing_scopes)}",
                headers={"WWW-Authenticate": f"Bearer scope=\"{' '.join(security_scopes.scopes)}\""}
            )
    
    # Check session timeout
    settings = Settings()
    timeout = settings.get("authentication.session_timeout", 30 * 60)  # 30 minutes default
    if time.time() - session["last_activity"] > timeout:
        # Session expired
        del active_sessions[session_token]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Update last activity
    session["last_activity"] = time.time()
    
    # Return user information
    return session["user"]

def create_session(user_info: dict, scopes: list = None) -> str:
    """
    Creates a new authenticated session.
    
    Args:
        user_info: User information to store in the session
        scopes: List of security scopes for the session
        
    Returns:
        Session token
    """
    # Generate session token
    session_token = str(uuid.uuid4())
    
    # Create session object
    session = {
        "user": user_info,
        "scopes": scopes or ["user"],
        "created_at": time.time(),
        "last_activity": time.time()
    }
    
    # Store session
    active_sessions[session_token] = session
    
    # Log session creation (without sensitive data)
    user_id = user_info.get("id", "unknown")
    logger.info(f"Session created for user ID: {user_id}")
    logger.debug(f"Session scopes: {scopes or ['user']}")
    
    return session_token

def validate_session(session_token: str) -> dict:
    """
    Validates an existing session.
    
    Args:
        session_token: The session token to validate
        
    Returns:
        Session information if valid, None otherwise
    """
    if session_token not in active_sessions:
        return None
        
    session = active_sessions[session_token]
    
    # Check session expiration
    settings = Settings()
    timeout = settings.get("authentication.session_timeout", 30 * 60)  # 30 minutes default
    
    if time.time() - session["last_activity"] > timeout:
        # Session expired
        del active_sessions[session_token]
        return None
    
    # Update last activity time
    session["last_activity"] = time.time()
    
    # Session is valid
    return session

def end_session(session_token: str) -> bool:
    """
    Ends an active session.
    
    Args:
        session_token: The session token to end
        
    Returns:
        True if session was ended, False if not found
    """
    if session_token in active_sessions:
        # Get user ID for logging
        user_id = active_sessions[session_token]["user"].get("id", "unknown")
        
        # Remove session
        del active_sessions[session_token]
        
        # Log session termination
        logger.info(f"Session ended for user ID: {user_id}")
        
        return True
    
    return False

def cleanup_expired_sessions() -> int:
    """
    Removes expired sessions from active_sessions.
    
    Returns:
        Number of sessions removed
    """
    settings = Settings()
    timeout = settings.get("authentication.session_timeout", 30 * 60)  # 30 minutes default
    
    current_time = time.time()
    expired_tokens = [
        token for token, session in active_sessions.items()
        if current_time - session["last_activity"] > timeout
    ]
    
    # Remove expired sessions
    for token in expired_tokens:
        del active_sessions[token]
    
    # Log cleanup
    if expired_tokens:
        logger.info(f"Cleaned up {len(expired_tokens)} expired sessions")
    
    return len(expired_tokens)

def is_protected_route(path: str, method: str) -> bool:
    """
    Determines if a route requires authentication.
    
    Args:
        path: The request path
        method: The HTTP method
        
    Returns:
        True if route requires authentication, False otherwise
    """
    # Public routes that don't require authentication
    public_routes = [
        "/docs",
        "/redoc",
        "/openapi.json",
        "/api/auth/login",
        "/api/auth/register",
        "/api/health",
        "/api/version"
    ]
    
    # Check if path matches any public route exactly
    if path in public_routes:
        return False
    
    # Public path prefixes
    public_prefixes = [
        "/public/",
        "/static/",
        "/api/auth/",
        "/favicon.ico"
    ]
    
    # Check if path starts with any public prefix
    for prefix in public_prefixes:
        if path.startswith(prefix):
            return False
    
    # Special cases
    if path == "/" and method == "GET":
        return False
    
    # By default, all other routes are protected
    return True