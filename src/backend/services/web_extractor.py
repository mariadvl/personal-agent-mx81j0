"""
Web Extractor Service

This module provides functionality for extracting, processing, and storing web content
for the Personal AI Agent. It handles fetching web pages, extracting main content,
generating summaries, and storing the processed content in the agent's memory system.
"""

import logging
import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from ..utils.web_scraper import WebScraper
from ..utils.text_processing import clean_text
from ..schemas.web import (
    WebExtractionRequest, WebExtractionResponse, 
    WebMemoryRequest, WebMemoryResponse
)
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Default constants from settings
DEFAULT_CHUNK_SIZE = settings.get('web_extractor.chunk_size', 1000)
DEFAULT_CHUNK_OVERLAP = settings.get('web_extractor.chunk_overlap', 100)
DEFAULT_SUMMARY_LENGTH = settings.get('web_extractor.summary_length', 200)
DEFAULT_INCLUDE_IMAGES = settings.get('web_extractor.include_images', False)
DEFAULT_STORE_IN_MEMORY = settings.get('web_extractor.store_in_memory', True)
DEFAULT_GENERATE_SUMMARY = settings.get('web_extractor.generate_summary', True)

def chunk_text(text: str, chunk_size: Optional[int] = None, chunk_overlap: Optional[int] = None) -> List[str]:
    """
    Split text into chunks of specified size with overlap
    
    Args:
        text (str): Text to split into chunks
        chunk_size (Optional[int]): Maximum size of each chunk
        chunk_overlap (Optional[int]): Overlap between chunks
        
    Returns:
        List[str]: List of text chunks
    """
    try:
        # Set defaults if not provided
        chunk_size = chunk_size or DEFAULT_CHUNK_SIZE
        chunk_overlap = chunk_overlap or DEFAULT_CHUNK_OVERLAP
        
        # Split text into paragraphs
        paragraphs = text.split('\n\n')
        
        # Initialize chunks
        chunks = []
        current_chunk = ""
        
        # Process each paragraph
        for paragraph in paragraphs:
            # Clean paragraph
            paragraph = paragraph.strip()
            if not paragraph:
                continue
                
            # Check if adding this paragraph would exceed chunk size
            if current_chunk and len(current_chunk) + len(paragraph) + 2 > chunk_size:
                # Add current chunk to list
                chunks.append(current_chunk)
                
                # Start a new chunk with overlap
                if chunk_overlap > 0 and len(current_chunk) > chunk_overlap:
                    # Calculate overlap text
                    overlap_start = max(0, len(current_chunk) - chunk_overlap)
                    current_chunk = current_chunk[overlap_start:] + "\n\n" + paragraph
                else:
                    current_chunk = paragraph
            else:
                # Add paragraph to current chunk
                if current_chunk:
                    current_chunk += "\n\n" + paragraph
                else:
                    current_chunk = paragraph
        
        # Add the last chunk if not empty
        if current_chunk:
            chunks.append(current_chunk)
            
        return chunks
    except Exception as e:
        logger.error(f"Error chunking text: {str(e)}")
        # Return single chunk in case of error
        return [text]

