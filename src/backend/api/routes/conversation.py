import logging
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body, Response, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.security import SecurityScopes

from ...services.conversation_service import ConversationService
from ...services.voice_processor import VoiceProcessor
from ...schemas.conversation import ConversationMessageRequest, ConversationMessageResponse, ConversationCreate, ConversationResponse
from ...schemas.voice import SynthesisRequest
from ..middleware.authentication import get_current_user
from ..middleware.error_handler import ResourceNotFoundError
from ...config.settings import Settings
from ...services.memory_service import MemoryService
from ...services.llm_service import LLMService
from ...schemas.settings import PersonalitySettings

# Initialize logger
logger = logging.getLogger(__name__)

# Initialize settings and event bus
settings = Settings()

# Global constants
DEFAULT_CONVERSATION_LIMIT = settings.get('conversation.default_limit', 50)
DEFAULT_MESSAGE_LIMIT = settings.get('conversation.message_limit', 100)

# Create a new APIRouter instance with a prefix and tags
router = APIRouter(prefix="/conversation", tags=["conversation"])

# Dependency function to get the conversation service instance
async def get_conversation_service() -> ConversationService:
    """
    Dependency function to get the conversation service instance.

    Returns:
        ConversationService: Initialized conversation service instance.
    """
    # Import necessary dependencies for creating ConversationService
    # Create MemoryService instance
    # Create LLMService instance
    # Load personality settings from configuration
    # Create and return a new ConversationService instance with required dependencies
    memory_service = MemoryService()
    llm_service = LLMService()
    personality_settings = PersonalitySettings()
    return ConversationService(memory_service=memory_service, llm_service=llm_service, personality_settings=personality_settings)

# Dependency function to get the voice processor instance
async def get_voice_processor() -> VoiceProcessor:
    """
    Dependency function to get the voice processor instance.

    Returns:
        VoiceProcessor: Initialized voice processor instance.
    """
    # Import necessary dependencies for creating VoiceProcessor
    # Create and return a new VoiceProcessor instance with required dependencies
    return VoiceProcessor()

# Endpoint to send a message and get an AI response
@router.post("/", response_model=ConversationMessageResponse, status_code=status.HTTP_200_OK)
async def send_message(
    message_request: ConversationMessageRequest,
    conversation_service: ConversationService = Depends(get_conversation_service),
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
) -> ConversationMessageResponse:
    """
    Endpoint to send a message and get an AI response.

    Args:
        message_request: Incoming message request.
        conversation_service: Conversation service dependency.
        voice_processor: Voice processor dependency.
        current_user: Current authenticated user.

    Returns:
        ConversationMessageResponse: AI response to the message.
    """
    # Log incoming message request
    logger.info(f"Received message: {message_request.message} in conversation {message_request.conversation_id}")

    # Extract message text and conversation_id from request
    message = message_request.message
    conversation_id = message_request.conversation_id

    # Process message using conversation_service.process_message
    response = await conversation_service.process_message(message=message, conversation_id=conversation_id)

    # If voice response requested, generate speech using voice_processor.synthesize_speech
    if message_request.voice:
        synthesis_request = SynthesisRequest(text=response["response"])
        try:
            synthesis_response = voice_processor.synthesize_speech(request=synthesis_request)
            response["audio_url"] = synthesis_response.audio_url
        except Exception as e:
            logger.error(f"Error synthesizing speech: {str(e)}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error synthesizing speech: {str(e)}")

    # Return response with text and optional audio URL
    return ConversationMessageResponse(response=response["response"], conversation_id=response["conversation_id"], audio_url=response.get("audio_url"))

