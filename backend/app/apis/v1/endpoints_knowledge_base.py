"""Knowledge Base chat API endpoints."""

from typing import Optional
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.db.mongodb_utils import get_database
from app.auth_dependencies import get_current_user
from app.models.user import User
from app.models.knowledge_base import (
    FilterContext,
    ChatMessage,
    Conversation,
    MessageSource,
)
from app.crud import crud_knowledge_base
from app.services.knowledge_base_rag_service import (
    generate_rag_response,
    generate_rag_response_stream,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])


# Request/Response Schemas
class CreateConversationRequest(BaseModel):
    """Request to create a new conversation."""
    title: Optional[str] = Field(None, description="Optional conversation title")


class ConversationResponse(BaseModel):
    """Response with conversation data."""
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    """Request to ask a question."""
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID")
    query: str = Field(..., min_length=1, description="User's question")
    filters: Optional[FilterContext] = Field(None, description="Search filters")
    stream: bool = Field(False, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Response with answer and sources."""
    conversation_id: str
    message_id: str
    answer: str
    sources: list[MessageSource]
    query: str


class MessageResponse(BaseModel):
    """Response with a single message."""
    id: str
    conversation_id: str
    role: str
    content: str
    sources: list[MessageSource]
    created_at: str

    class Config:
        from_attributes = True


# Endpoints
@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    request: CreateConversationRequest,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Create a new conversation for Knowledge Base chat.
    
    Args:
        request: Conversation creation request.
        database: MongoDB database.
        current_user: Authenticated user.
        
    Returns:
        Created conversation.
    """
    try:
        conversation = await crud_knowledge_base.create_conversation(
            database=database,
            user_id=str(current_user.id),
            title=request.title,
        )
        
        return ConversationResponse(
            id=str(conversation.id),
            user_id=str(conversation.user_id),
            title=conversation.title,
            created_at=conversation.created_at.isoformat(),
            updated_at=conversation.updated_at.isoformat(),
        )
        
    except Exception as e:
        logger.error(f"Error creating conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create conversation"
        )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for the current user.
    
    Args:
        database: MongoDB database.
        current_user: Authenticated user.
        
    Returns:
        List of conversations.
    """
    try:
        conversations = await crud_knowledge_base.get_user_conversations(
            database=database,
            user_id=str(current_user.id),
        )
        
        return [
            ConversationResponse(
                id=str(conv.id),
                user_id=str(conv.user_id),
                title=conv.title,
                created_at=conv.created_at.isoformat(),
                updated_at=conv.updated_at.isoformat(),
            )
            for conv in conversations
        ]
        
    except Exception as e:
        logger.error(f"Error listing conversations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list conversations"
        )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Ask a question and get an answer with sources.
    
    This endpoint uses RAG (Retrieval-Augmented Generation) to answer
    questions based on meeting content.
    
    Args:
        request: Chat request with query and optional filters.
        database: MongoDB database.
        current_user: Authenticated user.
        
    Returns:
        Answer with sources, or streaming response if requested.
    """
    if request.stream:
        # Return streaming response
        return StreamingResponse(
            _stream_chat_response(
                database=database,
                user_id=str(current_user.id),
                request=request,
            ),
            media_type="text/event-stream",
        )
    
    try:
        # Generate RAG response
        answer = await generate_rag_response(
            query=request.query,
            user_id=str(current_user.id),
            filters=request.filters,
        )
        
        # Get or create conversation
        conversation_id = request.conversation_id
        if not conversation_id:
            # Create new conversation with query as title
            title = request.query[:50] + "..." if len(request.query) > 50 else request.query
            conversation = await crud_knowledge_base.create_conversation(
                database=database,
                user_id=str(current_user.id),
                title=title,
            )
            conversation_id = str(conversation.id)
        
        # Save user message
        user_message = await crud_knowledge_base.create_message(
            database=database,
            conversation_id=conversation_id,
            role="user",
            content=request.query,
            sources=[],
        )
        
        # Save assistant response
        # TODO: Extract sources from search results
        assistant_message = await crud_knowledge_base.create_message(
            database=database,
            conversation_id=conversation_id,
            role="assistant",
            content=answer,
            sources=[],  # Will be populated when we integrate source tracking
        )
        
        return ChatResponse(
            conversation_id=conversation_id,
            message_id=str(assistant_message.id),
            answer=answer,
            sources=[],  # TODO: Return actual sources
            query=request.query,
        )
        
    except Exception as e:
        logger.error(f"Error in chat: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate response"
        )


async def _stream_chat_response(
    database: AsyncIOMotorDatabase,
    user_id: str,
    request: ChatRequest,
):
    """Stream chat response chunks.
    
    Args:
        database: MongoDB database.
        user_id: User making the request.
        request: Chat request.
        
    Yields:
        Server-Sent Events formatted response chunks.
    """
    try:
        # Get or create conversation
        conversation_id = request.conversation_id
        if not conversation_id:
            title = request.query[:50] + "..." if len(request.query) > 50 else request.query
            conversation = await crud_knowledge_base.create_conversation(
                database=database,
                user_id=user_id,
                title=title,
            )
            conversation_id = str(conversation.id)
            
            # Send conversation ID first
            yield f"data: {{'type': 'conversation_id', 'id': '{conversation_id}'}}\n\n"
        
        # Save user message
        await crud_knowledge_base.create_message(
            database=database,
            conversation_id=conversation_id,
            role="user",
            content=request.query,
            sources=[],
        )
        
        # Stream response
        full_response = ""
        sources_data = []
        
        async for chunk_data in generate_rag_response_stream(
            query=request.query,
            user_id=user_id,
            filters=request.filters,
            include_sources=True,
        ):
            if isinstance(chunk_data, dict):
                if "sources" in chunk_data:
                    # Received sources
                    sources_data = chunk_data["sources"]
                    yield f"data: {{'type': 'sources', 'sources': {sources_data}}}\n\n"
                elif "content" in chunk_data:
                    # Content chunk
                    content = chunk_data["content"]
                    full_response += content
                    yield f"data: {{'type': 'content', 'content': '{content}'}}\n\n"
            else:
                # Plain string chunk
                full_response += chunk_data
                yield f"data: {{'type': 'content', 'content': '{chunk_data}'}}\n\n"
        
        # Save assistant message
        await crud_knowledge_base.create_message(
            database=database,
            conversation_id=conversation_id,
            role="assistant",
            content=full_response,
            sources=[],  # TODO: Convert sources_data to MessageSource objects
        )
        
        yield "data: {'type': 'done'}\n\n"
        
    except Exception as e:
        logger.error(f"Error streaming chat: {e}", exc_info=True)
        yield f"data: {{'type': 'error', 'message': 'Stream failed'}}\n\n"


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Get all messages in a conversation.
    
    Args:
        conversation_id: Conversation ID.
        database: MongoDB database.
        current_user: Authenticated user.
        
    Returns:
        List of messages.
    """
    try:
        # Verify conversation belongs to user
        conversation = await crud_knowledge_base.get_conversation_by_id(
            database=database,
            conversation_id=conversation_id,
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if str(conversation.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get messages
        messages = await crud_knowledge_base.get_conversation_messages(
            database=database,
            conversation_id=conversation_id,
        )
        
        return [
            MessageResponse(
                id=str(msg.id),
                conversation_id=str(msg.conversation_id),
                role=msg.role,
                content=msg.content,
                sources=msg.sources,
                created_at=msg.created_at.isoformat(),
            )
            for msg in messages
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get messages"
        )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Delete a conversation and all its messages.
    
    Args:
        conversation_id: Conversation ID to delete.
        database: MongoDB database.
        current_user: Authenticated user.
    """
    try:
        # Verify conversation belongs to user
        conversation = await crud_knowledge_base.get_conversation_by_id(
            database=database,
            conversation_id=conversation_id,
        )
        
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        
        if str(conversation.user_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Delete conversation
        success = await crud_knowledge_base.delete_conversation(
            database=database,
            conversation_id=conversation_id,
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete conversation"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )
