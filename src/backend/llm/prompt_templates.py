"""
Module for prompt templates and formatting for LLM interactions.

This module provides standardized templates and utility functions for creating
prompts that incorporate personality settings, contextual information, and
memory retrieval for the Personal AI Agent.
"""

import logging
from typing import Dict, List, Optional, Any, Union

from ..schemas.settings import PersonalitySettings

# Setup logger
logger = logging.getLogger(__name__)

# Base system prompt
BASE_SYSTEM_PROMPT = "You are a helpful, private AI assistant. You prioritize user privacy and store all information locally on the user's device. You aim to be informative, relevant, and engaging while respecting the user's preferences."

# Context prompt templates
CONTEXT_PROMPT = """I'll provide you with some relevant information from my memory that might help with your request:

{context}

Please use this information to inform your response when relevant."""

DOCUMENT_CONTEXT_PROMPT = """I'll provide you with content from a document that you asked about:

{document_content}

Please use this document content to inform your response."""

WEB_CONTEXT_PROMPT = """I'll provide you with content from a web page that might be relevant to your request:

{web_content}

Please use this web content to inform your response when relevant."""

MEMORY_PROMPT = """Here are some relevant memories that might help with your request:

{memories}

Please use these memories to inform your response when relevant."""

# Personality prompts
STYLE_PROMPTS = {
    "helpful": "You are a helpful assistant focused on providing accurate and useful information.",
    "professional": "You are a professional assistant with a formal tone, focused on efficiency and accuracy.",
    "friendly": "You are a friendly and conversational assistant who builds rapport while being helpful.",
    "concise": "You are a concise assistant who provides brief, to-the-point responses.",
    "detailed": "You are a detailed assistant who provides comprehensive and thorough responses."
}

FORMALITY_PROMPTS = {
    "casual": "Use a casual, conversational tone with relaxed language.",
    "neutral": "Use a balanced, neutral tone that is neither too formal nor too casual.",
    "formal": "Use a formal tone with proper language and professional phrasing."
}

VERBOSITY_PROMPTS = {
    "minimal": "Keep your responses brief and to the point.",
    "balanced": "Provide moderately detailed responses that balance brevity and thoroughness.",
    "detailed": "Provide comprehensive, detailed responses that thoroughly address all aspects of the query."
}

EMPATHY_PROMPTS = {
    "none": "",
    "minimal": "Show basic understanding of user's feelings when appropriate.",
    "light": "Be somewhat empathetic to the user's situation and feelings.",
    "medium": "Show clear empathy and understanding of the user's perspective.",
    "high": "Prioritize emotional intelligence and deep empathy in your responses."
}

HUMOR_PROMPTS = {
    "none": "",
    "minimal": "Occasionally use mild humor when appropriate.",
    "light": "Incorporate light humor in your responses when it fits naturally.",
    "medium": "Be moderately humorous and conversational.",
    "high": "Use humor frequently to create an engaging conversation."
}

CREATIVITY_PROMPTS = {
    "none": "",
    "minimal": "Focus on factual information with minimal creative elements.",
    "light": "Add light creative elements to your responses when appropriate.",
    "medium": "Balance factual information with creative expression.",
    "high": "Emphasize creative and original thinking in your responses."
}


def build_system_prompt(personality_settings: PersonalitySettings, context: Optional[str] = None) -> str:
    """
    Build a complete system prompt based on personality settings and optional context.
    
    Args:
        personality_settings: The personality settings to use for customization
        context: Optional additional context to include in the prompt
        
    Returns:
        Formatted system prompt with personality traits and context
    """
    # Start with base prompt
    prompt_parts = [BASE_SYSTEM_PROMPT]
    
    # Add personality components
    prompt_parts.append(STYLE_PROMPTS.get(personality_settings.style, STYLE_PROMPTS["helpful"]))
    prompt_parts.append(FORMALITY_PROMPTS.get(personality_settings.formality, FORMALITY_PROMPTS["neutral"]))
    prompt_parts.append(VERBOSITY_PROMPTS.get(personality_settings.verbosity, VERBOSITY_PROMPTS["balanced"]))
    
    # Add optional personality components
    if personality_settings.empathy != "none" and personality_settings.empathy in EMPATHY_PROMPTS:
        prompt_parts.append(EMPATHY_PROMPTS[personality_settings.empathy])
    
    if personality_settings.humor != "none" and personality_settings.humor in HUMOR_PROMPTS:
        prompt_parts.append(HUMOR_PROMPTS[personality_settings.humor])
    
    if personality_settings.creativity != "none" and personality_settings.creativity in CREATIVITY_PROMPTS:
        prompt_parts.append(CREATIVITY_PROMPTS[personality_settings.creativity])
    
    # Add context if provided
    if context:
        prompt_parts.append(context)
    
    # Join all parts with newlines
    return "\n\n".join(prompt_parts)


