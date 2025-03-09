"""
Context Manager for LLM interactions.

This module is responsible for managing the context window for LLM interactions,
handling the construction of prompts with appropriate context from memory,
conversation history, and other sources. It optimizes token usage and ensures
relevant information is included in prompts while maintaining context coherence.
"""

import logging
from typing import Dict, List, Optional, Any, Union

from .prompt_templates import (
    build_system_prompt,
    format_chat_messages,
    format_completion_prompt,
    CONTEXT_PROMPT,
    DOCUMENT_CONTEXT_PROMPT,
    WEB_CONTEXT_PROMPT,
    MEMORY_PROMPT
)
from .models.base import BaseLLMModel
from ..schemas.settings import PersonalitySettings
from ..config.settings import Settings
from ..utils.event_bus import EventBus

# Set up logger
logger = logging.getLogger(__name__)

# Global settings
settings = Settings()
DEFAULT_MAX_TOKENS = settings.get('llm.max_tokens', 1000)
DEFAULT_CONTEXT_RATIO = settings.get('llm.context_ratio', 0.75)
DEFAULT_SYSTEM_PROMPT_TOKENS = settings.get('llm.system_prompt_tokens', 200)
DEFAULT_USER_MESSAGE_TOKENS = settings.get('llm.user_message_tokens', 200)
DEFAULT_RESPONSE_TOKENS = settings.get('llm.response_tokens', 500)

# Event bus for publishing context-related events
event_bus = EventBus()


def estimate_tokens_for_text(text: str) -> int:
    """
    Estimates the number of tokens in a text string using a simple approximation.
    
    Args:
        text: The text to estimate token count for
        
    Returns:
        Estimated token count
    """
    if text is None or text == "":
        return 0
    
    # Simple approximation: split by whitespace and estimate tokens
    # Average English token is about 4 characters, and we add some overhead
    # for potential tokenization differences
    words = text.split()
    return int(len(words) * 1.3)


def truncate_text_to_token_limit(text: str, max_tokens: int, llm_model: Optional[BaseLLMModel] = None) -> str:
    """
    Truncates text to fit within a specified token limit.
    
    Args:
        text: The text to truncate
        max_tokens: Maximum number of tokens allowed
        llm_model: Optional LLM model for accurate token counting
        
    Returns:
        Truncated text that fits within token limit
    """
    if text is None or text == "":
        return ""
    
    # Get token count using model if available, otherwise estimate
    if llm_model:
        token_count = llm_model.get_token_count(text)
    else:
        token_count = estimate_tokens_for_text(text)
    
    # If already within limit, return unchanged
    if token_count <= max_tokens:
        return text
    
    # Split into paragraphs for more intelligent truncation
    paragraphs = text.split("\n\n")
    result_paragraphs = []
    current_tokens = 0
    
    for paragraph in paragraphs:
        if llm_model:
            paragraph_tokens = llm_model.get_token_count(paragraph)
        else:
            paragraph_tokens = estimate_tokens_for_text(paragraph)
        
        # If adding this paragraph would exceed limit, stop
        if current_tokens + paragraph_tokens > max_tokens - 10:  # Reserve 10 tokens for ellipsis
            break
        
        result_paragraphs.append(paragraph)
        current_tokens += paragraph_tokens
    
    truncated_text = "\n\n".join(result_paragraphs)
    
    # Add ellipsis if truncated
    if len(result_paragraphs) < len(paragraphs):
        truncated_text += "\n\n..."
    
    return truncated_text


