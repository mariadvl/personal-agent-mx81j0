from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from uuid import UUID
from datetime import datetime

class MessageBase(BaseModel):
    id: UUID = Field(description="Unique identifier for the message")
    role: Literal["user", "assistant"] = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message", min_length=1, max_length=4000)
    created_at: datetime = Field(description="Timestamp when the message was created")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "role": "user",
                "content": "Hello, AI!",
                "created_at": "2023-01-01T12:00:00Z",
                "metadata": {"source": "chat_interface"}
            }
        },
        "arbitrary_types_allowed": True
    }

class MessageCreate(BaseModel):
    role: Literal["user", "assistant"] = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message", min_length=1, max_length=4000)
    conversation_id: UUID = Field(description="ID of the conversation this message belongs to")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "role": "user",
                "content": "Hello, AI!",
                "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
                "metadata": {"source": "chat_interface"}
            }
        }
    }

class MessageResponse(BaseModel):
    id: UUID = Field(description="Unique identifier for the message")
    role: Literal["user", "assistant"] = Field(description="Role of the message sender")
    content: str = Field(description="Content of the message", min_length=1, max_length=4000)
    created_at: datetime = Field(description="Timestamp when the message was created")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "role": "user",
                "content": "Hello, AI!",
                "created_at": "2023-01-01T12:00:00Z",
                "metadata": {"source": "chat_interface"}
            }
        }
    }

class ConversationBase(BaseModel):
    id: UUID = Field(description="Unique identifier for the conversation")
    title: str = Field(description="Title of the conversation", min_length=1, max_length=100)
    created_at: datetime = Field(description="Timestamp when the conversation was created")
    updated_at: datetime = Field(description="Timestamp when the conversation was last updated")
    summary: Optional[str] = Field(default=None, description="Summary of the conversation", max_length=500)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the conversation")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Project Discussion",
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:30:00Z",
                "summary": "Discussion about project timeline and milestones",
                "metadata": {"tags": ["project", "planning"]}
            }
        },
        "arbitrary_types_allowed": True
    }

class ConversationCreate(BaseModel):
    title: Optional[str] = Field(default=None, description="Title of the conversation", min_length=1, max_length=100)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the conversation")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Project Discussion",
                "metadata": {"tags": ["project", "planning"]}
            }
        }
    }

class ConversationResponse(BaseModel):
    id: UUID = Field(description="Unique identifier for the conversation")
    title: str = Field(description="Title of the conversation", min_length=1, max_length=100)
    created_at: datetime = Field(description="Timestamp when the conversation was created")
    updated_at: datetime = Field(description="Timestamp when the conversation was last updated")
    summary: Optional[str] = Field(default=None, description="Summary of the conversation", max_length=500)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata for the conversation")
    messages: Optional[List[MessageResponse]] = Field(default=None, description="Messages in the conversation")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Project Discussion",
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:30:00Z",
                "summary": "Discussion about project timeline and milestones",
                "metadata": {"tags": ["project", "planning"]},
                "messages": [
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174001",
                        "role": "user",
                        "content": "Hello, AI!",
                        "created_at": "2023-01-01T12:00:00Z",
                        "metadata": {"source": "chat_interface"}
                    },
                    {
                        "id": "123e4567-e89b-12d3-a456-426614174002",
                        "role": "assistant",
                        "content": "Hello! How can I help you today?",
                        "created_at": "2023-01-01T12:00:05Z",
                        "metadata": {"confidence": 0.98}
                    }
                ]
            }
        }
    }

class ConversationMessageRequest(BaseModel):
    message: str = Field(description="Message content to send", min_length=1, max_length=4000)
    conversation_id: Optional[UUID] = Field(default=None, description="ID of the conversation (optional for new conversations)")
    voice: Optional[bool] = Field(default=False, description="Whether to return response as voice")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Can you remind me what we discussed about the project timeline yesterday?",
                "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
                "voice": False
            }
        }
    }

class ConversationMessageResponse(BaseModel):
    response: str = Field(description="AI response to the message", min_length=1)
    conversation_id: UUID = Field(description="ID of the conversation")
    audio_url: Optional[str] = Field(default=None, description="URL to the audio version of the response (if voice was requested)")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "response": "Based on our conversation yesterday, you mentioned the following timeline: Research phase: 2 weeks, Design phase: 3 weeks, Development: 6 weeks, Testing: 2 weeks. You also noted that the client meeting is scheduled for July 10th.",
                "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
                "audio_url": None
            }
        }
    }