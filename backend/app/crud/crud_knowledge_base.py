"""CRUD operations for Knowledge Base conversations and messages."""

import logging
from datetime import datetime, UTC
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.knowledge_base import Conversation, ChatMessage, FilterContext
from app.models.py_object_id import PyObjectId

logger = logging.getLogger(__name__)

# ==================== CONVERSATIONS ====================


async def create_conversation(
    database: AsyncIOMotorDatabase,
    user_id: str,
    title: str,
    filter_context: FilterContext | None = None,
) -> Conversation:
    """Create new conversation.

    Args:
        database: MongoDB database instance.
        user_id: User's ObjectId as string.
        title: Conversation title.
        filter_context: Optional search filter context.

    Returns:
        Created Conversation object.
    """
    conversation_data = {
        "user_id": ObjectId(user_id),
        "title": title,
        "filter_context": filter_context.model_dump() if filter_context else None,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }

    result = await database["conversations"].insert_one(conversation_data)
    conversation_data["_id"] = result.inserted_id

    logger.info(f"Created conversation {result.inserted_id} for user {user_id}")
    return Conversation(**conversation_data)


async def get_user_conversations(
    database: AsyncIOMotorDatabase, user_id: str, limit: int = 20
) -> list[Conversation]:
    """Get user's recent conversations.

    Args:
        database: MongoDB database instance.
        user_id: User's ObjectId as string.
        limit: Maximum number of conversations to return.

    Returns:
        List of Conversation objects, sorted by most recent first.
    """
    cursor = (
        database["conversations"]
        .find({"user_id": ObjectId(user_id)})
        .sort("updated_at", -1)
        .limit(limit)
    )

    conversations = []
    async for doc in cursor:
        # Handle legacy conversations with None title
        if doc.get("title") is None:
            doc["title"] = f"Conversation {doc['created_at'].strftime('%Y-%m-%d %H:%M')}"
        conversations.append(Conversation(**doc))

    logger.debug(f"Retrieved {len(conversations)} conversations for user {user_id}")
    return conversations


async def get_conversation_by_id(
    database: AsyncIOMotorDatabase, conversation_id: str
) -> Conversation | None:
    """Get conversation by ID.

    Args:
        database: MongoDB database instance.
        conversation_id: Conversation's ObjectId as string.

    Returns:
        Conversation object if found, None otherwise.
    """
    doc = await database["conversations"].find_one({"_id": ObjectId(conversation_id)})
    
    if not doc:
        return None
    
    # Handle legacy conversations with None title
    if doc.get("title") is None:
        doc["title"] = f"Conversation {doc['created_at'].strftime('%Y-%m-%d %H:%M')}"
    
    return Conversation(**doc)


async def delete_conversation(
    database: AsyncIOMotorDatabase, conversation_id: str
) -> bool:
    """Delete conversation and all its messages.

    Args:
        database: MongoDB database instance.
        conversation_id: Conversation's ObjectId as string.

    Returns:
        True if conversation was deleted, False if not found.
    """
    # Delete conversation
    result = await database["conversations"].delete_one(
        {"_id": ObjectId(conversation_id)}
    )

    # Delete all messages
    messages_result = await database["chat_messages"].delete_many(
        {"conversation_id": ObjectId(conversation_id)}
    )

    if result.deleted_count > 0:
        logger.info(
            f"Deleted conversation {conversation_id} and {messages_result.deleted_count} messages"
        )
        return True

    logger.warning(f"Conversation {conversation_id} not found for deletion")
    return False


# ==================== MESSAGES ====================


async def create_message(
    database: AsyncIOMotorDatabase,
    user_id: str,
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> ChatMessage:
    """Create new chat message.

    Args:
        database: MongoDB database instance.
        user_id: User's ObjectId as string.
        conversation_id: Conversation's ObjectId as string.
        role: Message role ("user", "assistant", "system").
        content: Message content.
        sources: Optional list of source documents (for assistant responses).

    Returns:
        Created ChatMessage object.
    """
    message_data = {
        "user_id": ObjectId(user_id),
        "conversation_id": ObjectId(conversation_id),
        "role": role,
        "content": content,
        "sources": [s.model_dump() if hasattr(s, "model_dump") else s for s in (sources or [])],
        "created_at": datetime.now(UTC),
    }

    result = await database["chat_messages"].insert_one(message_data)
    message_data["_id"] = result.inserted_id

    # Update conversation timestamp
    await database["conversations"].update_one(
        {"_id": ObjectId(conversation_id)}, {"$set": {"updated_at": datetime.now(UTC)}}
    )

    logger.info(
        f"Created {role} message {result.inserted_id} in conversation {conversation_id}"
    )
    return ChatMessage(**message_data)


async def get_conversation_messages(
    database: AsyncIOMotorDatabase, conversation_id: str
) -> list[ChatMessage]:
    """Get all messages from conversation.

    Args:
        database: MongoDB database instance.
        conversation_id: Conversation's ObjectId as string.

    Returns:
        List of ChatMessage objects, sorted chronologically.
    """
    cursor = database["chat_messages"].find(
        {"conversation_id": ObjectId(conversation_id)}
    ).sort("created_at", 1)

    messages = []
    async for doc in cursor:
        messages.append(ChatMessage(**doc))

    logger.debug(f"Retrieved {len(messages)} messages from conversation {conversation_id}")
    return messages
