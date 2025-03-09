"""
Initialization file for the API module that exports key components and functions for the FastAPI application. 
This file serves as the entry point for the API layer of the Personal AI Agent, providing access to the server creation, initialization, and execution functions.
"""

from .server import create_app, initialize_app, get_app, run_server

__version__ = "1.0.0"

__all__ = [
    "create_app",
    "initialize_app",
    "get_app",
    "run_server",
    "__version__"
]