import logging
import requests
import json
from typing import Dict, List, Optional, Any
import urllib.parse
from datetime import datetime

from ..schemas.search import SearchResultItem, SearchResponse
from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..utils.web_scraper import extract_source

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Default constants
SERPAPI_BASE_URL = "https://serpapi.com/search"
DEFAULT_TIMEOUT = settings.get('search.timeout_seconds', 10)
DEFAULT_ENGINE = settings.get('search.serpapi.engine', 'google')
DEFAULT_COUNTRY = settings.get('search.serpapi.country', 'us')
DEFAULT_LANGUAGE = settings.get('search.serpapi.language', 'en')


class SerpApiError(Exception):
    """Base exception class for SerpAPI-related errors"""
    
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data or {}
        
        # Format a detailed error message
        detailed_msg = f"{message}"
        if status_code:
            detailed_msg += f" (Status: {status_code})"
        if response_data and 'error' in response_data:
            detailed_msg += f" - {response_data['error']}"


class SerpApiAuthError(SerpApiError):
    """Exception raised when SerpAPI authentication fails"""
    
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        super().__init__(message, status_code, response_data)


class SerpApiRateLimitError(SerpApiError):
    """Exception raised when SerpAPI rate limits are exceeded"""
    
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        super().__init__(message, status_code, response_data)


class SerpApiServerError(SerpApiError):
    """Exception raised for SerpAPI server errors"""
    
    def __init__(self, message: str, status_code: int = None, response_data: Dict = None):
        super().__init__(message, status_code, response_data)


def parse_date_string(date_string: str) -> Optional[datetime]:
    """
    Parses a date string into a datetime object
    
    Args:
        date_string: String containing a date
        
    Returns:
        Optional[datetime.datetime]: Parsed datetime object or None if parsing fails
    """
    if not date_string:
        return None
    
    try:
        # Try ISO format first
        return datetime.fromisoformat(date_string)
    except ValueError:
        # Try common date formats
        date_formats = [
            "%Y-%m-%d",
            "%B %d, %Y",
            "%d %B %Y",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%Y/%m/%d",
        ]
        
        for fmt in date_formats:
            try:
                return datetime.strptime(date_string, fmt)
            except ValueError:
                continue
    
    # If all parsing attempts fail
    logger.debug(f"Could not parse date string: {date_string}")
    return None


def parse_google_results(response_data: dict) -> List[SearchResultItem]:
    """
    Parses search results from the Google search engine response
    
    Args:
        response_data: Response data from SerpAPI
        
    Returns:
        list[SearchResultItem]: List of parsed search result items
    """
    results = []
    
    try:
        # Check if we have organic results
        if 'organic_results' not in response_data:
            logger.warning("No organic results found in Google search response")
            return results
        
        # Process organic results
        for item in response_data['organic_results']:
            # Extract basic fields
            title = item.get('title', '')
            url = item.get('link', '')
            snippet = item.get('snippet', '')
            
            # Extract source domain
            source = extract_source(url)
            
            # Extract thumbnail if available
            image_url = None
            if 'thumbnail' in item:
                image_url = item['thumbnail']
            
            # Create result item if we have the minimum required fields
            if title and url and snippet:
                result = SearchResultItem(
                    title=title,
                    url=url,
                    snippet=snippet,
                    source=source,
                    image_url=image_url,
                    published_date=None  # Google doesn't typically provide dates in search results
                )
                results.append(result)
        
        return results
    except Exception as e:
        logger.error(f"Error parsing Google search results: {str(e)}")
        return results


def parse_bing_results(response_data: dict) -> List[SearchResultItem]:
    """
    Parses search results from the Bing search engine response
    
    Args:
        response_data: Response data from SerpAPI
        
    Returns:
        list[SearchResultItem]: List of parsed search result items
    """
    results = []
    
    try:
        # Check if we have organic results
        if 'organic_results' not in response_data:
            logger.warning("No organic results found in Bing search response")
            return results
        
        # Process organic results
        for item in response_data['organic_results']:
            # Extract basic fields
            title = item.get('title', '')
            url = item.get('link', '')
            snippet = item.get('snippet', '')
            
            # Extract source domain
            source = extract_source(url)
            
            # Extract date if available
            published_date = None
            if 'date' in item:
                published_date = parse_date_string(item['date'])
            
            # Extract thumbnail if available
            image_url = None
            if 'thumbnail' in item:
                image_url = item['thumbnail']
            
            # Create result item if we have the minimum required fields
            if title and url and snippet:
                result = SearchResultItem(
                    title=title,
                    url=url,
                    snippet=snippet,
                    source=source,
                    image_url=image_url,
                    published_date=published_date
                )
                results.append(result)
        
        return results
    except Exception as e:
        logger.error(f"Error parsing Bing search results: {str(e)}")
        return results


