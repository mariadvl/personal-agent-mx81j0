"""
Rate limiting middleware for the Personal AI Agent API.

This module provides a token bucket algorithm implementation to limit the number
of requests a client can make within a specified timeframe, preventing abuse and
ensuring fair resource usage across all API clients.
"""

import time
from typing import Dict, Callable, Any

from fastapi import FastAPI, Request, Response

from ../../utils.logging_setup import logger
from ../../utils.event_bus import event_bus
from .error_handler import RateLimitExceededError

# Dictionary to store rate limiters for different clients
rate_limiters: Dict[str, 'TokenBucket'] = {}


class TokenBucket:
    """Implements the token bucket algorithm for rate limiting."""
    
    def __init__(self, capacity: int, refill_time: int):
        """
        Initializes the token bucket with specified capacity and refill rate.
        
        Args:
            capacity: Maximum number of tokens the bucket can hold
            refill_time: Time in seconds to refill the bucket completely
        """
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill_rate = float(capacity) / float(refill_time)  # tokens per second
        self.last_refill = time.time()
        
    def refill(self) -> None:
        """Refills the token bucket based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        
        if tokens_to_add > 0:
            self.tokens = min(self.capacity, self.tokens + tokens_to_add)
            self.last_refill = now
    
    def take(self, tokens_to_take: int = 1) -> bool:
        """
        Attempts to take a token from the bucket.
        
        Args:
            tokens_to_take: Number of tokens to take (default: 1)
            
        Returns:
            True if tokens were successfully taken, False otherwise
        """
        self.refill()
        
        if self.tokens >= tokens_to_take:
            self.tokens -= tokens_to_take
            return True
        
        return False
    
    def get_tokens_remaining(self) -> float:
        """Returns the number of tokens currently available."""
        self.refill()
        return self.tokens
    
    def get_reset_time(self) -> float:
        """Returns the time in seconds until the bucket is fully refilled."""
        self.refill()
        if self.tokens >= self.capacity:
            return 0
        
        tokens_needed = self.capacity - self.tokens
        return tokens_needed / self.refill_rate


def setup_rate_limiter(app: FastAPI, config: dict) -> FastAPI:
    """
    Configures and sets up rate limiting middleware for the FastAPI application.
    
    Args:
        app: FastAPI application instance
        config: Configuration dictionary containing rate limiting settings
        
    Returns:
        The FastAPI application with rate limiting middleware configured
    """
    # Check if rate limiting is enabled
    rate_limit_enabled = config.get("rate_limiting", {}).get("enabled", True)
    
    if not rate_limit_enabled:
        logger.info("Rate limiting disabled")
        return app
    
    # Get rate limit settings
    rate_limit_config = config.get("rate_limiting", {})
    limit = rate_limit_config.get("limit", 100)  # Default: 100 requests
    timeframe = rate_limit_config.get("timeframe", 60)  # Default: 60 seconds
    
    logger.info(f"Setting up rate limiting middleware: {limit} requests per {timeframe} seconds")
    
    # Create middleware
    rate_limit_middleware = create_rate_limit_middleware(limit, timeframe)
    
    # Add middleware to the app
    app.middleware("http")(rate_limit_middleware)
    
    return app


def create_rate_limit_middleware(limit: int, timeframe: int) -> Callable:
    """
    Creates a middleware function that implements rate limiting.
    
    Args:
        limit: Maximum number of requests allowed in the timeframe
        timeframe: Time window in seconds
        
    Returns:
        Middleware function for rate limiting
    """
    async def rate_limit_middleware(request: Request, call_next):
        # Get client identifier (IP address or API key)
        client_id = get_client_identifier(request)
        
        # Get or create token bucket for this client
        if client_id not in rate_limiters:
            logger.debug(f"Creating new rate limiter for client {client_id}")
            rate_limiters[client_id] = TokenBucket(capacity=limit, refill_time=timeframe)
        
        bucket = rate_limiters[client_id]
        
        # Check if request is allowed
        if not bucket.take(1):
            # Request exceeds rate limit
            reset_time = bucket.get_reset_time()
            remaining = bucket.get_tokens_remaining()
            
            # Log rate limit exceeded
            logger.warning(f"Rate limit exceeded for client {client_id}. " 
                          f"Limit: {limit}, Remaining: {remaining}, Reset in: {reset_time:.2f}s")
            
            # Publish event for monitoring
            event_bus.publish("rate_limit:exceeded", {
                "client_id": client_id,
                "limit": limit,
                "timeframe": timeframe,
                "reset_time": reset_time,
                "path": str(request.url.path)
            })
            
            # Raise rate limit error
            raise RateLimitExceededError(
                message="Rate limit exceeded. Please try again later.",
                details={
                    "limit": limit,
                    "timeframe": timeframe,
                    "reset_time": int(reset_time)
                }
            )
        
        # Process the request
        response = await call_next(request)
        
        # Add rate limit headers to response
        add_rate_limit_headers(response, bucket)
        
        # Debug logging for monitoring
        remaining = bucket.get_tokens_remaining()
        logger.debug(f"Request processed for {client_id}. " 
                    f"Remaining: {remaining:.2f}/{limit}")
        
        return response
    
    return rate_limit_middleware


def get_client_identifier(request: Request) -> str:
    """
    Extracts a unique identifier for the client from the request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Client identifier (IP address or API key)
    """
    # Check for API key in headers
    api_key = request.headers.get("X-API-Key")
    
    # If no API key in headers, check query parameters
    if not api_key:
        api_key = request.query_params.get("api_key")
    
    # If API key exists, use it as identifier
    if api_key:
        return f"apikey:{api_key}"
    
    # Otherwise, use client IP address
    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


def add_rate_limit_headers(response: Response, bucket: TokenBucket) -> None:
    """
    Adds rate limiting information to response headers.
    
    Args:
        response: FastAPI response object
        bucket: TokenBucket instance for the client
    """
    # Calculate remaining tokens and reset time
    remaining = int(bucket.get_tokens_remaining())
    reset_time = int(bucket.get_reset_time())
    
    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(bucket.capacity)
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_time)