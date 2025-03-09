import logging
import requests
import json
import urllib.parse
from datetime import datetime
from typing import Dict, List, Optional, Any
from bs4 import BeautifulSoup

from ..schemas.search import SearchResultItem, SearchResponse
from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..utils.web_scraper import extract_source

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Constants
DUCKDUCKGO_SEARCH_URL = "https://api.duckduckgo.com/"
DUCKDUCKGO_HTML_URL = "https://html.duckduckgo.com/html/"
DEFAULT_TIMEOUT = settings.get('search.timeout_seconds', 10)
DEFAULT_REGION = settings.get('search.duckduckgo.region', 'us-en')
DEFAULT_SAFE_SEARCH = settings.get('search.duckduckgo.safe_search', 'moderate')

def parse_search_results(html_content: str) -> List[SearchResultItem]:
    """
    Parses search results from the DuckDuckGo HTML response
    
    Args:
        html_content (str): HTML content from DuckDuckGo search
        
    Returns:
        List[SearchResultItem]: List of parsed search result items
    """
    try:
        # Create BeautifulSoup object from HTML content
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Initialize results list
        results = []
        
        # Find all result elements - DuckDuckGo HTML can change, so try multiple selectors
        result_elements = soup.find_all('div', class_='result')
        
        # If no results found, try alternative selectors
        if not result_elements:
            result_elements = soup.find_all('div', class_='result__body')
        
        if not result_elements:
            result_elements = soup.find_all('div', attrs={'id': lambda x: x and x.startswith('r1-')})
        
        for result in result_elements:
            try:
                # Extract title
                title_element = result.find('h2') or result.find('a', class_='result__a')
                if not title_element:
                    continue
                
                title = title_element.get_text().strip()
                
                # Extract URL
                link_element = result.find('a', class_='result__a') or result.find('a', class_='result__url')
                if not link_element or not link_element.has_attr('href'):
                    continue
                
                url = link_element['href']
                
                # Clean URL - DuckDuckGo adds its own redirect
                if url.startswith('/'):
                    # Extract actual URL from the uddg parameter in the query string
                    parsed_url = urllib.parse.urlparse(url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    if 'uddg' in query_params:
                        url = query_params['uddg'][0]
                    elif 'ud' in query_params:
                        url = query_params['ud'][0]
                
                # Extract snippet
                snippet_element = (
                    result.find('a', class_='result__snippet') or 
                    result.find('div', class_='result__snippet') or
                    result.find('div', class_='snippet')
                )
                snippet = snippet_element.get_text().strip() if snippet_element else ""
                
                # Extract source
                source = extract_source(url)
                
                # Create search result item
                if title and url:
                    results.append(SearchResultItem(
                        title=title,
                        url=url,
                        snippet=snippet,
                        source=source
                    ))
            except Exception as e:
                logger.warning(f"Error parsing search result: {str(e)}")
                continue
        
        return results
    except Exception as e:
        logger.error(f"Error parsing search results: {str(e)}")
        return []

def parse_instant_answer(api_response: dict) -> Optional[dict]:
    """
    Parses instant answer data from the DuckDuckGo API response
    
    Args:
        api_response (dict): JSON response from DuckDuckGo API
        
    Returns:
        Optional[dict]: Instant answer data or None if not available
    """
    try:
        # Check if there's an instant answer
        if not api_response.get('AbstractText') and not api_response.get('Answer'):
            return None
        
        instant_answer = {}
        
        # Add abstract text if available
        if api_response.get('AbstractText'):
            instant_answer['abstract'] = api_response['AbstractText']
            instant_answer['abstract_source'] = api_response.get('AbstractSource')
            instant_answer['abstract_url'] = api_response.get('AbstractURL')
        
        # Add answer if available
        if api_response.get('Answer'):
            instant_answer['answer'] = api_response['Answer']
        
        # Add related topics if available
        if api_response.get('RelatedTopics'):
            related_topics = []
            for topic in api_response['RelatedTopics']:
                if 'Text' in topic and 'FirstURL' in topic:
                    related_topics.append({
                        'text': topic['Text'],
                        'url': topic['FirstURL']
                    })
            
            if related_topics:
                instant_answer['related_topics'] = related_topics
        
        return instant_answer if instant_answer else None
    except Exception as e:
        logger.error(f"Error parsing instant answer: {str(e)}")
        return None

class DuckDuckGoClient:
    """
    Client for interacting with the DuckDuckGo search engine
    """
    
    def __init__(self, search_url=None, html_url=None, timeout=None, region=None, safe_search=None):
        """
        Initializes the DuckDuckGo client with configuration options
        
        Args:
            search_url (Optional[str]): URL for DuckDuckGo API search
            html_url (Optional[str]): URL for DuckDuckGo HTML search
            timeout (Optional[int]): Request timeout in seconds
            region (Optional[str]): Region code for localized results
            safe_search (Optional[str]): Safe search level (strict, moderate, off)
        """
        self.search_url = search_url or DUCKDUCKGO_SEARCH_URL
        self.html_url = html_url or DUCKDUCKGO_HTML_URL
        self.timeout = timeout or DEFAULT_TIMEOUT
        self.region = region or DEFAULT_REGION
        self.safe_search = safe_search or DEFAULT_SAFE_SEARCH
        
        logger.info(f"Initialized DuckDuckGoClient with region={self.region}, safe_search={self.safe_search}")
    
    def search(self, query: str, num_results: int = 10, include_images: bool = False, filters: Dict = None) -> SearchResponse:
        """
        Performs a search using the DuckDuckGo HTML interface
        
        Args:
            query (str): Search query
            num_results (int): Maximum number of results to return
            include_images (bool): Whether to include images in results
            filters (Dict): Additional search filters
            
        Returns:
            SearchResponse: Standardized search response object
        """
        try:
            # Prepare search parameters
            params = self.build_search_params(query, filters or {})
            
            # Log the search query
            logger.info(f"Performing DuckDuckGo search: {query}")
            
            # Make POST request to DuckDuckGo HTML search
            response = requests.post(
                self.html_url,
                data=params,
                timeout=self.timeout,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            )
            
            # Check if request was successful
            if response.status_code != 200:
                self.handle_error_response(response)
            
            # Parse search results
            results = parse_search_results(response.text)
            
            # Limit results to requested number
            results = results[:num_results]
            
            # Create search response
            search_response = SearchResponse(
                query=query,
                results=results,
                total_results=len(results),
                provider="duckduckgo"
            )
            
            # Publish search event
            event_bus.publish("search:completed", {
                "provider": "duckduckgo",
                "query": query,
                "num_results": len(results)
            })
            
            return search_response
        except DuckDuckGoError:
            # Re-raise specific DuckDuckGo errors
            raise
        except Exception as e:
            logger.error(f"Error performing DuckDuckGo search: {str(e)}")
            raise DuckDuckGoError(f"Search failed: {str(e)}", 0, {})
    
    def get_instant_answer(self, query: str) -> Optional[dict]:
        """
        Gets an instant answer for a query using the DuckDuckGo API
        
        Args:
            query (str): Search query
            
        Returns:
            Optional[dict]: Instant answer data or None if not available
        """
        try:
            # Prepare API parameters
            params = {
                'q': query,
                'format': 'json',
                'no_redirect': '1',
                'no_html': '1',
                't': 'PersonalAIAgent'
            }
            
            # Make GET request to DuckDuckGo API
            response = requests.get(
                self.search_url,
                params=params,
                timeout=self.timeout
            )
            
            # Check if request was successful
            if response.status_code != 200:
                logger.warning(f"Failed to get instant answer: HTTP {response.status_code}")
                return None
            
            # Parse JSON response
            api_response = response.json()
            
            # Extract instant answer
            return parse_instant_answer(api_response)
        except Exception as e:
            logger.error(f"Error getting instant answer: {str(e)}")
            return None
    
    def build_search_params(self, query: str, filters: Dict) -> Dict:
        """
        Builds the parameters for a DuckDuckGo search request
        
        Args:
            query (str): Search query
            filters (Dict): Additional search filters
            
        Returns:
            Dict: Dictionary of search parameters
        """
        # Build basic parameters
        params = {
            'q': query,
            's': '0',  # Start at first result
            'dc': '0',  # Disable auto-loading more results
        }
        
        # Add region parameter
        if self.region:
            # DuckDuckGo uses 'kl' parameter for region/language
            params['kl'] = self.region
        
        # Add safe search parameter
        if self.safe_search:
            # DuckDuckGo uses 'kp' parameter for safe search
            # Values: 1 (strict), -1 (off), -2 (moderate)
            if self.safe_search == 'strict':
                params['kp'] = '1'
            elif self.safe_search == 'off':
                params['kp'] = '-1'
            else:  # moderate (default)
                params['kp'] = '-2'
        
        # Add any additional filters
        for key, value in filters.items():
            params[key] = value
        
        return params
    
    def handle_error_response(self, response):
        """
        Handles error responses from the DuckDuckGo service
        
        Args:
            response (requests.Response): HTTP response object
            
        Raises:
            DuckDuckGoError: Generic DuckDuckGo error
            DuckDuckGoRateLimitError: Rate limit exceeded
            DuckDuckGoServerError: Server error
        """
        status_code = response.status_code
        
        try:
            error_data = response.json()
        except (ValueError, json.JSONDecodeError):
            error_data = {"error": response.text}
        
        error_message = f"DuckDuckGo search failed with status code {status_code}"
        
        if status_code == 429:
            logger.error(f"DuckDuckGo rate limit exceeded: {error_message}")
            raise DuckDuckGoRateLimitError(error_message, status_code, error_data)
        elif status_code >= 500:
            logger.error(f"DuckDuckGo server error: {error_message}")
            raise DuckDuckGoServerError(error_message, status_code, error_data)
        else:
            logger.error(f"DuckDuckGo error: {error_message}")
            raise DuckDuckGoError(error_message, status_code, error_data)

class DuckDuckGoError(Exception):
    """
    Base exception class for DuckDuckGo-related errors
    """
    
    def __init__(self, message, status_code, response_data):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response_data = response_data
        
        # Create a detailed error message
        detailed_message = f"{message} (Status: {status_code})"
        if response_data and isinstance(response_data, dict) and response_data.get("error"):
            detailed_message += f" - {response_data['error']}"
        
        self.detailed_message = detailed_message

class DuckDuckGoRateLimitError(DuckDuckGoError):
    """
    Exception raised when DuckDuckGo rate limits are exceeded
    """
    pass

class DuckDuckGoServerError(DuckDuckGoError):
    """
    Exception raised for DuckDuckGo server errors
    """
    pass