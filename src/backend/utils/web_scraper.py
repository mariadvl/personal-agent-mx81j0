import logging
import asyncio
from typing import Dict, List, Optional, Any, Union
import aiohttp
from aiohttp import ClientSession, ClientTimeout, ClientError
from bs4 import BeautifulSoup
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse, urljoin

from ..utils.text_processing import extract_main_content, extract_text_from_html, clean_text
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Default constants from settings
DEFAULT_TIMEOUT = settings.get('web_scraper.timeout', 30)
DEFAULT_MAX_SIZE = settings.get('web_scraper.max_size', 10 * 1024 * 1024)  # 10 MB
DEFAULT_USER_AGENT = settings.get('web_scraper.user_agent', 'Personal AI Agent/1.0')
DEFAULT_RESPECT_ROBOTS_TXT = settings.get('web_scraper.respect_robots_txt', True)
DEFAULT_FOLLOW_REDIRECTS = settings.get('web_scraper.follow_redirects', True)
DEFAULT_EXTRACT_IMAGES = settings.get('web_scraper.extract_images', False)

# Cache for robots.txt parsers
ROBOTS_CACHE = {}  # Cache for robots.txt parsers


async def get_robots_parser(url: str) -> Optional[RobotFileParser]:
    """
    Gets or creates a robots.txt parser for a given domain
    
    Args:
        url (str): URL to check
        
    Returns:
        Optional[RobotFileParser]: RobotFileParser instance or None if failed
    """
    try:
        parsed_url = urlparse(url)
        domain = f"{parsed_url.scheme}://{parsed_url.netloc}"
        
        # Check if we already have a parser for this domain
        if domain in ROBOTS_CACHE:
            return ROBOTS_CACHE[domain]
        
        # Create a new parser
        parser = RobotFileParser()
        robots_url = f"{domain}/robots.txt"
        
        # Fetch robots.txt
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(robots_url, timeout=10) as response:
                    if response.status == 200:
                        robots_txt = await response.text()
                        parser.parse(robots_txt.splitlines())
                    else:
                        # If robots.txt doesn't exist or isn't accessible, assume everything is allowed
                        parser.allow_all = True
            except Exception as e:
                logger.warning(f"Failed to fetch robots.txt from {domain}: {str(e)}")
                # If we can't fetch robots.txt, assume everything is allowed
                parser.allow_all = True
        
        # Cache the parser
        ROBOTS_CACHE[domain] = parser
        return parser
    except Exception as e:
        logger.error(f"Error creating robots parser for {url}: {str(e)}")
        return None


async def can_fetch(url: str, respect_robots_txt: bool) -> bool:
    """
    Checks if a URL can be fetched according to robots.txt rules
    
    Args:
        url (str): URL to check
        respect_robots_txt (bool): Whether to respect robots.txt rules
        
    Returns:
        bool: True if URL can be fetched, False otherwise
    """
    try:
        # If robots.txt checking is disabled, always return True
        if not respect_robots_txt:
            return True
        
        # Get robots parser for the domain
        parser = await get_robots_parser(url)
        
        # If parser is None, assume we can fetch (fail open)
        if parser is None:
            return True
        
        # Check if user agent is allowed to fetch URL
        return parser.can_fetch(DEFAULT_USER_AGENT, url)
    except Exception as e:
        logger.error(f"Error checking if URL can be fetched: {str(e)}")
        # Fail open for better user experience
        return True


def extract_metadata(soup: BeautifulSoup, url: str) -> Dict[str, Any]:
    """
    Extracts metadata from HTML content such as title, description, and other meta tags
    
    Args:
        soup (BeautifulSoup): Parsed HTML
        url (str): Original URL
        
    Returns:
        Dict[str, Any]: Dictionary of metadata
    """
    try:
        metadata = {}
        
        # Extract page title
        title_tag = soup.find('title')
        if title_tag and title_tag.text:
            metadata['title'] = title_tag.text.strip()
        
        # Extract meta description
        description_tag = soup.find('meta', attrs={'name': 'description'})
        if description_tag and description_tag.get('content'):
            metadata['description'] = description_tag['content'].strip()
        
        # Extract meta keywords
        keywords_tag = soup.find('meta', attrs={'name': 'keywords'})
        if keywords_tag and keywords_tag.get('content'):
            metadata['keywords'] = [k.strip() for k in keywords_tag['content'].split(',')]
        
        # Extract author information
        author_tag = soup.find('meta', attrs={'name': 'author'})
        if author_tag and author_tag.get('content'):
            metadata['author'] = author_tag['content'].strip()
        
        # Extract publication date
        for date_tag_name in ['date', 'pubdate', 'publishdate', 'published_time', 'article:published_time']:
            date_tag = soup.find('meta', attrs={'name': date_tag_name}) or soup.find('meta', attrs={'property': date_tag_name})
            if date_tag and date_tag.get('content'):
                metadata['publication_date'] = date_tag['content'].strip()
                break
        
        # Extract canonical URL
        canonical_tag = soup.find('link', attrs={'rel': 'canonical'})
        if canonical_tag and canonical_tag.get('href'):
            metadata['canonical_url'] = canonical_tag['href'].strip()
        
        # Extract favicon URL
        favicon_tag = soup.find('link', attrs={'rel': 'icon'}) or soup.find('link', attrs={'rel': 'shortcut icon'})
        if favicon_tag and favicon_tag.get('href'):
            favicon_url = favicon_tag['href'].strip()
            if not favicon_url.startswith(('http://', 'https://')):
                parsed_url = urlparse(url)
                base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
                favicon_url = urljoin(base_url, favicon_url)
            metadata['favicon'] = favicon_url
        
        # Add original URL to metadata
        metadata['url'] = url
        
        return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        return {'url': url}


