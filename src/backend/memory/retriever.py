import logging
from typing import Dict, List, Optional, Any
import heapq
from datetime import datetime
import uuid
import json

from .storage import MemoryStorage
from ..config.settings import Settings
from ..utils.event_bus import EventBus
from ..utils.embeddings import cosine_similarity, get_embedding_dimension
from ..llm.context_manager import estimate_tokens_for_text, truncate_text_to_token_limit

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
DEFAULT_MEMORY_LIMIT = settings.get('memory.search_limit', 50)
DEFAULT_CONTEXT_WINDOW_SIZE = settings.get('memory.context_window_size', 10)
DEFAULT_TOKEN_LIMIT = settings.get('memory.token_limit', 2000)
SIMILARITY_WEIGHT = settings.get('memory.similarity_weight', 0.65)
RECENCY_WEIGHT = settings.get('memory.recency_weight', 0.25)
IMPORTANCE_WEIGHT = settings.get('memory.importance_weight', 0.1)
event_bus = EventBus()


def calculate_recency_score(timestamp: datetime, now: datetime) -> float:
    """
    Calculates a recency score for a memory item based on its creation timestamp

    Args:
        timestamp: The datetime object representing the creation time of the memory item
        now: The current datetime

    Returns:
        Recency score between 0 and 1, with 1 being most recent
    """
    try:
        # Calculate time difference between now and timestamp
        time_difference = now - timestamp

        # Convert time difference to hours
        hours = time_difference.total_seconds() / 3600

        # Apply decay function: 1 / (1 + hours / 24)
        recency_score = 1 / (1 + hours / 24)

        # Return recency score between 0 and 1
        return max(0.0, min(1.0, recency_score))
    except Exception as e:
        logger.error(f"Error calculating recency score: {str(e)}")
        return 0.0


def calculate_combined_score(similarity_score: float, recency_score: float, importance: int) -> float:
    """
    Calculates a combined score for a memory item based on similarity, recency, and importance

    Args:
        similarity_score: The similarity score between the query and the memory item
        recency_score: The recency score of the memory item
        importance: The importance rating of the memory item

    Returns:
        Combined score between 0 and 1
    """
    try:
        # Normalize importance to a 0-1 scale (importance / 5)
        normalized_importance = importance / 5.0

        # Calculate weighted sum using SIMILARITY_WEIGHT, RECENCY_WEIGHT, and IMPORTANCE_WEIGHT
        combined_score = (SIMILARITY_WEIGHT * similarity_score) + \
                         (RECENCY_WEIGHT * recency_score) + \
                         (IMPORTANCE_WEIGHT * normalized_importance)

        # Return combined score between 0 and 1
        return max(0.0, min(1.0, combined_score))
    except Exception as e:
        logger.error(f"Error calculating combined score: {str(e)}")
        return 0.0


def format_memory_for_context(memory_item: Dict) -> str:
    """
    Formats a memory item for inclusion in the context

    Args:
        memory_item: The memory item to format

    Returns:
        Formatted memory text
    """
    try:
        # Extract content, category, and metadata from memory_item
        content = memory_item.get("content", "")
        category = memory_item.get("category", "")
        metadata = memory_item.get("metadata", {})

        # Format as a readable text entry
        memory_text = f"{content} (Category: {category})"

        # Include source information if available
        source_type = metadata.get("source_type", "")
        source_id = metadata.get("source_id", "")
        if source_type and source_id:
            memory_text += f" - Source: {source_type} {source_id}"

        # Include timestamp in human-readable format
        timestamp = metadata.get("timestamp", "")
        if timestamp:
            try:
                timestamp_datetime = datetime.fromisoformat(timestamp)
                formatted_timestamp = timestamp_datetime.strftime("%Y-%m-%d %H:%M:%S")
                memory_text += f" - {formatted_timestamp}"
            except ValueError:
                logger.warning(f"Invalid timestamp format: {timestamp}")

        # Return formatted text
        return memory_text
    except Exception as e:
        logger.error(f"Error formatting memory item: {str(e)}")
        return ""


def format_context_string(memory_items: List[Dict], format_type: str, token_limit: Optional[int] = None) -> str:
    """
    Formats a list of memory items into a context string for the LLM

    Args:
        memory_items: List of memory items to format
        format_type: Type of formatting to apply
        token_limit: Optional token limit for the context string

    Returns:
        Formatted context string
    """
    try:
        # Set default token_limit if not provided
        if token_limit is None:
            token_limit = DEFAULT_TOKEN_LIMIT

        # Initialize empty context string
        context_string = ""

        # For each memory item, format using format_memory_for_context
        for memory_item in memory_items:
            formatted_memory = format_memory_for_context(memory_item)
            context_string += formatted_memory + "\n"

        # Estimate token count of context string
        token_count = estimate_tokens_for_text(context_string)

        # If exceeding token_limit, truncate using truncate_text_to_token_limit
        if token_count > token_limit:
            context_string = truncate_text_to_token_limit(context_string, token_limit)

        # Return formatted context string
        return context_string
    except Exception as e:
        logger.error(f"Error formatting context string: {str(e)}")
        return ""


