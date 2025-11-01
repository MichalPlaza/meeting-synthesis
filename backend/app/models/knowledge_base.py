"""Knowledge Base models for MongoDB.

This module defines models for chat conversations and messages
used in the Knowledge Base feature.
"""

from datetime import datetime, UTC
from pydantic import BaseModel, Field
from app.models.py_object_id import PyObjectId


class FilterContext(BaseModel):
    """Filter context for Knowledge Base searches.

    Stores user's active filters to scope search results.
    """

    project_ids: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    date_from: datetime | None = None
    date_to: datetime | None = None

    class Config:
        """Pydantic config."""

        json_encoders = {datetime: lambda v: v.isoformat()}


class MessageSource(BaseModel):
    """Source reference for a chat message.

    Links AI response back to the meeting documents it was based on.
    """

    meeting_id: str
    meeting_title: str
    content_type: str  # transcription, summary, key_topic, action_item, decision
    excerpt: str  # Short excerpt from the source document
    relevance_score: float  # Score from Elasticsearch (0-1)
    timestamp: str | None = None  # For transcriptions

    class Config:
        """Pydantic config."""

        json_schema_extra = {
            "example": {
                "meeting_id": "507f1f77bcf86cd799439011",
                "meeting_title": "Marketing Q3 Strategy",
                "content_type": "summary",
                "excerpt": "Discussed budget allocation for Q3 campaigns...",
                "relevance_score": 0.95,
                "timestamp": "00:15:30",
            }
        }


class ChatMessage(BaseModel):
    """Individual chat message in a conversation.

    Represents both user queries and AI assistant responses.
    """

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    conversation_id: PyObjectId
    role: str  # "user" | "assistant" | "system"
    content: str
    sources: list[MessageSource] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        """Pydantic config."""

        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda v: v.isoformat(),
        }
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "user_id": "507f1f77bcf86cd799439012",
                "conversation_id": "507f1f77bcf86cd799439013",
                "role": "user",
                "content": "What were the action items from last week?",
                "sources": [],
                "created_at": "2025-11-01T10:30:00Z",
            }
        }


class Conversation(BaseModel):
    """Chat conversation in Knowledge Base.

    Groups related messages together with optional filter context.
    """

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId
    title: str
    filter_context: FilterContext | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        """Pydantic config."""

        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            PyObjectId: str,
            datetime: lambda v: v.isoformat(),
        }
        json_schema_extra = {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "user_id": "507f1f77bcf86cd799439012",
                "title": "Q3 Marketing Questions",
                "filter_context": {
                    "project_ids": ["507f1f77bcf86cd799439013"],
                    "tags": ["marketing", "Q3-2025"],
                    "date_from": "2025-10-01T00:00:00Z",
                    "date_to": "2025-10-31T23:59:59Z",
                },
                "created_at": "2025-11-01T10:00:00Z",
                "updated_at": "2025-11-01T10:30:00Z",
            }
        }