def extract_images(soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
    """
    Extracts image information from HTML content
    
    Args:
        soup (BeautifulSoup): Parsed HTML
        base_url (str): Base URL for resolving relative paths
        
    Returns:
        List[Dict[str, str]]: List of image information dictionaries
    """
    try:
        images = []
        img_tags = soup.find_all('img')
        
        for img in img_tags:
            # Skip images without src
            if not img.get('src'):
                continue
            
            img_url = img['src'].strip()
            
            # Convert relative URLs to absolute using base_url
            if not img_url.startswith(('http://', 'https://', 'data:')):
                img_url = urljoin(base_url, img_url)
            
            # Skip data URLs as they're usually small icons or spacers
            if img_url.startswith('data:'):
                continue
            
            # Create image info dictionary with these attributes
            img_info = {
                'url': img_url,
                'alt': img.get('alt', '').strip(),
                'title': img.get('title', '').strip()
            }
            
            # Add dimensions if available
            if img.get('width'):
                img_info['width'] = img['width']
            if img.get('height'):
                img_info['height'] = img['height']
            
            images.append(img_info)
        
        return images
    except Exception as e:
        logger.error(f"Error extracting images: {str(e)}")
        return []


class WebScraper:
    """
    Class for scraping web content with configurable options
    """
    
    def __init__(self, timeout=None, max_size=None, user_agent=None,
                 respect_robots_txt=None, follow_redirects=None, extract_images=None):
        """
        Initializes the WebScraper with configuration options
        
        Args:
            timeout (Optional[int]): Request timeout in seconds
            max_size (Optional[int]): Maximum content size in bytes
            user_agent (Optional[str]): User agent string for requests
            respect_robots_txt (Optional[bool]): Whether to respect robots.txt rules
            follow_redirects (Optional[bool]): Whether to follow HTTP redirects
            extract_images (Optional[bool]): Whether to extract image information
        """
        self.timeout = timeout if timeout is not None else DEFAULT_TIMEOUT
        self.max_size = max_size if max_size is not None else DEFAULT_MAX_SIZE
        self.user_agent = user_agent if user_agent is not None else DEFAULT_USER_AGENT
        self.respect_robots_txt = respect_robots_txt if respect_robots_txt is not None else DEFAULT_RESPECT_ROBOTS_TXT
        self.follow_redirects = follow_redirects if follow_redirects is not None else DEFAULT_FOLLOW_REDIRECTS
        self.extract_images = extract_images if extract_images is not None else DEFAULT_EXTRACT_IMAGES
        self._session = None
        
        logger.info(f"Initialized WebScraper with timeout={self.timeout}, max_size={self.max_size}, "
                   f"user_agent={self.user_agent}, respect_robots_txt={self.respect_robots_txt}, "
                   f"follow_redirects={self.follow_redirects}, extract_images={self.extract_images}")
    
    async def scrape(self, url: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Scrapes content from a URL with the configured options
        
        Args:
            url (str): URL to scrape
            options (Optional[Dict[str, Any]]): Override default options for this request
            
        Returns:
            Dict[str, Any]: Dictionary with scraped content and metadata
        """
        try:
            # Merge provided options with instance defaults
            options = options or {}
            timeout = options.get('timeout', self.timeout)
            max_size = options.get('max_size', self.max_size)
            user_agent = options.get('user_agent', self.user_agent)
            respect_robots_txt = options.get('respect_robots_txt', self.respect_robots_txt)
            follow_redirects = options.get('follow_redirects', self.follow_redirects)
            extract_images = options.get('extract_images', self.extract_images)
            
            # Check if URL can be fetched according to robots.txt
            if not await can_fetch(url, respect_robots_txt):
                logger.warning(f"URL {url} cannot be fetched according to robots.txt rules")
                return {
                    'success': False,
                    'status_code': 403,
                    'error': 'URL cannot be fetched according to robots.txt rules',
                    'url': url
                }
            
            # Create or reuse HTTP session
            session = await self.get_session()
            
            # Set request headers with user agent
            headers = {
                'User-Agent': user_agent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
            
            # Fetch URL content with timeout and size limits
            async with session.get(url, 
                                  headers=headers, 
                                  timeout=ClientTimeout(total=timeout),
                                  allow_redirects=follow_redirects) as response:
                
                # Check response status code
                if response.status != 200:
                    logger.warning(f"Failed to fetch URL {url}: Status {response.status}")
                    return {
                        'success': False,
                        'status_code': response.status,
                        'error': f'HTTP error: {response.status}',
                        'url': url
                    }
                
                # Get content type to determine how to handle the response
                content_type = response.headers.get('Content-Type', '').lower()
                
                # Handle HTML content
                if 'text/html' in content_type:
                    # Get HTML content
                    html_content = await response.text()
                    
                    # Parse HTML with BeautifulSoup
                    soup = BeautifulSoup(html_content, 'html.parser')
                    
                    # Extract main content using readability algorithm
                    main_content_html = extract_main_content(html_content)
                    
                    # Extract clean text from main content
                    main_text = extract_text_from_html(main_content_html)
                    
                    # Extract metadata from HTML
                    metadata = extract_metadata(soup, url)
                    
                    # Extract images if configured
                    images = extract_images(soup, url) if extract_images else []
                    
                    # Construct and return result dictionary with content, metadata, and status
                    result = {
                        'success': True,
                        'status_code': response.status,
                        'url': url,
                        'content_type': content_type,
                        'metadata': metadata,
                        'main_content_html': main_content_html,
                        'main_text': main_text,
                        'images': images if extract_images else None
                    }
                    
                    # Publish web:scraped event with URL and status
                    event_bus.publish('web:scraped', {
                        'url': url,
                        'status': 'success',
                        'content_type': content_type
                    })
                    
                    return result
                else:
                    # For non-HTML content, just return metadata
                    logger.info(f"Non-HTML content detected for URL {url}: {content_type}")
                    return {
                        'success': True,
                        'status_code': response.status,
                        'url': url,
                        'content_type': content_type,
                        'metadata': {
                            'url': url,
                            'content_type': content_type,
                            'content_length': response.headers.get('Content-Length')
                        },
                        'error': 'Non-HTML content cannot be processed'
                    }
                    
        except aiohttp.ClientError as e:
            logger.error(f"HTTP error while scraping URL {url}: {str(e)}")
            return {
                'success': False,
                'error': f'HTTP error: {str(e)}',
                'url': url
            }
        except Exception as e:
            logger.error(f"Error scraping URL {url}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'url': url
            }
    
    async def get_session(self) -> ClientSession:
        """
        Gets or creates an HTTP session for making requests
        
        Returns:
            ClientSession: HTTP client session
        """
        try:
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession(
                    timeout=ClientTimeout(total=self.timeout)
                )
            return self._session
        except Exception as e:
            logger.error(f"Error creating HTTP session: {str(e)}")
            raise
    
    async def close(self) -> None:
        """
        Closes the HTTP session if it exists
        """
        try:
            if self._session and not self._session.closed:
                await self._session.close()
                self._session = None
                logger.info("HTTP session closed")
        except Exception as e:
            logger.error(f"Error closing HTTP session: {str(e)}")
    
    def update_options(self, timeout=None, max_size=None, user_agent=None,
                       respect_robots_txt=None, follow_redirects=None, extract_images=None) -> Dict[str, Any]:
        """
        Updates the scraper configuration options
        
        Args:
            timeout (Optional[int]): Request timeout in seconds
            max_size (Optional[int]): Maximum content size in bytes
            user_agent (Optional[str]): User agent string for requests
            respect_robots_txt (Optional[bool]): Whether to respect robots.txt rules
            follow_redirects (Optional[bool]): Whether to follow HTTP redirects
            extract_images (Optional[bool]): Whether to extract image information
            
        Returns:
            Dict[str, Any]: Updated configuration options
        """
        try:
            # Check what's changed
            options_changed = False
            
            if timeout is not None and timeout != self.timeout:
                self.timeout = timeout
                options_changed = True
                
            if max_size is not None and max_size != self.max_size:
                self.max_size = max_size
                options_changed = True
                
            if user_agent is not None and user_agent != self.user_agent:
                self.user_agent = user_agent
                options_changed = True
                
            if respect_robots_txt is not None and respect_robots_txt != self.respect_robots_txt:
                self.respect_robots_txt = respect_robots_txt
                options_changed = True
                
            if follow_redirects is not None and follow_redirects != self.follow_redirects:
                self.follow_redirects = follow_redirects
                options_changed = True
                
            if extract_images is not None and extract_images != self.extract_images:
                self.extract_images = extract_images
                options_changed = True
            
            # Close existing session if any options changed
            if options_changed and self._session and not self._session.closed:
                asyncio.create_task(self.close())
            
            logger.info(f"Updated WebScraper options: timeout={self.timeout}, max_size={self.max_size}, "
                        f"user_agent={self.user_agent}, respect_robots_txt={self.respect_robots_txt}, "
                        f"follow_redirects={self.follow_redirects}, extract_images={self.extract_images}")
            
            # Return dictionary with current configuration
            return {
                'timeout': self.timeout,
                'max_size': self.max_size,
                'user_agent': self.user_agent,
                'respect_robots_txt': self.respect_robots_txt,
                'follow_redirects': self.follow_redirects,
                'extract_images': self.extract_images
            }
        except Exception as e:
            logger.error(f"Error updating scraper options: {str(e)}")
            raise