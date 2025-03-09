"""
Implements API routes for web content extraction, processing, and storage in the Personal AI Agent.
This module provides endpoints for extracting content from web pages, generating summaries, and
storing web content in the agent's memory system.
"""

import logging
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response

from ...services.web_extractor import WebExtractor  # Assuming v1.0
from ...services.memory_service import MemoryService  # Assuming v1.0
from ...services.llm_service import LLMService  # Assuming v1.0
from ...schemas.web import WebExtractionRequest, WebExtractionResponse, \
    WebMemoryRequest, WebMemoryResponse, WebSummaryRequest, WebSummaryResponse  # Assuming v1.0
from ...config.settings import Settings  # Assuming v1.0
from ...utils.logging_setup import logger  # Assuming v1.0
from ...utils.event_bus import event_bus  # Assuming v1.0

# FastAPI router for web-related endpoints
router = APIRouter(prefix='/api/web', tags=['Web'])

# Application settings instance
settings = Settings()

# Flag indicating if web extraction is enabled
WEB_EXTRACTION_ENABLED = settings.get('web.extraction_enabled', True)


async def get_web_extractor(memory_service: MemoryService = Depends(),
                            llm_service: LLMService = Depends()) -> WebExtractor:
    """
    Dependency function to get the WebExtractor instance
    """
    return WebExtractor(memory_service, llm_service)


@router.post('/extract', response_model=WebExtractionResponse)
async def extract_web_content(request: WebExtractionRequest,
                              web_extractor: WebExtractor = Depends(get_web_extractor),
                              http_request: Request = None) -> WebExtractionResponse:
    """
    Extract content from a web page URL
    """
    if not WEB_EXTRACTION_ENABLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Web extraction is disabled")

    logger.info(f"Extracting web content from URL: {request.url}")
    event_bus.publish("web:extraction:requested", {"url": request.url})

    try:
        extraction_response = await web_extractor.extract_from_url(request)
        return extraction_response
    except Exception as e:
        logger.error(f"Error extracting web content: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post('/summary', response_model=WebSummaryResponse)
async def generate_web_summary(request: WebSummaryRequest,
                               web_extractor: WebExtractor = Depends(get_web_extractor)) -> WebSummaryResponse:
    """
    Generate a summary of web content
    """
    if not WEB_EXTRACTION_ENABLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Web extraction is disabled")

    logger.info(f"Generating summary for web content: {request.title}")
    try:
        summary = await web_extractor.generate_summary(request.content, request.title, request.max_length)
        return WebSummaryResponse(summary=summary, success=True)
    except Exception as e:
        logger.error(f"Error generating web summary: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post('/memory', response_model=WebMemoryResponse)
async def store_web_content(request: WebMemoryRequest,
                             web_extractor: WebExtractor = Depends(get_web_extractor)) -> WebMemoryResponse:
    """
    Store web content in memory
    """
    if not WEB_EXTRACTION_ENABLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Web extraction is disabled")

    logger.info(f"Storing web content in memory for URL: {request.url}")
    try:
        memory_response = await web_extractor.store_in_memory(request)
        return memory_response
    except Exception as e:
        logger.error(f"Error storing web content in memory: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post('/options', response_model=dict)
async def update_extraction_options(options: Dict[str, Any],
                                   web_extractor: WebExtractor = Depends(get_web_extractor)) -> Dict[str, Any]:
    """
    Update web extraction configuration options
    """
    if not WEB_EXTRACTION_ENABLED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Web extraction is disabled")

    logger.info(f"Updating web extraction options: {options}")
    try:
        updated_options = await web_extractor.update_extraction_options(**options)
        return updated_options
    except Exception as e:
        logger.error(f"Error updating web extraction options: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get('/status', response_model=dict)
async def get_extraction_status() -> Dict[str, Any]:
    """
    Get the current status of web extraction functionality
    """
    try:
        status_info = {
            "enabled": WEB_EXTRACTION_ENABLED,
            "settings": {
                "chunk_size": settings.get("web_extractor.chunk_size"),
                "chunk_overlap": settings.get("web_extractor.chunk_overlap"),
                "summary_length": settings.get("web_extractor.summary_length"),
                "include_images": settings.get("web_extractor.include_images")
            }
        }
        return status_info
    except Exception as e:
        logger.error(f"Error getting web extraction status: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))