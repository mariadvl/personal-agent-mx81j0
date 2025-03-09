"""
LLM (Large Language Model) module for the Personal AI Agent.

This module provides a unified interface for language model interactions,
context management, and prompt templating. It serves as the entry point for
other parts of the application to access LLM functionality.
"""

import logging

# Import core LLM model implementations
from .models.base import BaseLLMModel
from .models.openai import OpenAIModel
from .models.local_llm import LocalLLMModel

# Import context management utilities
from .context_manager import (
    ContextManager,
    estimate_tokens_for_text as estimate_prompt_tokens,
    truncate_text_to_token_limit,
    format_memory_items as format_context_for_prompt
)

# Import prompt templates and utilities
from .prompt_templates import (
    BASE_SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT,
    get_personality_prompt,
    build_system_prompt,
    format_chat_messages,
    format_document_context as build_document_prompt,
    format_web_context as build_web_search_prompt,
    format_memory_context as build_memory_augmented_prompt
)

# Set up logger
logger = logging.getLogger(__name__)

# Module version
__version__ = "0.1.0"

# The module exports these components as its public API
# LLM Models
BaseLLMModel  # Abstract base class for LLM model implementations
OpenAIModel  # OpenAI implementation of the LLM model interface
LocalLLMModel  # Local LLM implementation for privacy-focused operation

# Context Management
ContextManager  # Manages context window for LLM interactions
format_context_for_prompt  # Format context items for inclusion in prompts
estimate_prompt_tokens  # Estimate token count for prompts with context

# Prompt Templates and Utilities
DEFAULT_SYSTEM_PROMPT  # Default system prompt for the AI assistant
get_personality_prompt  # Generate personality-specific prompts based on settings
build_system_prompt  # Build complete system prompts with personality and context
format_chat_messages  # Format conversations for chat-based LLM APIs
build_document_prompt  # Create prompts for document-related queries
build_web_search_prompt  # Create prompts that incorporate web search results
build_memory_augmented_prompt  # Create prompts that incorporate user memories for personalization