import logging
import uuid
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from fastapi.security import SecurityScopes

from ...services.search_service import SearchService, SearchServiceError, SearchProviderError, SearchRateLimitError
from ...services.memory_service import MemoryService
from ...services.llm_service import LLMService
from ...schemas.search import SearchRequest, SearchResponse, SearchSummaryRequest, SearchSummaryResponse, SearchMemoryRequest, SearchMemoryResponse, SearchResultItem
from ..middleware.authentication import get_current_user
from ...config.settings import Settings

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/search", tags=["search"])

# Initialize settings
settings = Settings()

# Default summary length
DEFAULT_SUMMARY_LENGTH = settings.get('search.default_summary_length', 200)

# Default importance
DEFAULT_IMPORTANCE = settings.get('search.default_importance', 2)


def get_search_service() -> SearchService:
    """Dependency function to get the search service instance"""
    # Import necessary dependencies for creating SearchService
    from ...services.llm_service import LLMService
    from ...services.memory_service import MemoryService
    from ...services.web_extractor import WebExtractor

    # Create LLMService instance
    llm_service = LLMService()

    # Create MemoryService instance
    memory_service = MemoryService()

    # Create WebExtractor instance
    web_extractor = WebExtractor(memory_service=memory_service, llm_service=llm_service)

    # Create and return a new SearchService instance with required dependencies
    return SearchService(llm_service=llm_service, memory_service=memory_service, web_extractor=web_extractor)


