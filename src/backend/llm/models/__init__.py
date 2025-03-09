"""
Module for LLM model implementations in the Personal AI Agent.

This module provides access to different language model implementations:
- BaseLLMModel: Abstract base class defining the LLM interface
- OpenAIModel: Implementation using OpenAI's API
- LocalLLMModel: Implementation using local LLM models for privacy-focused operation
"""

import logging

from .base import BaseLLMModel
from .openai import OpenAIModel
from .local_llm import LocalLLMModel

# Set up logger
logger = logging.getLogger(__name__)

# Define exported classes
__all__ = ["BaseLLMModel", "OpenAIModel", "LocalLLMModel"]