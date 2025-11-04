"""Unit tests for Knowledge Base models."""

import pytest
from datetime import datetime
from bson import ObjectId
from app.models.knowledge_base import (
    ChatMessage,
    Conversation,
    MessageSource,
    FilterContext,
    PyObjectId,
)


class TestKnowledgeBaseModels:
    """Tests for Knowledge Base Pydantic models."""

    def test_filter_context_creation(self):
        """Test FilterContext model creation."""
        filter_ctx = FilterContext(
            project_ids=["project1", "project2"],
            tags=["marketing", "Q3"],
            date_from=datetime(2025, 10, 1),
            date_to=datetime(2025, 10, 31),
        )

        assert filter_ctx.project_ids == ["project1", "project2"]
        assert filter_ctx.tags == ["marketing", "Q3"]
        assert filter_ctx.date_from.year == 2025
        assert filter_ctx.date_to.month == 10

    def test_filter_context_empty(self):
        """Test FilterContext with default values."""
        filter_ctx = FilterContext()

        assert filter_ctx.project_ids == []
        assert filter_ctx.tags == []
        assert filter_ctx.date_from is None
        assert filter_ctx.date_to is None

    def test_message_source_creation(self):
        """Test MessageSource model creation."""
        source = MessageSource(
            meeting_id="507f1f77bcf86cd799439011",
            meeting_title="Marketing Meeting",
            content_type="summary",
            excerpt="This is a short excerpt from the meeting",
            relevance_score=0.95,
            timestamp="00:15:30",
        )

        assert source.meeting_id == "507f1f77bcf86cd799439011"
        assert source.meeting_title == "Marketing Meeting"
        assert source.content_type == "summary"
        assert source.relevance_score == 0.95
        assert source.timestamp == "00:15:30"

    def test_message_source_without_timestamp(self):
        """Test MessageSource without optional timestamp."""
        source = MessageSource(
            meeting_id="123",
            meeting_title="Test",
            content_type="transcription",
            excerpt="Test excerpt",
            relevance_score=0.8,
        )

        assert source.timestamp is None

    def test_chat_message_creation(self):
        """Test ChatMessage model creation."""
        user_id = ObjectId()
        conversation_id = ObjectId()

        message = ChatMessage(
            user_id=user_id,
            conversation_id=conversation_id,
            role="user",
            content="What were the action items?",
        )

        assert message.role == "user"
        assert message.content == "What were the action items?"
        assert message.user_id == user_id
        assert message.conversation_id == conversation_id
        assert isinstance(message.id, PyObjectId)
        assert isinstance(message.created_at, datetime)
        assert message.sources == []

    def test_chat_message_with_sources(self):
        """Test ChatMessage with sources."""
        user_id = ObjectId()
        conversation_id = ObjectId()

        sources = [
            MessageSource(
                meeting_id="meeting1",
                meeting_title="Meeting 1",
                content_type="summary",
                excerpt="Excerpt 1",
                relevance_score=0.9,
            ),
            MessageSource(
                meeting_id="meeting2",
                meeting_title="Meeting 2",
                content_type="transcription",
                excerpt="Excerpt 2",
                relevance_score=0.85,
            ),
        ]

        message = ChatMessage(
            user_id=user_id,
            conversation_id=conversation_id,
            role="assistant",
            content="Here are the action items...",
            sources=sources,
        )

        assert message.role == "assistant"
        assert len(message.sources) == 2
        assert message.sources[0].meeting_id == "meeting1"
        assert message.sources[1].relevance_score == 0.85

    def test_chat_message_json_encoding(self):
        """Test ChatMessage JSON serialization."""
        user_id = ObjectId()
        conversation_id = ObjectId()

        message = ChatMessage(
            user_id=user_id,
            conversation_id=conversation_id,
            role="user",
            content="Test message",
        )

        # Should be serializable with alias
        json_data = message.model_dump(mode="json", by_alias=True)

        assert isinstance(json_data["_id"], str)
        assert isinstance(json_data["user_id"], str)
        assert isinstance(json_data["created_at"], str)
        assert json_data["role"] == "user"

    def test_conversation_creation(self):
        """Test Conversation model creation."""
        user_id = ObjectId()

        conversation = Conversation(
            user_id=user_id,
            title="Q3 Marketing Questions",
        )

        assert conversation.title == "Q3 Marketing Questions"
        assert conversation.user_id == user_id
        assert isinstance(conversation.id, PyObjectId)
        assert isinstance(conversation.created_at, datetime)
        assert isinstance(conversation.updated_at, datetime)
        assert conversation.filter_context is None

    def test_conversation_with_filter_context(self):
        """Test Conversation with FilterContext."""
        user_id = ObjectId()

        filter_ctx = FilterContext(
            project_ids=["project1"],
            tags=["marketing"],
            date_from=datetime(2025, 10, 1),
            date_to=datetime(2025, 10, 31),
        )

        conversation = Conversation(
            user_id=user_id,
            title="Filtered Search",
            filter_context=filter_ctx,
        )

        assert conversation.filter_context is not None
        assert conversation.filter_context.project_ids == ["project1"]
        assert conversation.filter_context.tags == ["marketing"]

    def test_conversation_json_encoding(self):
        """Test Conversation JSON serialization."""
        user_id = ObjectId()

        conversation = Conversation(
            user_id=user_id,
            title="Test Conversation",
        )

        json_data = conversation.model_dump(mode="json", by_alias=True)

        assert isinstance(json_data["_id"], str)
        assert isinstance(json_data["user_id"], str)
        assert isinstance(json_data["created_at"], str)
        assert json_data["title"] == "Test Conversation"
        assert json_data["title"] == "Test Conversation"

    def test_py_object_id_validation(self):
        """Test PyObjectId validation through model."""
        # Valid ObjectId string
        valid_id = "507f1f77bcf86cd799439011"
        
        # Test through model creation (Pydantic v2 handles validation internally)
        message = ChatMessage(
            user_id=valid_id,
            conversation_id=valid_id,
            role="user",
            content="Test",
        )
        
        assert isinstance(message.user_id, ObjectId)
        assert str(message.user_id) == valid_id

        # Invalid ObjectId should raise validation error
        with pytest.raises(ValueError, match="Invalid ObjectId"):
            ChatMessage(
                user_id="invalid",
                conversation_id=valid_id,
                role="user",
                content="Test",
            )
