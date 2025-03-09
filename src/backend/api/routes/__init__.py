import logging
from fastapi import APIRouter

# Import route modules
from .conversation import router as conversation_router  # v0.1.0
from .memory import router as memory_router  # v0.1.0
from .document import router as document_router  # v0.1.0
from .search import router as search_router  # v0.1.0
from .settings import router as settings_router  # v0.1.0
from .voice import router as voice_router  # v0.1.0
from .web import router as web_router  # v0.1.0
from ...utils.logging_setup import logger  # v0.1.0

# Initialize logger
logger = logging.getLogger(__name__)

# Create main router
router = APIRouter(prefix="/api", tags=["api"])

def initialize_routes():
    """
    Initializes all route modules and includes them in the main router
    """
    logger.info("Initializing API routes")

    # Include route modules
    router.include_router(conversation_router)
    router.include_router(memory_router)
    router.include_router(document_router)
    router.include_router(search_router)
    router.include_router(settings_router)
    router.include_router(voice_router)
    router.include_router(web_router)

    logger.info("API routes initialized successfully")

# Export the router
__all__ = ["router", "initialize_routes"]