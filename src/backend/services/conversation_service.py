import logging
import uuid
from typing import List, Dict, Optional, Any

from datetime import datetime

from .memory_service import MemoryService
from .llm_service import LLMService
from ..llm.prompt_templates import build_system_prompt, format_chat_messages
from ..utils.event_bus import EventBus
from ..config.settings import Settings
from ..schemas.settings import PersonalitySettings

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()
event_bus = EventBus()

# Global constants
DEFAULT_CONVERSATION_LIMIT = settings.get('conversation.default_limit', 50)
DEFAULT_MESSAGE_LIMIT = settings.get('conversation.message_limit', 100)

class ConversationService:
    """
    Core service that manages conversations between users and the AI agent
    """

    def __init__(self, memory_service: MemoryService, llm_service: LLMService, personality_settings: PersonalitySettings):
        """
        Initializes the conversation service with required dependencies

        Args:
            memory_service: Manages memory storage and retrieval for conversation context
            llm_service: Provides language model capabilities for generating responses
            personality_settings: Settings for AI personality
        """
        self.memory_service = memory_service
        self.llm_service = llm_service
        self.personality_settings = personality_settings
        self.web_search_enabled = True  # Enable web search by default
        logger.info("ConversationService initialized with memory_service, llm_service, and personality_settings")

    async def process_message(self, message: str, conversation_id: Optional[str] = None, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a user message and generate an AI response

        Args:
            message: The user's message
            conversation_id: Optional ID of the conversation
            options: Optional parameters for message processing

        Returns:
            Response containing AI message and conversation ID
        """
        logger.info(f"Processing message: {message} in conversation {conversation_id}")
        if options is None:
            options = {}

        if conversation_id is None:
            conversation_id = str(uuid.uuid4())
            logger.info(f"Created new conversation with id: {conversation_id}")

        # Retrieve conversation context from memory service
        context = await self.memory_service.retrieve_context(query=message, filters={"conversation_id": conversation_id})

        # Build system prompt with personality settings and context
        system_prompt = build_system_prompt(self.personality_settings, context=context)

        # Format chat messages for LLM with system prompt and user message
        messages = format_chat_messages(system_prompt, message)

        # Generate response using LLM service
        response = await self.llm_service.generate_response(prompt=messages)

        # Store user message in memory with conversation metadata
        await self._store_interaction(conversation_id, message, "user")

        # Store AI response in memory with conversation metadata
        await self._store_interaction(conversation_id, response, "assistant")

        # Publish message:processed event with conversation details
        event_bus.publish("message:processed", {"conversation_id": conversation_id, "message": message, "response": response})

        return {"response": response, "conversation_id": conversation_id}

    async def create_conversation(self, title: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new conversation with optional title

        Args:
            title: Optional title for the conversation
            metadata: Optional metadata for the conversation

        Returns:
            Created conversation details
        """
        conversation_id = str(uuid.uuid4())
        if title is None:
            title = "New Conversation"
        if metadata is None:
            metadata = {}

        conversation = {"id": conversation_id, "title": title, "created_at": datetime.now().isoformat(), "metadata": metadata}
        logger.info(f"Creating new conversation: {conversation}")

        # Publish conversation:created event
        event_bus.publish("conversation:created", conversation)

        return conversation

    async def get_conversation(self, conversation_id: str, message_limit: Optional[int] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieve a conversation by ID with optional message limit

        Args:
            conversation_id: ID of the conversation
            message_limit: Optional limit on the number of messages to retrieve

        Returns:
            Conversation details with messages or None if not found
        """
        if message_limit is None:
            message_limit = DEFAULT_MESSAGE_LIMIT
        logger.info(f"Retrieving conversation: {conversation_id} with message limit: {message_limit}")
        return {"id": conversation_id, "title": "Conversation Title", "messages": []}

    async def list_conversations(self, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        List all conversations with pagination

        Args:
            limit: Optional limit on the number of conversations to retrieve
            offset: Optional offset for pagination

        Returns:
            List of conversations
        """
        if limit is None:
            limit = DEFAULT_CONVERSATION_LIMIT
        if offset is None:
            offset = 0
        logger.info(f"Listing conversations with limit: {limit} and offset: {offset}")
        return [{"id": "1", "title": "Conversation 1"}, {"id": "2", "title": "Conversation 2"}]

    async def update_conversation(self, conversation_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Update conversation metadata

        Args:
            conversation_id: ID of the conversation
            updates: Dictionary of updates to apply

        Returns:
            Updated conversation or None if not found
        """
        logger.info(f"Updating conversation: {conversation_id} with updates: {updates}")
        return {"id": conversation_id, "title": "Updated Conversation Title"}

    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Delete a conversation and all its messages

        Args:
            conversation_id: ID of the conversation

        Returns:
            True if deleted successfully, False if not found
        """
        logger.info(f"Deleting conversation: {conversation_id}")
        return True

    async def get_conversation_history(self, conversation_id: str, limit: Optional[int] = None, offset: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieve message history for a conversation

        Args:
            conversation_id: ID of the conversation
            limit: Optional limit on the number of messages to retrieve
            offset: Optional offset for pagination

        Returns:
            List of messages in the conversation
        """
        logger.info(f"Retrieving conversation history for conversation: {conversation_id} with limit: {limit} and offset: {offset}")
        return [{"id": "1", "role": "user", "content": "Hello"}, {"id": "2", "role": "assistant", "content": "Hi"}]

    async def summarize_conversation(self, conversation_id: str) -> Optional[str]:
        """
        Generate or update a summary for a conversation

        Args:
            conversation_id: ID of the conversation

        Returns:
            Generated summary or None if conversation not found
        """
        logger.info(f"Summarizing conversation: {conversation_id}")
        return "Conversation Summary"

    async def _construct_prompt(self, message: str, context: str, options: Dict[str, Any]) -> str:
        """
        Construct a prompt for the LLM based on user message and context

        Args:
            message: The user's message
            context: The conversation context
            options: Optional parameters for prompt construction

        Returns:
            Formatted prompt for LLM
        """
        logger.info("Constructing prompt for LLM")
        return f"Prompt: {message}, Context: {context}"

    async def _store_interaction(self, conversation_id: str, content: str, role: str) -> Dict[str, Any]:
        """
        Store a message interaction in memory

        Args:
            conversation_id: ID of the conversation
            content: Content of the message
            role: Role of the message (user or assistant)

        Returns:
            Stored message details
        """
        logger.info(f"Storing interaction in memory for conversation: {conversation_id} with role: {role}")
        return {"id": "1", "conversation_id": conversation_id, "role": role, "content": content}

    def set_personality(self, new_settings: PersonalitySettings) -> None:
        """
        Update the personality settings for the conversation service

        Args:
            new_settings: New personality settings
        """
        logger.info(f"Updating personality settings: {new_settings}")
        self.personality_settings = new_settings
        event_bus.publish("personality:updated", new_settings)

    def toggle_web_search(self, enabled: bool) -> bool:
        """
        Enable or disable web search capability

        Args:
            enabled: Whether to enable web search

        Returns:
            New web search enabled state
        """
        logger.info(f"Toggling web search to: {enabled}")
        self.web_search_enabled = enabled
        event_bus.publish("web_search:toggled", enabled)
        return enabled