# Endpoint to create a new conversation
@router.post("/create", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> ConversationResponse:
    """
    Endpoint to create a new conversation.

    Args:
        conversation_data: Data for creating the conversation.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        ConversationResponse: Created conversation details.
    """
    # Log conversation creation request
    logger.info(f"Creating conversation with title: {conversation_data.title}")

    # Extract title and metadata from request
    title = conversation_data.title
    metadata = conversation_data.metadata

    # Create conversation using conversation_service.create_conversation
    conversation = await conversation_service.create_conversation(title=title, metadata=metadata)

    # Return the created conversation details
    return ConversationResponse(id=conversation["id"], title=conversation["title"], created_at=conversation["created_at"], updated_at=conversation["updated_at"], summary=conversation["summary"], metadata=conversation["metadata"])

# Endpoint to retrieve a specific conversation by ID
@router.get("/{conversation_id}", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
async def get_conversation(
    conversation_id: uuid.UUID = Path(..., description="ID of the conversation to retrieve"),
    message_limit: int = Query(DEFAULT_MESSAGE_LIMIT, description="Maximum number of messages to retrieve"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> ConversationResponse:
    """
    Endpoint to retrieve a specific conversation by ID.

    Args:
        conversation_id: ID of the conversation to retrieve.
        message_limit: Maximum number of messages to retrieve.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        ConversationResponse: Conversation details with messages.
    """
    # Log conversation retrieval request
    logger.info(f"Retrieving conversation with ID: {conversation_id}")

    # Retrieve conversation using conversation_service.get_conversation
    conversation = await conversation_service.get_conversation(conversation_id=str(conversation_id), message_limit=message_limit)

    # If conversation not found, raise ResourceNotFoundError
    if not conversation:
        raise ResourceNotFoundError(f"Conversation with id {conversation_id} not found")

    # Return the conversation with messages
    return ConversationResponse(id=conversation["id"], title=conversation["title"], created_at=conversation["created_at"], updated_at=conversation["updated_at"], summary=conversation["summary"], metadata=conversation["metadata"], messages=[])

# Endpoint to list all conversations with pagination
@router.get("/", response_model=List[ConversationResponse], status_code=status.HTTP_200_OK)
async def list_conversations(
    limit: int = Query(DEFAULT_CONVERSATION_LIMIT, description="Maximum number of conversations to retrieve"),
    offset: int = Query(0, description="Offset for pagination"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> List[ConversationResponse]:
    """
    Endpoint to list all conversations with pagination.

    Args:
        limit: Maximum number of conversations to retrieve.
        offset: Offset for pagination.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        List[ConversationResponse]: List of conversations.
    """
    # Log conversation list request
    logger.info(f"Listing conversations with limit: {limit} and offset: {offset}")

    # Retrieve conversations using conversation_service.list_conversations
    conversations = await conversation_service.list_conversations(limit=limit, offset=offset)

    # Return the list of conversations
    return [ConversationResponse(id=c["id"], title=c["title"], created_at=c["created_at"], updated_at=c["updated_at"], summary=c["summary"], metadata=c["metadata"]) for c in conversations]

# Endpoint to update conversation metadata
@router.patch("/{conversation_id}", response_model=ConversationResponse, status_code=status.HTTP_200_OK)
async def update_conversation(
    conversation_id: uuid.UUID = Path(..., description="ID of the conversation to update"),
    updates: Dict[str, Any] = Body(..., description="Fields to update"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> ConversationResponse:
    """
    Endpoint to update conversation metadata.

    Args:
        conversation_id: ID of the conversation to update.
        updates: Fields to update.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        ConversationResponse: Updated conversation.
    """
    # Log conversation update request
    logger.info(f"Updating conversation with ID: {conversation_id} and updates: {updates}")

    # Update conversation using conversation_service.update_conversation
    conversation = await conversation_service.update_conversation(conversation_id=str(conversation_id), updates=updates)

    # If conversation not found, raise ResourceNotFoundError
    if not conversation:
        raise ResourceNotFoundError(f"Conversation with id {conversation_id} not found")

    # Return the updated conversation
    return ConversationResponse(id=conversation["id"], title=conversation["title"], created_at=conversation["created_at"], updated_at=conversation["updated_at"], summary=conversation["summary"], metadata=conversation["metadata"])

# Endpoint to delete a conversation and all its messages
@router.delete("/{conversation_id}", status_code=status.HTTP_200_OK)
async def delete_conversation(
    conversation_id: uuid.UUID = Path(..., description="ID of the conversation to delete"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Endpoint to delete a conversation and all its messages.

    Args:
        conversation_id: ID of the conversation to delete.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        dict: Deletion result.
    """
    # Log conversation deletion request
    logger.info(f"Deleting conversation with ID: {conversation_id}")

    # Delete conversation using conversation_service.delete_conversation
    deleted = await conversation_service.delete_conversation(conversation_id=str(conversation_id))

    # If conversation not found, raise ResourceNotFoundError
    if not deleted:
        raise ResourceNotFoundError(f"Conversation with id {conversation_id} not found")

    # Return deletion result with success status
    return {"success": True}

# Endpoint to retrieve message history for a conversation
@router.get("/{conversation_id}/history", status_code=status.HTTP_200_OK)
async def get_conversation_history(
    conversation_id: uuid.UUID = Path(..., description="ID of the conversation to retrieve history for"),
    limit: int = Query(DEFAULT_MESSAGE_LIMIT, description="Maximum number of messages to retrieve"),
    offset: int = Query(0, description="Offset for pagination"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Endpoint to retrieve message history for a conversation.

    Args:
        conversation_id: ID of the conversation to retrieve history for.
        limit: Maximum number of messages to retrieve.
        offset: Offset for pagination.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        List[Dict[str, Any]]: List of messages in the conversation.
    """
    # Log conversation history request
    logger.info(f"Retrieving history for conversation with ID: {conversation_id}, limit: {limit}, offset: {offset}")

    # Retrieve message history using conversation_service.get_conversation_history
    messages = await conversation_service.get_conversation_history(conversation_id=str(conversation_id), limit=limit, offset=offset)

    # If conversation not found, raise ResourceNotFoundError
    if not messages:
         raise ResourceNotFoundError(f"Conversation with id {conversation_id} not found")

    # Return the list of messages
    return messages

# Endpoint to generate or update a summary for a conversation
@router.post("/{conversation_id}/summarize", status_code=status.HTTP_200_OK)
async def summarize_conversation(
    conversation_id: uuid.UUID = Path(..., description="ID of the conversation to summarize"),
    conversation_service: ConversationService = Depends(get_conversation_service),
    current_user: dict = Depends(get_current_user)
) -> dict:
    """
    Endpoint to generate or update a summary for a conversation.

    Args:
        conversation_id: ID of the conversation to summarize.
        conversation_service: Conversation service dependency.
        current_user: Current authenticated user.

    Returns:
        dict: Generated summary.
    """
    # Log conversation summarization request
    logger.info(f"Summarizing conversation with ID: {conversation_id}")

    # Generate summary using conversation_service.summarize_conversation
    summary = await conversation_service.summarize_conversation(conversation_id=str(conversation_id))

    # If conversation not found, raise ResourceNotFoundError
    if not summary:
        raise ResourceNotFoundError(f"Conversation with id {conversation_id} not found")

    # Return the generated summary
    return {"summary": summary}

# Expose the router
__all__ = ["router"]