@router.post("/", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def perform_search(
    search_request: SearchRequest,
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> SearchResponse:
    """Endpoint to perform a web search"""
    try:
        # Log incoming search request
        logger.info(f"Incoming search request: {search_request.query}")

        # Validate search request parameters
        if not search_request.query:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search query cannot be empty")

        # Call search_service.search with the search request
        search_results = await search_service.search(search_request)

        # Return search results
        return search_results

    except SearchRateLimitError as e:
        # Handle rate limit errors
        logger.warning(f"Search rate limit exceeded: {str(e)}")
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=e.message)

    except SearchProviderError as e:
        # Handle search provider errors
        logger.error(f"Search provider error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=e.message)

    except SearchServiceError as e:
        # Handle generic search service errors
        logger.error(f"Search service error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e.message)

    except Exception as e:
        # Handle unexpected errors during search
        logger.exception("Unexpected error during search")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.post("/summarize", response_model=SearchSummaryResponse, status_code=status.HTTP_200_OK)
async def summarize_search_results(
    summary_request: SearchSummaryRequest,
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> SearchSummaryResponse:
    """Endpoint to summarize search results"""
    try:
        # Log incoming summarization request
        logger.info(f"Incoming summarization request: {summary_request.query}")

        # Validate summary request parameters
        if not summary_request.query or not summary_request.results:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query and results cannot be empty")

        # Call search_service.summarize_results with the summary request
        summary_response = await search_service.summarize_results(summary_request)

        # Return the generated summary
        return summary_response

    except SearchServiceError as e:
        # Handle and log any errors during summarization
        logger.error(f"Error summarizing search results: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Summary generation failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during summarization
        logger.exception("Unexpected error during summarization")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.post("/store", response_model=SearchMemoryResponse, status_code=status.HTTP_200_OK)
async def store_search_in_memory(
    memory_request: SearchMemoryRequest,
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> SearchMemoryResponse:
    """Endpoint to store search results in memory"""
    try:
        # Log incoming memory storage request
        logger.info(f"Incoming memory storage request: {memory_request.query}")

        # Validate memory request parameters
        if not memory_request.query or not memory_request.results or not memory_request.summary:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Query, results, and summary cannot be empty")

        # Call search_service.store_in_memory with the memory request
        memory_response = await search_service.store_in_memory(memory_request)

        # Return the memory storage result
        return memory_response

    except SearchServiceError as e:
        # Handle and log any errors during memory storage
        logger.error(f"Error storing search results in memory: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Memory storage failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during memory storage
        logger.exception("Unexpected error during memory storage")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.post("/search-and-summarize", status_code=status.HTTP_200_OK)
async def search_and_summarize(
    search_request: SearchRequest,
    max_summary_length: Optional[int] = Query(None, description="Maximum length of the summary"),
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Endpoint to perform search and generate summary in one operation"""
    try:
        # Log incoming search and summarize request
        logger.info(f"Incoming search and summarize request: {search_request.query}")

        # Set max_summary_length to provided value or DEFAULT_SUMMARY_LENGTH
        max_summary_length = max_summary_length or DEFAULT_SUMMARY_LENGTH

        # Validate search request parameters
        if not search_request.query:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search query cannot be empty")

        # Call search_service.search_and_summarize with search request and max_summary_length
        combined_response = await search_service.search_and_summarize(search_request, max_summary_length)

        # Return combined search results and summary
        return combined_response

    except SearchServiceError as e:
        # Handle and log any errors during operation
        logger.error(f"Error performing search and summarize: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Search and summarize failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during operation
        logger.exception("Unexpected error during search and summarize")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.post("/search-store-summarize", status_code=status.HTTP_200_OK)
async def search_store_and_summarize(
    search_request: SearchRequest,
    max_summary_length: Optional[int] = Query(None, description="Maximum length of the summary"),
    conversation_id: Optional[uuid.UUID] = Body(None, description="Conversation ID to associate with memory"),
    importance: Optional[int] = Body(DEFAULT_IMPORTANCE, description="Importance level of the memory"),
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Endpoint to perform search, store results in memory, and generate summary"""
    try:
        # Log incoming comprehensive search operation request
        logger.info(f"Incoming search, store, and summarize request: {search_request.query}")

        # Set max_summary_length to provided value or DEFAULT_SUMMARY_LENGTH
        max_summary_length = max_summary_length or DEFAULT_SUMMARY_LENGTH

        # Set importance to provided value or DEFAULT_IMPORTANCE
        importance = importance or DEFAULT_IMPORTANCE

        # Validate search request parameters
        if not search_request.query:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search query cannot be empty")

        # Call search_service.search_store_and_summarize with parameters
        combined_response = await search_service.search_store_and_summarize(search_request, max_summary_length, conversation_id, importance)

        # Return combined search results, summary, and memory storage result
        return combined_response

    except SearchServiceError as e:
        # Handle and log any errors during operation
        logger.error(f"Error performing search, store, and summarize: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Search, store, and summarize failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during operation
        logger.exception("Unexpected error during search, store, and summarize")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.get("/providers", status_code=status.HTTP_200_OK)
async def get_provider_info(
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Endpoint to get information about available search providers"""
    try:
        # Log provider info request
        logger.info("Incoming request for search provider information")

        # Call search_service.get_provider_info()
        provider_info = await search_service.get_provider_info()

        # Return provider information
        return provider_info

    except SearchServiceError as e:
        # Handle and log any errors during operation
        logger.error(f"Error getting provider info: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Getting provider info failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during operation
        logger.exception("Unexpected error during getting provider info")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


@router.post("/clear-cache", status_code=status.HTTP_200_OK)
async def clear_search_cache(
    query: Optional[str] = Query(None, description="Search query to clear cache for"),
    provider: Optional[str] = Query(None, description="Search provider to clear cache for"),
    search_service: SearchService = Depends(get_search_service),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """Endpoint to clear the search cache"""
    try:
        # Log cache clearing request
        logger.info(f"Incoming request to clear search cache: query='{query}', provider='{provider}'")

        # Call search_service.clear_cache with query and provider parameters
        result = await search_service.clear_cache(query, provider)

        # Return cache clearing result
        return result

    except SearchServiceError as e:
        # Handle and log any errors during operation
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Cache clearing failed: {e}")

    except Exception as e:
        # Handle and log any unexpected errors during operation
        logger.exception("Unexpected error during cache clearing")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {e}")


def handle_search_error(error: Exception):
    """Helper function to handle search-related errors and return appropriate HTTP exceptions"""
    # Log the error details
    logger.error(f"Search error: {str(error)}")

    # Check error type and return appropriate HTTP exception:
    if isinstance(error, SearchRateLimitError):
        # If SearchRateLimitError, return 429 Too Many Requests with retry information
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded for search provider {error.provider}. Please try again later."
        )
    elif isinstance(error, SearchProviderError):
        # If SearchProviderError, return 503 Service Unavailable with provider information
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Search provider {error.provider} is currently unavailable. Please try again later."
        )
    elif isinstance(error, SearchServiceError):
        # If SearchServiceError, return 500 Internal Server Error with error details
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search service error: {str(error)}"
        )
    else:
        # For any other exception, return 500 Internal Server Error with generic message
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during the search operation."
        )