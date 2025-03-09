from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

# List of supported search providers
SEARCH_PROVIDERS = ['serpapi', 'duckduckgo']

# Default and maximum search result limits
DEFAULT_NUM_RESULTS = 5
MAX_NUM_RESULTS = 20


class SearchResultItem(BaseModel):
    """Schema for an individual search result item"""
    title: str
    url: str
    snippet: str
    source: Optional[str] = None
    published_date: Optional[datetime] = None
    image_url: Optional[str] = None


class SearchRequest(BaseModel):
    """Schema for a web search request"""
    query: str
    num_results: int = DEFAULT_NUM_RESULTS
    provider: str = SEARCH_PROVIDERS[0]
    include_images: bool = False
    filters: Optional[Dict[str, Any]] = None

    @validator('num_results')
    def validate_num_results(cls, value):
        """Validates that num_results is within acceptable range"""
        if value < 1:
            return DEFAULT_NUM_RESULTS
        if value > MAX_NUM_RESULTS:
            return MAX_NUM_RESULTS
        return value

    @validator('provider')
    def validate_provider(cls, value):
        """Validates that provider is supported"""
        if value not in SEARCH_PROVIDERS:
            return SEARCH_PROVIDERS[0]
        return value


class SearchResponse(BaseModel):
    """Schema for a web search response"""
    query: str
    results: List[SearchResultItem]
    total_results: int
    provider: str


class SearchSummaryRequest(BaseModel):
    """Schema for a request to summarize search results"""
    query: str
    results: List[SearchResultItem]
    max_length: Optional[int] = None

    @validator('max_length')
    def validate_max_length(cls, value):
        """Validates that max_length is within acceptable range"""
        if value is None:
            return None
        if value < 50:
            return 50
        if value > 500:
            return 500
        return value


class SearchSummaryResponse(BaseModel):
    """Schema for a response containing a summary of search results"""
    query: str
    summary: str
    num_results_used: int


class SearchMemoryRequest(BaseModel):
    """Schema for a request to store search results in memory"""
    query: str
    results: List[SearchResultItem]
    summary: str
    conversation_id: Optional[UUID] = None
    importance: Optional[int] = 2

    @validator('importance')
    def validate_importance(cls, value):
        """Validates that importance is within acceptable range"""
        if value is None:
            return 2  # default importance
        if value < 1:
            return 1
        if value > 5:
            return 5
        return value


class SearchMemoryResponse(BaseModel):
    """Schema for a response after storing search results in memory"""
    memory_id: str
    success: bool