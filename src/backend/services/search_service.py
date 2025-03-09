import logging
import uuid
from typing import List, Dict, Optional, Any, Union
import asyncio
import json
import os
import hashlib

from ..integrations.serpapi_client import SerpApiClient, SerpApiError
from ..integrations.duckduckgo_client import DuckDuckGoClient, DuckDuckGoError
from ..schemas.search import SearchResultItem, SearchRequest, SearchResponse, SearchSummaryRequest, SearchSummaryResponse, SearchMemoryRequest, SearchMemoryResponse, SEARCH_PROVIDERS, DEFAULT_NUM_RESULTS
from ..schemas.web import WebExtractionRequest
from ..services.llm_service import LLMService
from ..services.memory_service import MemoryService
from ..services.web_extractor import WebExtractor
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Global constants
DEFAULT_CACHE_TTL = settings.get('search.cache_ttl_seconds', 3600)
DEFAULT_PROVIDER = settings.get('search.default_provider', 'duckduckgo')
DEFAULT_SUMMARY_MAX_LENGTH = settings.get('search.summary_max_length', 200)
CACHE_ENABLED = settings.get('search.cache_enabled', True)
CACHE_DIR = settings.get('search.cache_dir', 'data/cache/search')


class SearchCache:
    """
    Manages caching of search results to reduce API calls and improve performance
    """

    def __init__(self, cache_dir: Optional[str] = None, ttl_seconds: Optional[int] = None, enabled: Optional[bool] = None):
        """
        Initializes the search cache with configuration options

        Args:
            cache_dir: Directory to store cache files
            ttl_seconds: Time-to-live for cache entries in seconds
            enabled: Whether caching is enabled
        """
        self.cache_dir = cache_dir or CACHE_DIR
        self.ttl_seconds = ttl_seconds or DEFAULT_CACHE_TTL
        self.enabled = enabled if enabled is not None else CACHE_ENABLED

        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)

        logger.info(f"Initialized SearchCache with cache_dir={self.cache_dir}, ttl_seconds={self.ttl_seconds}, enabled={self.enabled}")

    async def get(self, query: str, provider: str, params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Retrieves a cached search result if available and not expired

        Args:
            query: Search query string
            provider: Search provider name
            params: Search parameters

        Returns:
            Cached search result or None if not found or expired
        """
        if not self.enabled:
            return None

        cache_key = self._generate_cache_key(query, provider, params)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        if not os.path.exists(cache_file):
            logger.debug(f"Cache miss for query '{query}' from provider '{provider}'")
            return None

        try:
            with open(cache_file, 'r') as f:
                cache_data = json.load(f)

            timestamp = datetime.fromisoformat(cache_data.get('timestamp', ''))
            expiration_time = timestamp + datetime.timedelta(seconds=self.ttl_seconds)

            if datetime.now() > expiration_time:
                logger.debug(f"Cache expired for query '{query}' from provider '{provider}'")
                os.remove(cache_file)
                return None

            logger.debug(f"Cache hit for query '{query}' from provider '{provider}'")
            return cache_data.get('result')

        except Exception as e:
            logger.error(f"Error retrieving cache for query '{query}' from provider '{provider}': {str(e)}")
            return None

    async def set(self, query: str, provider: str, params: Dict[str, Any], result: Dict[str, Any]) -> bool:
        """
        Stores a search result in the cache

        Args:
            query: Search query string
            provider: Search provider name
            params: Search parameters
            result: Search result data

        Returns:
            True if successfully cached, False otherwise
        """
        if not self.enabled:
            return False

        cache_key = self._generate_cache_key(query, provider, params)
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")

        try:
            cache_entry = {
                'timestamp': datetime.now().isoformat(),
                'result': result
            }

            with open(cache_file, 'w') as f:
                json.dump(cache_entry, f)

            logger.debug(f"Stored cache for query '{query}' from provider '{provider}'")
            return True

        except Exception as e:
            logger.error(f"Error storing cache for query '{query}' from provider '{provider}': {str(e)}")
            return False

    async def clear(self, query: Optional[str] = None, provider: Optional[str] = None) -> bool:
        """
        Clears a specific cache entry or all entries

        Args:
            query: Search query string to clear (optional)
            provider: Search provider name to clear (optional)

        Returns:
            True if successfully cleared, False otherwise
        """
        try:
            if query and provider:
                # Clear specific entry
                cache_key = self._generate_cache_key(query, provider, {})
                cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
                if os.path.exists(cache_file):
                    os.remove(cache_file)
                    logger.debug(f"Cleared cache entry for query '{query}' from provider '{provider}'")
            elif query:
                # Clear all entries for that query
                for filename in os.listdir(self.cache_dir):
                    if filename.startswith(hashlib.md5(query.lower().strip().encode()).hexdigest()):
                        os.remove(os.path.join(self.cache_dir, filename))
                logger.debug(f"Cleared all cache entries for query '{query}'")
            elif provider:
                # Clear all entries for that provider
                for filename in os.listdir(self.cache_dir):
                    if provider.lower() in filename.lower():
                        os.remove(os.path.join(self.cache_dir, filename))
                logger.debug(f"Cleared all cache entries for provider '{provider}'")
            else:
                # Clear all cache entries
                for filename in os.listdir(self.cache_dir):
                    os.remove(os.path.join(self.cache_dir, filename))
                logger.debug("Cleared all cache entries")

            return True

        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            return False

    async def cleanup(self) -> int:
        """
        Removes expired cache entries

        Returns:
            Number of entries removed
        """
        removed_count = 0
        try:
            for filename in os.listdir(self.cache_dir):
                cache_file = os.path.join(self.cache_dir, filename)
                try:
                    with open(cache_file, 'r') as f:
                        cache_data = json.load(f)

                    timestamp = datetime.fromisoformat(cache_data.get('timestamp', ''))
                    expiration_time = timestamp + datetime.timedelta(seconds=self.ttl_seconds)

                    if datetime.now() > expiration_time:
                        os.remove(cache_file)
                        removed_count += 1
                        logger.debug(f"Removed expired cache entry: {filename}")

                except Exception as e:
                    logger.warning(f"Error processing cache file {filename}: {str(e)}")

            logger.info(f"Cache cleanup removed {removed_count} expired entries")
            return removed_count

        except Exception as e:
            logger.error(f"Error cleaning up cache: {str(e)}")
            return removed_count

    def _generate_cache_key(self, query: str, provider: str, params: Dict[str, Any]) -> str:
        """
        Generates a unique cache key from search parameters

        Args:
            query: Search query string
            provider: Search provider name
            params: Search parameters

        Returns:
            Unique cache key
        """
        normalized_query = query.lower().strip()
        sorted_params = dict(sorted(params.items()))
        combined_string = f"{normalized_query}-{provider}-{json.dumps(sorted_params, sort_keys=True)}"
        return hashlib.md5(combined_string.encode()).hexdigest()


class SearchServiceError(Exception):
    """Base exception class for search service errors"""

    def __init__(self, message: str):
        """Initializes a SearchServiceError with error message"""
        super().__init__(message)
        self.message = message


class SearchProviderError(SearchServiceError):
    """Exception raised when a search provider encounters an error"""

    def __init__(self, message: str, provider: str):
        """Initializes a SearchProviderError with provider information"""
        super().__init__(message)
        self.provider = provider


class SearchRateLimitError(SearchProviderError):
    """Exception raised when search rate limits are exceeded"""

    def __init__(self, message: str, provider: str, retry_after: Optional[int] = None):
        """Initializes a SearchRateLimitError with rate limit information"""
        super().__init__(message, provider)
        self.retry_after = retry_after


class SearchService:
    """
    Service that provides web search functionality, result summarization, and memory integration
    """

    def __init__(self, llm_service: LLMService, memory_service: MemoryService, web_extractor: WebExtractor, config: Optional[Dict[str, Any]] = None):
        """
        Initializes the search service with required dependencies

        Args:
            llm_service: Service for generating text responses and summaries
            memory_service: Service for storing search results in memory
            web_extractor: Service for extracting content from web pages
            config: Optional configuration dictionary
        """
        self.llm_service = llm_service
        self.memory_service = memory_service
        self.web_extractor = web_extractor
        self.config = config or {}
        self.default_provider = self.config.get('default_provider', DEFAULT_PROVIDER)
        self.search_clients: Dict[str, Any] = {
            'serpapi': SerpApiClient(),
            'duckduckgo': DuckDuckGoClient()
        }
        self.cache = SearchCache()
        logger.info("Initialized SearchService")

    async def search(self, request: SearchRequest) -> SearchResponse:
        """
        Performs a web search using the specified provider

        Args:
            request: Search request object

        Returns:
            Search results from the web
        """
        query = request.query
        provider = request.provider
        num_results = request.num_results
        include_images = request.include_images
        filters = request.filters

        logger.info(f"Performing search: query='{query}', provider='{provider}'")

        if provider not in SEARCH_PROVIDERS:
            logger.warning(f"Unsupported search provider: {provider}. Using default provider: {self.default_provider}")
            provider = self.default_provider

        # Check cache for existing results
        cache_key = self.cache._generate_cache_key(query, provider, request.dict())
        cached_result = await self.cache.get(query, provider, request.dict())
        if cached_result:
            logger.info(f"Returning cached results for query: {query} from provider: {provider}")
            return SearchResponse(**cached_result)

        try:
            # Get appropriate search client
            search_client = self._get_search_client(provider)

            # Execute search
            search_response = search_client.search(query, num_results, include_images, filters)

            # Cache successful search results
            await self.cache.set(query, provider, request.dict(), search_response.dict())

            # Publish search:completed event
            event_bus.publish('search:completed', {
                'query': query,
                'num_results': len(search_response.results),
                'total_results': search_response.total_results,
                'provider': provider
            })

            return search_response

        except (SerpApiError, DuckDuckGoError) as e:
            logger.error(f"Search failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during search: {str(e)}")
            raise SearchServiceError(f"Search failed: {str(e)}")

    async def summarize_results(self, request: SearchSummaryRequest) -> SearchSummaryResponse:
        """
        Generates a summary of search results using LLM

        Args:
            request: Summary request object

        Returns:
            Summary of search results
        """
        query = request.query
        results = request.results
        max_length = request.max_length

        logger.info(f"Summarizing search results for query: {query}")

        try:
            # Format results for LLM
            formatted_results = self._format_results_for_summary(results)

            # Create prompt for LLM
            prompt = f"Summarize the following search results for the query '{query}' in {max_length} words or less:\n\n{formatted_results}"

            # Call LLM to generate summary
            summary = await self.llm_service.generate_response(prompt, {"max_tokens": max_length * 2})

            # Create SearchSummaryResponse
            summary_response = SearchSummaryResponse(
                query=query,
                summary=summary,
                num_results_used=len(results)
            )

            # Publish search:summarized event
            event_bus.publish('search:summarized', {
                'query': query,
                'summary_length': len(summary),
                'num_results': len(results)
            })

            return summary_response

        except Exception as e:
            logger.error(f"Error summarizing search results: {str(e)}")
            raise SearchServiceError(f"Summary generation failed: {str(e)}")

    async def store_in_memory(self, request: SearchMemoryRequest) -> SearchMemoryResponse:
        """
        Stores search results and summary in memory

        Args:
            request: Memory storage request object

        Returns:
            Result of storing search in memory
        """
        query = request.query
        results = request.results
        summary = request.summary
        conversation_id = request.conversation_id
        importance = request.importance

        logger.info(f"Storing search results in memory: query='{query}', results={len(results)}")

        try:
            # Prepare memory item for search summary
            summary_metadata = {
                'query': query,
                'result_count': len(results),
                'timestamp': datetime.now().isoformat()
            }

            # Store summary item
            summary_item = await self.memory_service.store_memory(
                content=summary,
                category='search',
                source_type='search_summary',
                source_id=None,
                importance=importance,
                metadata=summary_metadata
            )

            # Prepare memory items for individual search results
            memory_items = []
            for result in results:
                metadata = {
                    'query': query,
                    'url': result.url,
                    'title': result.title,
                    'snippet': result.snippet,
                    'source': result.source,
                    'published_date': result.published_date.isoformat() if result.published_date else None,
                    'image_url': result.image_url
                }

                memory_item = await self.memory_service.store_memory(
                    content=result.snippet,
                    category='search',
                    source_type='search_result',
                    source_id=None,
                    importance=importance,
                    metadata=metadata
                )
                memory_items.append(memory_item)

            # Create SearchMemoryResponse
            memory_ids = [item['id'] for item in memory_items]
            memory_ids.append(summary_item['id'])
            memory_response = SearchMemoryResponse(memory_id=summary_item['id'], success=True)

            # Publish search:stored_in_memory event
            event_bus.publish('search:stored_in_memory', {
                'query': query,
                'memory_item_count': len(memory_items)
            })

            return memory_response

        except Exception as e:
            logger.error(f"Error storing search results in memory: {str(e)}")
            raise SearchServiceError(f"Memory storage failed: {str(e)}")

    async def search_and_summarize(self, request: SearchRequest, max_summary_length: Optional[int] = None) -> Dict[str, Any]:
        """
        Performs search and generates summary in one operation

        Args:
            request: Search request object
            max_summary_length: Maximum length of summary

        Returns:
            Combined search results and summary
        """
        logger.info(f"Performing search and summarize: query='{request.query}'")

        try:
            # Perform search
            search_response = await self.search(request)

            # Create SearchSummaryRequest
            summary_request = SearchSummaryRequest(
                query=request.query,
                results=search_response.results,
                max_length=max_summary_length or DEFAULT_SUMMARY_MAX_LENGTH
            )

            # Generate summary
            summary_response = await self.summarize_results(summary_request)

            # Combine search results and summary
            combined_response = {
                'search_results': search_response.dict(),
                'summary': summary_response.dict()
            }

            return combined_response

        except Exception as e:
            logger.error(f"Error performing search and summarize: {str(e)}")
            raise SearchServiceError(f"Search and summarize failed: {str(e)}")

    async def search_store_and_summarize(self, request: SearchRequest, max_summary_length: Optional[int] = None, conversation_id: Optional[uuid.UUID] = None, importance: Optional[int] = None) -> Dict[str, Any]:
        """
        Performs search, stores results in memory, and generates summary

        Args:
            request: Search request object
            max_summary_length: Maximum length of summary
            conversation_id: Conversation ID to associate with memory
            importance: Importance level of the memory

        Returns:
            Combined search results, summary, and memory storage result
        """
        logger.info(f"Performing search, store, and summarize: query='{request.query}'")

        try:
            # Perform search
            search_response = await self.search(request)

            # Create SearchSummaryRequest
            summary_request = SearchSummaryRequest(
                query=search_response.query,
                results=search_response.results,
                max_length=max_summary_length or DEFAULT_SUMMARY_MAX_LENGTH
            )

            # Generate summary
            summary_response = await self.summarize_results(summary_request)

            # Create SearchMemoryRequest
            memory_request = SearchMemoryRequest(
                query=search_response.query,
                results=search_response.results,
                summary=summary_response.summary,
                conversation_id=conversation_id,
                importance=importance
            )

            # Store in memory
            memory_response = await self.store_in_memory(memory_request)

            # Combine search results, summary, and memory result
            combined_response = {
                'search_results': search_response.dict(),
                'summary': summary_response.dict(),
                'memory_result': memory_response.dict()
            }

            return combined_response

        except Exception as e:
            logger.error(f"Error performing search, store, and summarize: {str(e)}")
            raise SearchServiceError(f"Search, store, and summarize failed: {str(e)}")

    async def extract_web_content(self, url: str, include_images: Optional[bool] = False) -> Dict[str, Any]:
        """
        Extracts content from a web page URL

        Args:
            url: URL of the web page
            include_images: Whether to include images in the extraction

        Returns:
            Extracted web content
        """
        logger.info(f"Extracting web content from URL: {url}")

        try:
            # Create WebExtractionRequest
            extraction_request = WebExtractionRequest(
                url=url,
                include_images=include_images
            )

            # Call web_extractor.extract_from_url
            extraction_response = await self.web_extractor.extract_from_url(extraction_request)

            return extraction_response.dict()

        except Exception as e:
            logger.error(f"Error extracting web content from {url}: {str(e)}")
            raise SearchServiceError(f"Web content extraction failed: {str(e)}")

    async def get_provider_info(self) -> Dict[str, Any]:
        """
        Gets information about available search providers

        Returns:
            Information about search providers
        """
        try:
            # Create dictionary with available providers
            provider_info = {
                'available_providers': SEARCH_PROVIDERS,
                'default_provider': self.default_provider,
                'capabilities': {
                    'serpapi': {'images': True},
                    'duckduckgo': {'images': False}
                }
            }

            return provider_info

        except Exception as e:
            logger.error(f"Error getting provider info: {str(e)}")
            raise SearchServiceError(f"Getting provider info failed: {str(e)}")

    async def clear_cache(self, query: Optional[str] = None, provider: Optional[str] = None) -> Dict[str, Any]:
        """
        Clears the search cache for a specific query or all queries

        Args:
            query: Search query string to clear (optional)
            provider: Search provider name to clear (optional)

        Returns:
            Cache clearing result
        """
        logger.info(f"Clearing search cache: query='{query}', provider='{provider}'")

        try:
            # Call cache.clear with query and provider parameters
            await self.cache.clear(query, provider)

            return {'success': True, 'message': 'Cache cleared successfully'}

        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")
            raise SearchServiceError(f"Cache clearing failed: {str(e)}")

    def _get_search_client(self, provider: str) -> Any:
        """
        Gets the appropriate search client for a provider

        Args:
            provider: Search provider name

        Returns:
            Search client instance
        """
        if provider in self.search_clients:
            return self.search_clients[provider]
        else:
            raise ValueError(f"Unsupported search provider: {provider}")

    def _format_results_for_summary(self, results: List[SearchResultItem]) -> str:
        """
        Formats search results for LLM summarization

        Args:
            results: List of search result items

        Returns:
            Formatted results text
        """
        formatted_text = ""
        for i, result in enumerate(results):
            formatted_text += f"Result {i + 1}:\n"
            formatted_text += f"Title: {result.title}\n"
            formatted_text += f"URL: {result.url}\n"
            formatted_text += f"Snippet: {result.snippet}\n"
            if result.source:
                formatted_text += f"Source: {result.source}\n"
            formatted_text += "---\n"
        return formatted_text