def format_memory_items(memory_items: List[Dict[str, Any]]) -> str:
    """
    Formats memory items into a readable text format for inclusion in prompts.
    
    Args:
        memory_items: List of memory items with content and metadata
        
    Returns:
        Formatted memory text
    """
    if not memory_items:
        return ""
    
    formatted_items = []
    
    for item in memory_items:
        content = item.get("content", "")
        metadata = item.get("metadata", {})
        
        # Format each memory item as a bullet point
        memory_text = f"• {content}"
        
        # Add source information if available
        source_type = metadata.get("source_type", "")
        source_id = metadata.get("source_id", "")
        if source_type and source_id:
            memory_text += f" (Source: {source_type} {source_id})"
        
        # Add timestamp if available
        timestamp = metadata.get("timestamp", "")
        if timestamp:
            memory_text += f" - {timestamp}"
            
        formatted_items.append(memory_text)
    
    # Join all formatted items
    return "\n".join(formatted_items)


class ContextManager:
    """
    Manages context window for LLM interactions, optimizing token usage
    and ensuring relevant information is included in prompts.
    """
    
    def __init__(self, llm_model: BaseLLMModel, config: Optional[Dict[str, Any]] = None):
        """
        Initializes the context manager with an LLM model and configuration.
        
        Args:
            llm_model: The LLM model to use for token counting and limits
            config: Optional configuration overrides
        """
        self.llm_model = llm_model
        
        # Initialize with default config
        config = config or {}
        self.max_tokens = config.get('max_tokens', DEFAULT_MAX_TOKENS)
        self.context_ratio = config.get('context_ratio', DEFAULT_CONTEXT_RATIO)
        self.system_prompt_tokens = config.get('system_prompt_tokens', DEFAULT_SYSTEM_PROMPT_TOKENS)
        self.user_message_tokens = config.get('user_message_tokens', DEFAULT_USER_MESSAGE_TOKENS)
        self.response_tokens = config.get('response_tokens', DEFAULT_RESPONSE_TOKENS)
        
        logger.info(f"ContextManager initialized with model {llm_model.__class__.__name__}, "
                   f"max_tokens={self.max_tokens}, context_ratio={self.context_ratio}")
    
    def calculate_available_context_tokens(self) -> int:
        """
        Calculates the number of tokens available for context based on model limits
        and configuration.
        
        Returns:
            Number of tokens available for context
        """
        # Get model's maximum token limit
        model_max_tokens = self.llm_model.get_max_tokens()
        
        # Calculate tokens needed for system prompt, user message, and response
        reserved_tokens = self.system_prompt_tokens + self.user_message_tokens + self.response_tokens
        
        # Calculate available tokens for context
        available_tokens = model_max_tokens - reserved_tokens
        
        # Apply context ratio to limit context size
        context_tokens = int(available_tokens * self.context_ratio)
        
        logger.debug(f"Available context tokens: {context_tokens} " 
                    f"(model_max={model_max_tokens}, reserved={reserved_tokens})")
        
        return max(0, context_tokens)
    
    def build_prompt_with_context(
        self, 
        user_message: str, 
        memory_items: List[Dict[str, Any]], 
        personality_settings: PersonalitySettings,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a prompt that includes relevant context from memory.
        
        Args:
            user_message: The user's current message
            memory_items: List of relevant memory items to include
            personality_settings: Personality settings for response styling
            options: Optional parameters to control prompt construction
            
        Returns:
            Prompt structure with system prompt and formatted messages
        """
        options = options or {}
        
        # Calculate available tokens for context
        available_context_tokens = self.calculate_available_context_tokens()
        
        # Format memory items into text
        memory_text = format_memory_items(memory_items)
        
        # Format context using the context prompt template
        if memory_text:
            context_text = CONTEXT_PROMPT.format(context=memory_text)
            
            # Truncate context if needed
            context_text = truncate_text_to_token_limit(
                context_text, 
                available_context_tokens,
                self.llm_model
            )
        else:
            context_text = ""
        
        # Build system prompt with personality settings and context
        system_prompt = build_system_prompt(personality_settings, context_text)
        
        # Format messages for chat-based LLM
        messages = format_chat_messages(system_prompt, user_message)
        
        logger.info(f"Built prompt with context from {len(memory_items)} memory items, "
                   f"context length: {len(context_text)} chars")
        
        # Publish event with token usage stats
        event_bus.publish("context:built", {
            "memory_items_count": len(memory_items),
            "context_tokens": self.llm_model.get_token_count(context_text) if context_text else 0,
            "system_prompt_tokens": self.llm_model.get_token_count(system_prompt),
            "total_tokens": self.llm_model.get_token_count("\n".join([msg["content"] for msg in messages]))
        })
        
        return {
            "system_prompt": system_prompt,
            "messages": messages
        }
    
    def build_document_context_prompt(
        self,
        user_message: str,
        document_content: str,
        personality_settings: PersonalitySettings,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a prompt that includes document content as context.
        
        Args:
            user_message: The user's current message
            document_content: The document content to include as context
            personality_settings: Personality settings for response styling
            options: Optional parameters to control prompt construction
            
        Returns:
            Prompt structure with system prompt and formatted messages
        """
        options = options or {}
        
        # Calculate available tokens for context
        available_context_tokens = self.calculate_available_context_tokens()
        
        # Truncate document content if needed
        truncated_content = truncate_text_to_token_limit(
            document_content,
            available_context_tokens,
            self.llm_model
        )
        
        # Format document context using the document context prompt template
        document_context = DOCUMENT_CONTEXT_PROMPT.format(document_content=truncated_content)
        
        # Build system prompt with personality settings and document context
        system_prompt = build_system_prompt(personality_settings, document_context)
        
        # Format messages for chat-based LLM
        messages = format_chat_messages(system_prompt, user_message)
        
        logger.info(f"Built document context prompt with {len(truncated_content)} chars of document content")
        
        # Publish event with token usage stats
        event_bus.publish("context:document_built", {
            "document_content_length": len(document_content),
            "truncated_content_length": len(truncated_content),
            "context_tokens": self.llm_model.get_token_count(document_context),
            "system_prompt_tokens": self.llm_model.get_token_count(system_prompt),
            "total_tokens": self.llm_model.get_token_count("\n".join([msg["content"] for msg in messages]))
        })
        
        return {
            "system_prompt": system_prompt,
            "messages": messages
        }
    
    def build_web_context_prompt(
        self,
        user_message: str,
        web_content: str,
        personality_settings: PersonalitySettings,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a prompt that includes web content as context.
        
        Args:
            user_message: The user's current message
            web_content: The web content to include as context
            personality_settings: Personality settings for response styling
            options: Optional parameters to control prompt construction
            
        Returns:
            Prompt structure with system prompt and formatted messages
        """
        options = options or {}
        
        # Calculate available tokens for context
        available_context_tokens = self.calculate_available_context_tokens()
        
        # Truncate web content if needed
        truncated_content = truncate_text_to_token_limit(
            web_content,
            available_context_tokens,
            self.llm_model
        )
        
        # Format web context using the web context prompt template
        web_context = WEB_CONTEXT_PROMPT.format(web_content=truncated_content)
        
        # Build system prompt with personality settings and web context
        system_prompt = build_system_prompt(personality_settings, web_context)
        
        # Format messages for chat-based LLM
        messages = format_chat_messages(system_prompt, user_message)
        
        logger.info(f"Built web context prompt with {len(truncated_content)} chars of web content")
        
        # Publish event with token usage stats
        event_bus.publish("context:web_built", {
            "web_content_length": len(web_content),
            "truncated_content_length": len(truncated_content),
            "context_tokens": self.llm_model.get_token_count(web_context),
            "system_prompt_tokens": self.llm_model.get_token_count(system_prompt),
            "total_tokens": self.llm_model.get_token_count("\n".join([msg["content"] for msg in messages]))
        })
        
        return {
            "system_prompt": system_prompt,
            "messages": messages
        }
    
    def build_conversation_history_prompt(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]],
        personality_settings: PersonalitySettings,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a prompt that includes conversation history.
        
        Args:
            user_message: The user's current message
            conversation_history: Previous messages in the conversation
            personality_settings: Personality settings for response styling
            options: Optional parameters to control prompt construction
            
        Returns:
            Prompt structure with system prompt and formatted messages
        """
        options = options or {}
        
        # Calculate available tokens for context
        available_context_tokens = self.calculate_available_context_tokens()
        
        # Build system prompt with personality settings
        system_prompt = build_system_prompt(personality_settings)
        
        # Estimate tokens for each message in conversation history
        message_tokens = []
        for msg in conversation_history:
            content = msg.get("content", "")
            token_count = self.llm_model.get_token_count(content)
            message_tokens.append((msg, token_count))
        
        # Select messages that fit within available context tokens
        # Start from most recent (end of the list) and work backwards
        included_messages = []
        total_tokens = 0
        
        for msg, tokens in reversed(message_tokens):
            if total_tokens + tokens <= available_context_tokens:
                included_messages.insert(0, msg)  # Insert at beginning to maintain order
                total_tokens += tokens
            else:
                break
        
        # Format messages for chat-based LLM
        messages = format_chat_messages(system_prompt, user_message, included_messages)
        
        logger.info(f"Built conversation history prompt with {len(included_messages)} " 
                   f"of {len(conversation_history)} messages")
        
        # Publish event with token usage stats
        event_bus.publish("context:history_built", {
            "total_history_messages": len(conversation_history),
            "included_messages": len(included_messages),
            "history_tokens": total_tokens,
            "system_prompt_tokens": self.llm_model.get_token_count(system_prompt),
            "total_tokens": self.llm_model.get_token_count("\n".join([msg["content"] for msg in messages]))
        })
        
        return {
            "system_prompt": system_prompt,
            "messages": messages
        }
    
    def build_combined_context_prompt(
        self,
        user_message: str,
        memory_items: Optional[List[Dict[str, Any]]] = None,
        document_content: Optional[str] = None,
        web_content: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        personality_settings: PersonalitySettings = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds a prompt that combines multiple context sources.
        
        Args:
            user_message: The user's current message
            memory_items: Optional list of memory items
            document_content: Optional document content
            web_content: Optional web content
            conversation_history: Optional conversation history
            personality_settings: Personality settings for response styling
            options: Optional parameters to control prompt construction
            
        Returns:
            Prompt structure with system prompt and formatted messages
        """
        options = options or {}
        memory_items = memory_items or []
        conversation_history = conversation_history or []
        
        # Calculate available tokens for context
        available_context_tokens = self.calculate_available_context_tokens()
        
        # Allocate tokens for each context source based on priority and availability
        # Default allocation ratios (can be overridden in options)
        memory_ratio = options.get("memory_ratio", 0.3)
        document_ratio = options.get("document_ratio", 0.3)
        web_ratio = options.get("web_ratio", 0.2)
        history_ratio = options.get("history_ratio", 0.2)
        
        # Adjust ratios based on which context sources are available
        total_ratio = 0
        if memory_items:
            total_ratio += memory_ratio
        if document_content:
            total_ratio += document_ratio
        if web_content:
            total_ratio += web_ratio
        if conversation_history:
            total_ratio += history_ratio
        
        # Normalize ratios if needed
        if total_ratio > 0:
            if memory_items:
                memory_ratio = memory_ratio / total_ratio
            if document_content:
                document_ratio = document_ratio / total_ratio
            if web_content:
                web_ratio = web_ratio / total_ratio
            if conversation_history:
                history_ratio = history_ratio / total_ratio
        
        # Calculate token allocations
        memory_tokens = int(available_context_tokens * memory_ratio) if memory_items else 0
        document_tokens = int(available_context_tokens * document_ratio) if document_content else 0
        web_tokens = int(available_context_tokens * web_ratio) if web_content else 0
        history_tokens = int(available_context_tokens * history_ratio) if conversation_history else 0
        
        # Format and truncate each context source
        context_parts = []
        
        # Memory context
        if memory_items and memory_tokens > 0:
            memory_text = format_memory_items(memory_items)
            if memory_text:
                memory_context = MEMORY_PROMPT.format(memories=memory_text)
                memory_context = truncate_text_to_token_limit(memory_context, memory_tokens, self.llm_model)
                context_parts.append(memory_context)
        
        # Document context
        if document_content and document_tokens > 0:
            truncated_document = truncate_text_to_token_limit(document_content, document_tokens, self.llm_model)
            document_context = DOCUMENT_CONTEXT_PROMPT.format(document_content=truncated_document)
            context_parts.append(document_context)
        
        # Web context
        if web_content and web_tokens > 0:
            truncated_web = truncate_text_to_token_limit(web_content, web_tokens, self.llm_model)
            web_context = WEB_CONTEXT_PROMPT.format(web_content=truncated_web)
            context_parts.append(web_context)
        
        # Combine all context parts
        combined_context = "\n\n".join(context_parts) if context_parts else ""
        
        # Build system prompt with combined context
        system_prompt = build_system_prompt(personality_settings, combined_context)
        
        # Handle conversation history
        included_messages = []
        if conversation_history and history_tokens > 0:
            # Estimate tokens for each message in conversation history
            message_tokens = []
            for msg in conversation_history:
                content = msg.get("content", "")
                token_count = self.llm_model.get_token_count(content)
                message_tokens.append((msg, token_count))
            
            # Select messages that fit within history token allocation
            total_tokens = 0
            for msg, tokens in reversed(message_tokens):
                if total_tokens + tokens <= history_tokens:
                    included_messages.insert(0, msg)  # Insert at beginning to maintain order
                    total_tokens += tokens
                else:
                    break
        
        # Format messages for chat-based LLM
        messages = format_chat_messages(system_prompt, user_message, included_messages)
        
        logger.info(f"Built combined context prompt with {len(memory_items)} memory items, "
                  f"{len(document_content or '')} chars of document content, "
                  f"{len(web_content or '')} chars of web content, "
                  f"{len(included_messages)} of {len(conversation_history)} messages")
        
        # Publish event with token usage stats
        event_bus.publish("context:combined_built", {
            "memory_items_count": len(memory_items),
            "document_content_length": len(document_content or ""),
            "web_content_length": len(web_content or ""),
            "included_messages": len(included_messages),
            "total_history_messages": len(conversation_history),
            "context_tokens": self.llm_model.get_token_count(combined_context) if combined_context else 0,
            "system_prompt_tokens": self.llm_model.get_token_count(system_prompt),
            "total_tokens": self.llm_model.get_token_count("\n".join([msg["content"] for msg in messages]))
        })
        
        return {
            "system_prompt": system_prompt,
            "messages": messages
        }
    
    def update_model(self, new_model: BaseLLMModel) -> None:
        """
        Updates the LLM model used by the context manager.
        
        Args:
            new_model: The new LLM model to use
        """
        self.llm_model = new_model
        logger.info(f"Updated context manager model to {new_model.__class__.__name__}")
    
    def update_config(self, new_config: Dict[str, Any]) -> None:
        """
        Updates the configuration settings for the context manager.
        
        Args:
            new_config: New configuration settings
        """
        if 'max_tokens' in new_config:
            self.max_tokens = new_config['max_tokens']
        
        if 'context_ratio' in new_config:
            self.context_ratio = new_config['context_ratio']
        
        if 'system_prompt_tokens' in new_config:
            self.system_prompt_tokens = new_config['system_prompt_tokens']
        
        if 'user_message_tokens' in new_config:
            self.user_message_tokens = new_config['user_message_tokens']
        
        if 'response_tokens' in new_config:
            self.response_tokens = new_config['response_tokens']
        
        logger.info(f"Updated context manager config: max_tokens={self.max_tokens}, "
                   f"context_ratio={self.context_ratio}")