def format_chat_messages(system_prompt: str, user_message: str, 
                         conversation_history: Optional[List[Dict[str, str]]] = None) -> List[Dict[str, str]]:
    """
    Format conversation messages for chat-based LLM APIs like OpenAI.
    
    Args:
        system_prompt: The system prompt including personality settings
        user_message: The current user message
        conversation_history: Optional list of previous messages
        
    Returns:
        Formatted messages for chat API
    """
    messages = [{"role": "system", "content": system_prompt}]
    
    # Add conversation history if provided
    if conversation_history:
        messages.extend(conversation_history)
    
    # Add current user message
    messages.append({"role": "user", "content": user_message})
    
    return messages


def format_completion_prompt(system_prompt: str, user_message: str,
                            conversation_history: Optional[List[Dict[str, str]]] = None) -> str:
    """
    Format a prompt for completion-based LLM APIs.
    
    Args:
        system_prompt: The system prompt including personality settings
        user_message: The current user message
        conversation_history: Optional list of previous messages
        
    Returns:
        Formatted prompt string
    """
    prompt = system_prompt + "\n\n"
    
    # Add conversation history if provided
    if conversation_history:
        for message in conversation_history:
            role = message.get("role", "")
            content = message.get("content", "")
            
            if role == "user":
                prompt += f"Human: {content}\n"
            elif role == "assistant":
                prompt += f"AI: {content}\n"
    
    # Add current user message and AI prefix for completion
    prompt += f"Human: {user_message}\nAI: "
    
    return prompt


def format_memory_context(memory_items: List[Dict[str, Any]]) -> str:
    """
    Format memory items into a context string for inclusion in prompts.
    
    Args:
        memory_items: List of memory items with content and metadata
        
    Returns:
        Formatted memory context
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
    
    # Join all formatted items and use the memory prompt template
    memories_text = "\n".join(formatted_items)
    return MEMORY_PROMPT.format(memories=memories_text)


def format_document_context(document_content: str) -> str:
    """
    Format document content for inclusion in prompts.
    
    Args:
        document_content: The document content to format
        
    Returns:
        Formatted document context
    """
    return DOCUMENT_CONTEXT_PROMPT.format(document_content=document_content)


def format_web_context(web_content: str) -> str:
    """
    Format web content for inclusion in prompts.
    
    Args:
        web_content: The web content to format
        
    Returns:
        Formatted web context
    """
    return WEB_CONTEXT_PROMPT.format(web_content=web_content)


def get_personality_prompt(personality_settings: PersonalitySettings) -> str:
    """
    Generate a prompt section based on personality settings.
    
    Args:
        personality_settings: The personality settings to use for customization
        
    Returns:
        Personality-specific prompt section
    """
    prompt_parts = []
    
    prompt_parts.append(STYLE_PROMPTS.get(personality_settings.style, STYLE_PROMPTS["helpful"]))
    prompt_parts.append(FORMALITY_PROMPTS.get(personality_settings.formality, FORMALITY_PROMPTS["neutral"]))
    prompt_parts.append(VERBOSITY_PROMPTS.get(personality_settings.verbosity, VERBOSITY_PROMPTS["balanced"]))
    
    # Add optional personality components
    if personality_settings.empathy != "none" and personality_settings.empathy in EMPATHY_PROMPTS:
        prompt_parts.append(EMPATHY_PROMPTS[personality_settings.empathy])
    
    if personality_settings.humor != "none" and personality_settings.humor in HUMOR_PROMPTS:
        prompt_parts.append(HUMOR_PROMPTS[personality_settings.humor])
    
    if personality_settings.creativity != "none" and personality_settings.creativity in CREATIVITY_PROMPTS:
        prompt_parts.append(CREATIVITY_PROMPTS[personality_settings.creativity])
    
    return "\n\n".join(prompt_parts)