class WebExtractor:
    """
    Service for extracting, processing, and storing web content
    """
    
    def __init__(self, memory_service: Any, llm_service: Any):
        """
        Initialize the WebExtractor with required services
        
        Args:
            memory_service: Service for storing and retrieving memory
            llm_service: Service for generating summaries and processing content
        """
        self.memory_service = memory_service
        self.llm_service = llm_service
        self.web_scraper = WebScraper()
        self.extraction_options = {
            'chunk_size': DEFAULT_CHUNK_SIZE,
            'chunk_overlap': DEFAULT_CHUNK_OVERLAP,
            'summary_length': DEFAULT_SUMMARY_LENGTH,
            'include_images': DEFAULT_INCLUDE_IMAGES,
            'store_in_memory': DEFAULT_STORE_IN_MEMORY,
            'generate_summary': DEFAULT_GENERATE_SUMMARY
        }
        logger.info("WebExtractor initialized with default settings")
    
    async def extract_from_url(self, request: WebExtractionRequest) -> WebExtractionResponse:
        """
        Extract content from a web page URL
        
        Args:
            request (WebExtractionRequest): Request containing URL and extraction options
            
        Returns:
            WebExtractionResponse: Extracted web content with metadata
        """
        try:
            url = request.url
            logger.info(f"Extracting content from URL: {url}")
            
            # Prepare scraper options
            scraper_options = {}
            if hasattr(request, 'extraction_options') and request.extraction_options:
                scraper_options = request.extraction_options
                
            # Add include_images option if specified
            if request.include_images is not None:
                scraper_options['extract_images'] = request.include_images
            
            # Scrape web page
            scrape_result = await self.web_scraper.scrape(url, scraper_options)
            
            # Check if scraping was successful
            if not scrape_result.get('success', False):
                error = scrape_result.get('error', 'Unknown error')
                logger.error(f"Failed to extract content from {url}: {error}")
                
                return WebExtractionResponse(
                    url=url,
                    title="",
                    content="",
                    success=False,
                    error=error,
                    metadata={"url": url}
                )
            
            # Extract metadata and content
            metadata = scrape_result.get('metadata', {})
            title = metadata.get('title', '')
            content = scrape_result.get('main_text', '')
            
            # Process content
            processed_content = self._process_content(content, metadata)
            
            # Initialize response
            response_data = {
                'url': url,
                'title': title,
                'content': processed_content,
                'success': True,
                'metadata': metadata,
                'memory_items': None
            }
            
            # Generate summary if requested
            generate_summary = request.generate_summary if request.generate_summary is not None else self.extraction_options['generate_summary']
            if generate_summary:
                summary = await self.generate_summary(
                    processed_content, 
                    title, 
                    self.extraction_options['summary_length']
                )
                response_data['summary'] = summary
            
            # Store in memory if requested
            store_in_memory = request.store_in_memory if request.store_in_memory is not None else self.extraction_options['store_in_memory']
            if store_in_memory:
                memory_request = WebMemoryRequest(
                    url=url,
                    title=title,
                    content=processed_content,
                    summary=response_data.get('summary'),
                    metadata=metadata
                )
                
                memory_result = await self.store_in_memory(memory_request)
                if memory_result.success:
                    response_data['memory_items'] = memory_result.memory_items
            
            # Extract images if requested
            if (request.include_images or self.extraction_options['include_images']) and 'images' in scrape_result:
                response_data['images'] = scrape_result['images']
            
            # Publish event
            event_bus.publish('web:extracted', {
                'url': url,
                'status': 'success',
                'title': title,
                'has_summary': 'summary' in response_data
            })
            
            # Create response object
            return WebExtractionResponse(**response_data)
            
        except Exception as e:
            logger.error(f"Error extracting content from {request.url}: {str(e)}")
            return WebExtractionResponse(
                url=request.url,
                title="",
                content="",
                success=False,
                error=f"Extraction error: {str(e)}",
                metadata={"url": request.url}
            )
    
    async def generate_summary(self, content: str, title: str, max_length: Optional[int] = None) -> str:
        """
        Generate a summary of web content using LLM
        
        Args:
            content (str): Web content to summarize
            title (str): Title of the web page
            max_length (Optional[int]): Maximum length of summary
            
        Returns:
            str: Generated summary
        """
        try:
            max_length = max_length or self.extraction_options['summary_length']
            logger.info(f"Generating summary for content titled '{title}' (max length: {max_length})")
            
            # Prepare prompt for LLM
            prompt = f"Summarize the following web content in {max_length} words or less. Title: '{title}'\n\nContent:\n{content}"
            
            # Generate summary
            summary = await self.llm_service.generate_response(prompt, max_tokens=max_length*2)
            
            return summary
        except Exception as e:
            logger.error(f"Error generating summary for '{title}': {str(e)}")
            return f"Summary generation failed: {str(e)}"
    
    async def store_in_memory(self, request: WebMemoryRequest) -> WebMemoryResponse:
        """
        Store web content in the memory system
        
        Args:
            request (WebMemoryRequest): Request containing content to store
            
        Returns:
            WebMemoryResponse: Result of storing in memory
        """
        try:
            url = request.url
            title = request.title
            content = request.content
            
            logger.info(f"Storing web content in memory: {url}")
            
            # Create web page record
            web_page = await self._create_web_page_record(url, title, request.metadata)
            
            # Chunk content for storage
            chunks = chunk_text(
                content, 
                self.extraction_options['chunk_size'], 
                self.extraction_options['chunk_overlap']
            )
            
            # Store each chunk in memory
            memory_items = []
            
            for i, chunk in enumerate(chunks):
                metadata = {
                    'source_type': 'web',
                    'source_id': str(web_page['id']),
                    'url': url,
                    'title': title,
                    'chunk_index': i,
                    'total_chunks': len(chunks)
                }
                
                # Add any additional metadata
                if request.metadata:
                    metadata.update(request.metadata)
                
                # Store in memory
                memory_item = await self.memory_service.store_memory(
                    content=chunk,
                    metadata=metadata,
                    category="web_content"
                )
                
                memory_items.append(memory_item['id'])
            
            # Store summary as a separate memory item if provided
            if request.summary:
                summary_metadata = {
                    'source_type': 'web',
                    'source_id': str(web_page['id']),
                    'url': url,
                    'title': title,
                    'is_summary': True
                }
                
                # Add any additional metadata
                if request.metadata:
                    summary_metadata.update(request.metadata)
                
                # Store summary in memory
                summary_item = await self.memory_service.store_memory(
                    content=request.summary,
                    metadata=summary_metadata,
                    category="web_summary"
                )
                
                memory_items.append(summary_item['id'])
            
            # Publish event
            event_bus.publish('web:stored', {
                'url': url,
                'memory_items_count': len(memory_items),
                'has_summary': request.summary is not None
            })
            
            return WebMemoryResponse(
                success=True,
                memory_items=memory_items
            )
            
        except Exception as e:
            logger.error(f"Error storing web content in memory: {str(e)}")
            return WebMemoryResponse(
                success=False,
                memory_items=[],
                error=f"Memory storage error: {str(e)}"
            )
    
    async def update_extraction_options(self, 
                                      chunk_size: Optional[int] = None,
                                      chunk_overlap: Optional[int] = None,
                                      summary_length: Optional[int] = None,
                                      include_images: Optional[bool] = None,
                                      store_in_memory: Optional[bool] = None,
                                      generate_summary: Optional[bool] = None,
                                      scraper_options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Update the web extraction configuration options
        
        Args:
            chunk_size (Optional[int]): Size of text chunks
            chunk_overlap (Optional[int]): Overlap between chunks
            summary_length (Optional[int]): Maximum length of generated summaries
            include_images (Optional[bool]): Whether to include images in extraction
            store_in_memory (Optional[bool]): Whether to automatically store content in memory
            generate_summary (Optional[bool]): Whether to automatically generate summaries
            scraper_options (Optional[Dict[str, Any]]): Options for the web scraper
            
        Returns:
            Dict[str, Any]: Updated extraction options
        """
        try:
            logger.info("Updating WebExtractor options")
            
            # Update options if provided
            if chunk_size is not None:
                self.extraction_options['chunk_size'] = chunk_size
                
            if chunk_overlap is not None:
                self.extraction_options['chunk_overlap'] = chunk_overlap
                
            if summary_length is not None:
                self.extraction_options['summary_length'] = summary_length
                
            if include_images is not None:
                self.extraction_options['include_images'] = include_images
                
            if store_in_memory is not None:
                self.extraction_options['store_in_memory'] = store_in_memory
                
            if generate_summary is not None:
                self.extraction_options['generate_summary'] = generate_summary
            
            # Update web scraper options if provided
            if scraper_options:
                self.web_scraper.update_options(**scraper_options)
            
            return self.extraction_options
        
        except Exception as e:
            logger.error(f"Error updating extraction options: {str(e)}")
            return self.extraction_options
    
    async def close(self) -> None:
        """
        Close the web extractor and release resources
        """
        try:
            await self.web_scraper.close()
            logger.info("WebExtractor closed")
        except Exception as e:
            logger.error(f"Error closing WebExtractor: {str(e)}")
    
    async def _create_web_page_record(self, url: str, title: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a record for the web page in the database
        
        Args:
            url (str): URL of the web page
            title (str): Title of the web page
            metadata (Optional[Dict[str, Any]]): Additional metadata
            
        Returns:
            Dict[str, Any]: Created web page record
        """
        try:
            # Generate UUID for the record
            page_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            # Create record
            web_page = {
                'id': page_id,
                'url': url,
                'title': title,
                'created_at': now,
                'last_accessed': now,
                'processed': True,
                'metadata': metadata or {}
            }
            
            # Store record in database if the method exists
            if hasattr(self.memory_service, 'store_web_page_record'):
                await self.memory_service.store_web_page_record(web_page)
            else:
                # Fallback: store as regular memory item
                await self.memory_service.store_memory(
                    content=f"Web page: {title}",
                    metadata={
                        'source_type': 'web_page_record',
                        'url': url,
                        'title': title,
                        'created_at': now,
                        'last_accessed': now
                    },
                    category="web_metadata"
                )
            
            return web_page
        
        except Exception as e:
            logger.error(f"Error creating web page record: {str(e)}")
            # Return a minimal record even if storage failed
            return {
                'id': str(uuid.uuid4()),
                'url': url,
                'title': title,
                'created_at': datetime.now().isoformat(),
                'last_accessed': datetime.now().isoformat()
            }
    
    def _process_content(self, content: str, metadata: Dict[str, Any]) -> str:
        """
        Process and clean the extracted web content
        
        Args:
            content (str): Raw web content
            metadata (Dict[str, Any]): Web page metadata
            
        Returns:
            str: Processed content
        """
        try:
            # Clean content
            processed_content = clean_text(content)
            
            # Remove excessive whitespace
            processed_content = '\n'.join(line.strip() for line in processed_content.split('\n') if line.strip())
            
            # Ensure proper spacing after punctuation
            processed_content = processed_content.replace('.','. ').replace('  ',' ')
            processed_content = processed_content.replace('!','! ').replace('  ',' ')
            processed_content = processed_content.replace('?','? ').replace('  ',' ')
            
            return processed_content
        
        except Exception as e:
            logger.error(f"Error processing content: {str(e)}")
            return content