class SerpApiClient:
    """Client for interacting with the SerpAPI search engine"""
    
    def __init__(self, 
                 api_key: Optional[str] = None,
                 base_url: Optional[str] = None,
                 timeout: Optional[int] = None,
                 engine: Optional[str] = None,
                 country: Optional[str] = None,
                 language: Optional[str] = None):
        """
        Initializes the SerpAPI client with configuration options
        
        Args:
            api_key: SerpAPI API key (optional, will use settings if not provided)
            base_url: Base URL for the SerpAPI service (optional)
            timeout: Request timeout in seconds (optional)
            engine: Search engine to use (google, bing, etc.) (optional)
            country: Country code for results (optional)
            language: Language code for results (optional)
        """
        # Get API key from settings if not provided
        self.api_key = api_key or settings.get_secret('serpapi_api_key')
        
        # Set other properties
        self.base_url = base_url or SERPAPI_BASE_URL
        self.timeout = timeout or DEFAULT_TIMEOUT
        self.engine = engine or DEFAULT_ENGINE
        self.country = country or DEFAULT_COUNTRY
        self.language = language or DEFAULT_LANGUAGE
        
        logger.info(f"Initialized SerpApiClient with engine={self.engine}, country={self.country}, language={self.language}")
        
        # Validate API key
        if not self.api_key:
            error_msg = "SerpAPI API key not provided or found in settings"
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    def search(self, query: str, num_results: int = 10, include_images: bool = False, filters: dict = None) -> SearchResponse:
        """
        Performs a search using the SerpAPI
        
        Args:
            query: Search query string
            num_results: Number of results to return
            include_images: Whether to include image results
            filters: Additional search filters
            
        Returns:
            SearchResponse: Standardized search response object
        """
        try:
            # Build search parameters
            params = self.build_search_params(query, num_results, include_images, filters or {})
            
            # Log the search request
            logger.info(f"Performing SerpAPI search: query='{query}', engine={self.engine}")
            
            # Make HTTP request to SerpAPI
            response = requests.get(
                self.base_url,
                params=params,
                timeout=self.timeout
            )
            
            # Check response status code
            if response.status_code != 200:
                self.handle_error_response(response)
            
            # Parse response data
            data = response.json()
            
            # Parse results based on search engine
            results = []
            if self.engine == 'google':
                results = parse_google_results(data)
            elif self.engine == 'bing':
                results = parse_bing_results(data)
            else:
                # Default to Google parser for other engines
                results = parse_google_results(data)
            
            # Limit results to requested number
            results = results[:num_results]
            
            # Get total results count
            total_results = data.get('search_information', {}).get('total_results', len(results))
            if isinstance(total_results, str):
                # Handle case where total_results is a string (possibly with commas)
                total_results = int(''.join(c for c in total_results if c.isdigit()) or 0)
            
            # Create standardized response
            search_response = SearchResponse(
                query=query,
                results=results,
                total_results=total_results,
                provider='serpapi'
            )
            
            # Publish event
            event_bus.publish('search:completed', {
                'query': query,
                'num_results': len(results),
                'total_results': total_results,
                'engine': self.engine
            })
            
            return search_response
        
        except SerpApiError:
            # Re-raise SerpAPI-specific errors
            raise
        except requests.Timeout:
            logger.error(f"SerpAPI request timed out for query: {query}")
            raise SerpApiError(f"Search request timed out after {self.timeout} seconds")
        except requests.RequestException as e:
            logger.error(f"SerpAPI request error for query '{query}': {str(e)}")
            raise SerpApiError(f"Search request error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during SerpAPI search: {str(e)}")
            raise SerpApiError(f"Unexpected error: {str(e)}")
    
    def build_search_params(self, query: str, num_results: int, include_images: bool, filters: dict) -> dict:
        """
        Builds the parameters for a SerpAPI search request
        
        Args:
            query: Search query string
            num_results: Number of results to return
            include_images: Whether to include image results
            filters: Additional search filters
            
        Returns:
            dict: Dictionary of search parameters
        """
        # Initialize params dictionary with q=query
        params = {'q': query}
        
        # Add api_key parameter
        params['api_key'] = self.api_key
        
        # Add engine parameter based on instance configuration
        params['engine'] = self.engine
        
        # Add country and language parameters
        params['gl'] = self.country
        params['hl'] = self.language
        
        # Add num parameter for number of results (add buffer for filtering)
        params['num'] = min(num_results + 5, 100)  # SerpAPI limits to 100 results
        
        # Add tbm=isch parameter if include_images is True
        if include_images:
            params['tbm'] = 'isch'  # Google image search parameter
        
        # Add any additional parameters from filters dictionary
        params.update(filters)
        
        return params
    
    def handle_error_response(self, response: requests.Response) -> None:
        """
        Handles error responses from the SerpAPI service
        
        Args:
            response: Response object from requests
            
        Returns:
            None: Raises appropriate exception based on error
        """
        # Check response status code
        status_code = response.status_code
        error_data = {}
        
        # Try to parse error data from response
        try:
            error_data = response.json()
        except:
            # If response isn't valid JSON, use text content
            error_data = {'error': response.text}
        
        # For 401 errors, raise SerpApiAuthError
        if status_code == 401:
            logger.error(f"SerpAPI authentication error: {error_data.get('error', 'Invalid API key')}")
            raise SerpApiAuthError("Authentication failed", status_code, error_data)
        
        # For 429 errors, raise SerpApiRateLimitError
        elif status_code == 429:
            logger.error(f"SerpAPI rate limit exceeded: {error_data.get('error', 'Too many requests')}")
            raise SerpApiRateLimitError("Rate limit exceeded", status_code, error_data)
        
        # For 5xx errors, raise SerpApiServerError
        elif status_code >= 500:
            logger.error(f"SerpAPI server error: {error_data.get('error', 'Server error')}")
            raise SerpApiServerError("SerpAPI server error", status_code, error_data)
        
        # For other errors, raise SerpApiError
        else:
            logger.error(f"SerpAPI error: {error_data.get('error', 'Unknown error')} (Status: {status_code})")
            raise SerpApiError(f"SerpAPI error: {error_data.get('error', 'Unknown error')}", status_code, error_data)