class MemoryRetriever:
    """
    Retrieves and ranks memory items based on relevance to a query
    """

    def __init__(self, memory_storage: MemoryStorage):
        """
        Initializes the memory retriever with a memory storage instance

        Args:
            memory_storage: The memory storage instance to use for retrieval
        """
        self.memory_storage = memory_storage
        logger.info("MemoryRetriever initialized")

    async def retrieve_context(self, query: str, filters: Optional[dict] = None, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieves relevant memory items based on a query

        Args:
            query: The query string
            filters: Optional filters to apply to the memory items
            limit: Optional limit on the number of memory items to retrieve

        Returns:
            List of relevant memory items
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_MEMORY_LIMIT

            # Set default filters if not provided
            if filters is None:
                filters = {}

            # Call memory_storage.search_by_content with query, filters, and increased limit
            memory_items = await self.memory_storage.search_by_content(query, filters, limit * 3)

            # Get current timestamp for recency calculation
            now = datetime.now()

            # For each result, calculate recency score and combined score
            for item in memory_items:
                # Calculate recency score from timestamp
                timestamp_str = item.get("created_at")
                if timestamp_str:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str)
                        item["recency_score"] = calculate_recency_score(timestamp, now)
                    except ValueError:
                        logger.warning(f"Invalid timestamp format: {timestamp_str}")
                        item["recency_score"] = 0.0
                else:
                    item["recency_score"] = 0.0

                # Get importance value (default to 1 if not present)
                importance = item.get("importance", 1)

                # Calculate similarity score
                similarity_score = item.get("relevance", 0.0)

                # Calculate combined score using weights
                item["combined_score"] = calculate_combined_score(similarity_score, item["recency_score"], importance)

            # Sort results by combined score in descending order
            ranked_memory_items = sorted(memory_items, key=lambda x: x.get("combined_score", 0.0), reverse=True)

            # Take top 'limit' results
            top_memory_items = ranked_memory_items[:limit]

            # Publish memory:context_retrieved event with retrieval details
            event_bus.publish("memory:context_retrieved", {
                "query": query,
                "filter_count": len(filters),
                "result_count": len(top_memory_items)
            })

            # Return the ranked memory items
            return top_memory_items
        except Exception as e:
            logger.error(f"Error retrieving context: {str(e)}")
            return []

    async def retrieve_by_vector(self, query_vector: List[float], filters: Optional[dict] = None, limit: Optional[int] = None) -> List[Dict]:
        """
        Retrieves relevant memory items based on a query vector

        Args:
            query_vector: The query vector
            filters: Optional filters to apply to the memory items
            limit: Optional limit on the number of memory items to retrieve

        Returns:
            List of relevant memory items
        """
        try:
            # Set default limit if not provided
            if limit is None:
                limit = DEFAULT_MEMORY_LIMIT

            # Set default filters if not provided
            if filters is None:
                filters = {}

            # Call memory_storage.search_by_vector with query_vector, filters, and increased limit
            memory_items = await self.memory_storage.search_by_vector(query_vector, filters, limit * 3)

            # Get current timestamp for recency calculation
            now = datetime.now()

            # For each result, calculate recency score and combined score
            for item in memory_items:
                # Calculate recency score from timestamp
                timestamp_str = item.get("created_at")
                if timestamp_str:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str)
                        item["recency_score"] = calculate_recency_score(timestamp, now)
                    except ValueError:
                        logger.warning(f"Invalid timestamp format: {timestamp_str}")
                        item["recency_score"] = 0.0
                else:
                    item["recency_score"] = 0.0

                # Get importance value (default to 1 if not present)
                importance = item.get("importance", 1)

                # Calculate similarity score
                similarity_score = item.get("relevance", 0.0)

                # Calculate combined score using weights
                item["combined_score"] = calculate_combined_score(similarity_score, item["recency_score"], importance)

            # Sort results by combined score in descending order
            ranked_memory_items = sorted(memory_items, key=lambda x: x.get("combined_score", 0.0), reverse=True)

            # Take top 'limit' results
            top_memory_items = ranked_memory_items[:limit]

            # Publish memory:vector_retrieved event with retrieval details
            event_bus.publish("memory:vector_retrieved", {
                "filter_count": len(filters),
                "result_count": len(top_memory_items)
            })

            # Return the ranked memory items
            return top_memory_items
        except Exception as e:
            logger.error(f"Error retrieving by vector: {str(e)}")
            return []

    async def retrieve_by_category(self, category: str, query: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by category with relevance ranking

        Args:
            category: The category to retrieve
            query: Optional query to search within the category
            limit: Optional limit on the number of memory items to retrieve
            offset: Optional offset for pagination

        Returns:
            List of memory items in the category
        """
        try:
            # Set default limit and offset if not provided
            if limit is None:
                limit = DEFAULT_MEMORY_LIMIT
            if offset is None:
                offset = 0

            # Create filters dictionary with category
            filters = {"category": category}

            # If query is provided, search by content with category filter
            if query:
                memory_items = await self.memory_storage.search_by_content(query, filters, limit)
            # If no query, search by metadata with category filter
            else:
                memory_items = await self.memory_storage.search_by_metadata(filters, limit, offset)

            # If query was provided, rank results by relevance
            if query:
                memory_items = await self.rank_results(memory_items, query)

            # Return the memory items
            return memory_items
        except Exception as e:
            logger.error(f"Error retrieving by category: {str(e)}")
            return []

    async def retrieve_by_source(self, source_type: str, source_id: uuid.UUID, query: Optional[str] = None, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict]:
        """
        Retrieves memory items by source with relevance ranking

        Args:
            source_type: The type of source
            source_id: The ID of the source
            query: Optional query to search within the source
            limit: Optional limit on the number of memory items to retrieve
            offset: Optional offset for pagination

        Returns:
            List of memory items from the source
        """
        try:
            # Set default limit and offset if not provided
            if limit is None:
                limit = DEFAULT_MEMORY_LIMIT
            if offset is None:
                offset = 0

            # Create filters dictionary with source_type and source_id
            filters = {
                "source_type": source_type,
                "source_id": str(source_id)
            }

            # If query is provided, search by content with source filter
            if query:
                memory_items = await self.memory_storage.search_by_content(query, filters, limit)
            # If no query, search by metadata with source filter
            else:
                memory_items = await self.memory_storage.search_by_metadata(filters, limit, offset)

            # If query was provided, rank results by relevance
            if query:
                memory_items = await self.rank_results(memory_items, query)

            # Return the memory items
            return memory_items
        except Exception as e:
            logger.error(f"Error retrieving by source: {str(e)}")
            return []

    async def format_context_for_llm(self, memory_items: List[Dict], format_type: Optional[str] = None, token_limit: Optional[int] = None) -> str:
        """
        Formats retrieved memory items into a context string for the LLM

        Args:
            memory_items: List of memory items to format
            format_type: Optional format type
            token_limit: Optional token limit

        Returns:
            Formatted context string
        """
        try:
            # Set default format_type to 'default' if not provided
            if format_type is None:
                format_type = "default"

            # Set default token_limit to DEFAULT_TOKEN_LIMIT if not provided
            if token_limit is None:
                token_limit = DEFAULT_TOKEN_LIMIT

            # Call format_context_string with memory_items, format_type, and token_limit
            context_string = format_context_string(memory_items, format_type, token_limit)

            # Return the formatted context string
            return context_string
        except Exception as e:
            logger.error(f"Error formatting context for LLM: {str(e)}")
            return ""

    async def rank_results(self, memory_items: List[Dict], query: Optional[str] = None) -> List[Dict]:
        """
        Ranks memory items based on similarity, recency, and importance

        Args:
            memory_items: List of memory items to rank
            query: Optional query to use for similarity ranking

        Returns:
            Ranked memory items
        """
        try:
            # Get current timestamp for recency calculation
            now = datetime.now()

            # If query is provided, generate embedding for ranking by similarity
            if query:
                query_embedding = await self.memory_storage.generate_embedding(query)
            else:
                query_embedding = None

            # For each memory item:
            for item in memory_items:
                # Calculate recency score from timestamp
                timestamp_str = item.get("created_at")
                if timestamp_str:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str)
                        item["recency_score"] = calculate_recency_score(timestamp, now)
                    except ValueError:
                        logger.warning(f"Invalid timestamp format: {timestamp_str}")
                        item["recency_score"] = 0.0
                else:
                    item["recency_score"] = 0.0

                # Get importance value (default to 1 if not present)
                importance = item.get("importance", 1)

                # If query provided, calculate similarity score
                if query_embedding:
                    item_embedding = item.get("embedding")
                    if item_embedding:
                        item["similarity_score"] = cosine_similarity(query_embedding, item_embedding)
                    else:
                        item["similarity_score"] = 0.0
                else:
                    item["similarity_score"] = 0.0

                # Calculate combined score using weights
                item["combined_score"] = calculate_combined_score(item["similarity_score"], item["recency_score"], importance)

            # Sort memory items by score in descending order
            ranked_memory_items = sorted(memory_items, key=lambda x: x.get("combined_score", 0.0), reverse=True)

            # Return the ranked memory items
            return ranked_memory_items
        except Exception as e:
            logger.error(f"Error ranking results: {str(e)}")
            return memory_items


class ConversationContextManager:
    """
    Manages conversation context by retrieving and maintaining relevant memory items
    """

    def __init__(self, memory_retriever: MemoryRetriever, context_window_size: Optional[int] = None):
        """
        Initializes the conversation context manager

        Args:
            memory_retriever: The memory retriever instance to use for retrieving context
            context_window_size: Optional size of the context window (number of memory items)
        """
        self.memory_retriever = memory_retriever
        self.context_window_size = context_window_size or DEFAULT_CONTEXT_WINDOW_SIZE
        self._conversation_contexts: Dict[str, List[Dict]] = {}
        logger.info("ConversationContextManager initialized")

    async def get_context(self, conversation_id: str, query: str) -> str:
        """
        Gets the current context for a conversation, retrieving new context if needed

        Args:
            conversation_id: The ID of the conversation
            query: The current query string

        Returns:
            Formatted context string for the LLM
        """
        try:
            # Check if conversation_id exists in _conversation_contexts
            if conversation_id not in self._conversation_contexts:
                # If not, initialize empty context for the conversation
                self._conversation_contexts[conversation_id] = []

            # Retrieve additional context based on query
            new_items = await self.memory_retriever.retrieve_context(query, {"conversation_id": conversation_id}, self.context_window_size)

            # Merge with existing context, prioritizing by relevance
            merged_context = self._merge_contexts(self._conversation_contexts[conversation_id], new_items)

            # Limit to context_window_size items
            limited_context = merged_context[:self.context_window_size]

            # Update stored context for the conversation
            self._conversation_contexts[conversation_id] = limited_context

            # Format context for LLM using memory_retriever.format_context_for_llm
            context_string = await self.memory_retriever.format_context_for_llm(limited_context)

            # Return the formatted context string
            return context_string
        except Exception as e:
            logger.error(f"Error getting context for conversation {conversation_id}: {str(e)}")
            return ""

    async def update_context(self, conversation_id: str, memory_items: List[Dict]):
        """
        Updates the context for a conversation with new memory items

        Args:
            conversation_id: The ID of the conversation
            memory_items: List of new memory items to add to the context
        """
        try:
            # Check if conversation_id exists in _conversation_contexts
            if conversation_id not in self._conversation_contexts:
                # If not, initialize empty context for the conversation
                self._conversation_contexts[conversation_id] = []

            # Merge new memory items with existing context
            merged_context = self._merge_contexts(self._conversation_contexts[conversation_id], memory_items)

            # Rank the combined items by relevance
            # ranked_context = await self.memory_retriever.rank_results(merged_context)

            # Limit to context_window_size items
            limited_context = merged_context[:self.context_window_size]

            # Update stored context for the conversation
            self._conversation_contexts[conversation_id] = limited_context

            logger.info(f"Updated context for conversation {conversation_id} with {len(memory_items)} new items")
        except Exception as e:
            logger.error(f"Error updating context for conversation {conversation_id}: {str(e)}")

    async def clear_context(self, conversation_id: str) -> bool:
        """
        Clears the context for a specific conversation

        Args:
            conversation_id: The ID of the conversation to clear

        Returns:
            True if context was cleared, False if not found
        """
        try:
            # Check if conversation_id exists in _conversation_contexts
            if conversation_id in self._conversation_contexts:
                # If found, remove the conversation context and return True
                del self._conversation_contexts[conversation_id]
                logger.info(f"Cleared context for conversation {conversation_id}")
                return True
            else:
                # If not found, return False
                return False
        except Exception as e:
            logger.error(f"Error clearing context for conversation {conversation_id}: {str(e)}")
            return False

    def _merge_contexts(self, existing_context: List[Dict], new_items: List[Dict]) -> List[Dict]:
        """
        Merges existing context with new memory items, avoiding duplicates

        Args:
            existing_context: List of existing memory items in the context
            new_items: List of new memory items to add

        Returns:
            Merged context items
        """
        try:
            # Create a set of existing memory IDs
            existing_ids = {item["id"] for item in existing_context}

            # Initialize merged list with existing context
            merged_list = existing_context[:]

            # For each new item, check if its ID is already in the context
            for item in new_items:
                if item["id"] not in existing_ids:
                    # If not a duplicate, add to merged list
                    merged_list.append(item)

            # Return the merged list
            return merged_list
        except Exception as e:
            logger.error(f"Error merging contexts: {str(e)}")
            return existing_context