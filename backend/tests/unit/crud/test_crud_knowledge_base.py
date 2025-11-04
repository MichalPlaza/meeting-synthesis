"""Unit tests for Knowledge Base CRUD operations."""

import pytest
from datetime import datetime, UTC
from bson import ObjectId
from unittest.mock import AsyncMock, MagicMock

from app.crud import crud_knowledge_base
from app.models.knowledge_base import (
    ChatMessage,
    Conversation,
    FilterContext,
    MessageSource,
)


@pytest.mark.asyncio
class TestConversationCRUD:
    """Tests for conversation CRUD operations."""

    def setup_method(self):
        """Setup mocks for each test."""
        self.mock_conversations = AsyncMock()
        self.mock_messages = AsyncMock()
        self.mock_db = MagicMock()
        
        def getitem_side_effect(key):
            if key == "conversations":
                return self.mock_conversations
            elif key == "chat_messages":
                return self.mock_messages
            return AsyncMock()
        
        self.mock_db.__getitem__.side_effect = getitem_side_effect

    async def test_create_conversation(self):
        """Test creating new conversation."""
        inserted_id = ObjectId()
        self.mock_conversations.insert_one.return_value = MagicMock(inserted_id=inserted_id)

        conv = await crud_knowledge_base.create_conversation(
            self.mock_db,
            user_id=str(ObjectId()),
            title="Test Chat"
        )

        assert conv.title == "Test Chat"
        assert conv.id == inserted_id
        assert isinstance(conv.created_at, datetime)
        self.mock_conversations.insert_one.assert_awaited_once()

    async def test_create_conversation_with_filter_context(self):
        """Test creating conversation with filter context."""
        inserted_id = ObjectId()
        self.mock_conversations.insert_one.return_value = MagicMock(inserted_id=inserted_id)

        filter_ctx = FilterContext(
            project_ids=["proj1"],
            date_from=datetime.now(UTC)
        )

        conv = await crud_knowledge_base.create_conversation(
            self.mock_db,
            user_id=str(ObjectId()),
            title="Filtered Chat",
            filter_context=filter_ctx
        )

        assert conv.title == "Filtered Chat"
        assert conv.filter_context is not None
        assert conv.filter_context.project_ids == ["proj1"]

    async def test_get_user_conversations(self):
        """Test retrieving user conversations."""
        db_mock = AsyncMock()
        user_id = ObjectId()

        # Mock cursor
        mock_docs = [
            {
                "_id": ObjectId(),
                "user_id": user_id,
                "title": "Chat 1",
                "filter_context": None,
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC)
            },
            {
                "_id": ObjectId(),
                "user_id": user_id,
                "title": "Chat 2",
                "filter_context": None,
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC)
            }
        ]

        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter(mock_docs)
        
        db_mock["conversations"].find.return_value.sort.return_value.limit.return_value = mock_cursor

        conversations = await crud_knowledge_base.get_user_conversations(
            db_mock,
            user_id=str(user_id),
            limit=20
        )

        assert len(conversations) == 2
        assert conversations[0].title == "Chat 1"
        assert conversations[1].title == "Chat 2"
        db_mock["conversations"].find.assert_called_once()

    async def test_delete_conversation(self):
        """Test deleting conversation and its messages."""
        conversation_id = ObjectId()

        # Mock successful deletion
        self.mock_conversations.delete_one.return_value = MagicMock(deleted_count=1)
        self.mock_messages.delete_many.return_value = MagicMock(deleted_count=5)

        result = await crud_knowledge_base.delete_conversation(
            self.mock_db,
            conversation_id=str(conversation_id)
        )

        assert result is True
        self.mock_conversations.delete_one.assert_awaited_once()
        self.mock_messages.delete_many.assert_awaited_once()

    async def test_delete_conversation_not_found(self):
        """Test deleting non-existent conversation."""
        conversation_id = ObjectId()

        # Mock no deletion
        self.mock_conversations.delete_one.return_value = MagicMock(deleted_count=0)
        self.mock_messages.delete_many.return_value = MagicMock(deleted_count=0)

        result = await crud_knowledge_base.delete_conversation(
            self.mock_db,
            conversation_id=str(conversation_id)
        )

        assert result is False


@pytest.mark.asyncio
class TestMessageCRUD:
    """Tests for message CRUD operations."""

    def setup_method(self):
        """Setup mocks for each test."""
        self.mock_conversations = AsyncMock()
        self.mock_messages = AsyncMock()
        self.mock_db = MagicMock()
        
        def getitem_side_effect(key):
            if key == "conversations":
                return self.mock_conversations
            elif key == "chat_messages":
                return self.mock_messages
            return AsyncMock()
        
        self.mock_db.__getitem__.side_effect = getitem_side_effect

    async def test_create_message_user_role(self):
        """Test creating user message."""
        message_id = ObjectId()
        conversation_id = ObjectId()
        user_id = ObjectId()

        self.mock_messages.insert_one.return_value = MagicMock(inserted_id=message_id)
        self.mock_conversations.update_one.return_value = MagicMock()

        message = await crud_knowledge_base.create_message(
            self.mock_db,
            user_id=str(user_id),
            conversation_id=str(conversation_id),
            role="user",
            content="What's in today's meeting?"
        )

        assert message.id == message_id
        assert message.role == "user"
        assert message.content == "What's in today's meeting?"
        assert message.sources == []
        self.mock_messages.insert_one.assert_awaited_once()
        self.mock_conversations.update_one.assert_awaited_once()

    async def test_create_message_assistant_with_sources(self):
        """Test creating assistant message with sources."""
        message_id = ObjectId()
        conversation_id = ObjectId()
        user_id = ObjectId()

        self.mock_messages.insert_one.return_value = MagicMock(inserted_id=message_id)
        self.mock_conversations.update_one.return_value = MagicMock()

        sources = [
            {
                "meeting_id": "meeting123",
                "meeting_title": "Sprint Planning",
                "content_type": "summary",
                "excerpt": "Discussed sprint goals",
                "relevance_score": 0.95
            }
        ]

        message = await crud_knowledge_base.create_message(
            self.mock_db,
            user_id=str(user_id),
            conversation_id=str(conversation_id),
            role="assistant",
            content="The sprint planning discussed...",
            sources=sources
        )

        assert message.role == "assistant"
        assert len(message.sources) == 1
        assert message.sources[0].meeting_id == "meeting123"
        assert message.sources[0].relevance_score == 0.95

    async def test_get_conversation_messages(self):
        """Test retrieving conversation messages in order."""
        db_mock = AsyncMock()
        conversation_id = ObjectId()
        user_id = ObjectId()

        mock_messages = [
            {
                "_id": ObjectId(),
                "user_id": user_id,
                "conversation_id": conversation_id,
                "role": "user",
                "content": "Question 1",
                "sources": [],
                "created_at": datetime.now(UTC)
            },
            {
                "_id": ObjectId(),
                "user_id": user_id,
                "conversation_id": conversation_id,
                "role": "assistant",
                "content": "Answer 1",
                "sources": [],
                "created_at": datetime.now(UTC)
            }
        ]

        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter(mock_messages)
        
        db_mock["chat_messages"].find.return_value.sort.return_value = mock_cursor

        messages = await crud_knowledge_base.get_conversation_messages(
            db_mock,
            conversation_id=str(conversation_id)
        )

        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[1].role == "assistant"
        db_mock["chat_messages"].find.assert_called_once()

    async def test_get_conversation_messages_empty(self):
        """Test retrieving messages from empty conversation."""
        db_mock = AsyncMock()
        conversation_id = ObjectId()

        mock_cursor = AsyncMock()
        mock_cursor.__aiter__.return_value = iter([])
        
        db_mock["chat_messages"].find.return_value.sort.return_value = mock_cursor

        messages = await crud_knowledge_base.get_conversation_messages(
            db_mock,
            conversation_id=str(conversation_id)
        )

        assert len(messages) == 0
