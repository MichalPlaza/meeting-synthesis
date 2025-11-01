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


# Admin Endpoints for Index Management

class ReindexResponse(BaseModel):
    """Response for reindex operations."""
    success: bool
    meeting_id: str
    documents_indexed: int = 0
    message: str


class BulkReindexResponse(BaseModel):
    """Response for bulk reindex operations."""
    success: bool
    total_meetings: int
    successful: int
    failed: int
    errors: list[str] = []


class IndexStatsResponse(BaseModel):
    """Response with index statistics."""
    total_documents: int
    total_meetings: int
    by_content_type: dict[str, int]
    index_size_bytes: Optional[int] = None
    last_updated: Optional[str] = None


@router.post(
    "/admin/reindex/{meeting_id}",
    response_model=ReindexResponse,
    summary="Manually reindex a meeting",
    status_code=status.HTTP_200_OK
)
async def reindex_meeting_endpoint(
    meeting_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger reindexing of a specific meeting.
    
    This endpoint allows meeting owners to force reindexing of their meeting
    to the Knowledge Base. Useful after manual updates or to fix indexing issues.
    
    Args:
        meeting_id: ID of the meeting to reindex.
        
    Returns:
        ReindexResponse with operation status.
        
    Raises:
        404: Meeting not found.
        403: User doesn't own the meeting.
        500: Reindexing failed.
    """
    logger.info(f"Manual reindex requested for meeting {meeting_id} by user {current_user.id}")
    
    try:
        # Get meeting
        from app.crud import crud_meetings
        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        
        if not meeting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Meeting not found"
            )
        
        # Check ownership
        if str(meeting.uploader_id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only reindex your own meetings"
            )
        
        # Reindex
        from app.services.meeting_indexing_service import reindex_meeting
        success = await reindex_meeting(meeting)
        
        if not success:
            return ReindexResponse(
                success=False,
                meeting_id=meeting_id,
                message="No content to index (meeting may not be processed yet)"
            )
        
        # Count documents (estimate based on meeting content)
        doc_count = 0
        if meeting.transcription:
            doc_count += 1
        if meeting.ai_analysis:
            doc_count += 1
            if meeting.ai_analysis.action_items:
                doc_count += 1
            if meeting.ai_analysis.key_topics:
                doc_count += 1
            if meeting.ai_analysis.decisions_made:
                doc_count += 1
        
        logger.info(f"Successfully reindexed meeting {meeting_id}")
        
        return ReindexResponse(
            success=True,
            meeting_id=meeting_id,
            documents_indexed=doc_count,
            message=f"Successfully reindexed {doc_count} documents"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reindexing meeting {meeting_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reindex meeting: {str(e)}"
        )


@router.post(
    "/admin/reindex-all",
    response_model=BulkReindexResponse,
    summary="Bulk reindex all meetings",
    status_code=status.HTTP_200_OK
)
async def bulk_reindex_meetings(
    project_id: Optional[str] = None,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """Bulk reindex all meetings (or meetings for a specific project).
    
    This is an admin operation that reindexes multiple meetings to the Knowledge Base.
    Useful for:
    - Initial setup of the Knowledge Base
    - Recovery after index corruption
    - Updating index schema
    
    Args:
        project_id: Optional - Only reindex meetings from this project.
        
    Returns:
        BulkReindexResponse with operation statistics.
        
    Note: This operation may take a while for large datasets.
    """
    logger.info(f"Bulk reindex requested by user {current_user.id}, project_id={project_id}")
    
    try:
        from app.crud import crud_meetings
        from app.services.meeting_indexing_service import reindex_meeting
        from app.models.enums.processing_stage import ProcessingStage
        
        # Get meetings to reindex
        if project_id:
            meetings = await crud_meetings.get_meetings_by_project(database, project_id)
        else:
            # Get all meetings (using filter with no constraints)
            meetings = await crud_meetings.get_meetings_filtered(
                database, q=None, project_ids=None, tags=None, sort_by="created_at"
            )
        
        total = len(meetings)
        successful = 0
        failed = 0
        errors = []
        
        logger.info(f"Starting bulk reindex of {total} meetings")
        
        for meeting in meetings:
            # Only reindex completed meetings with content
            if (meeting.processing_status.current_stage != ProcessingStage.COMPLETED or
                (not meeting.transcription and not meeting.ai_analysis)):
                continue
            
            try:
                success = await reindex_meeting(meeting)
                if success:
                    successful += 1
                else:
                    failed += 1
                    errors.append(f"Meeting {meeting.id}: No content to index")
            except Exception as e:
                failed += 1
                error_msg = f"Meeting {meeting.id}: {str(e)}"
                errors.append(error_msg)
                logger.error(f"Failed to reindex meeting {meeting.id}: {e}")
        
        logger.info(f"Bulk reindex completed: {successful} successful, {failed} failed")
        
        return BulkReindexResponse(
            success=failed == 0,
            total_meetings=total,
            successful=successful,
            failed=failed,
            errors=errors[:10]  # Limit error list to first 10
        )
        
    except Exception as e:
        logger.error(f"Error in bulk reindex: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk reindex failed: {str(e)}"
        )


@router.get(
    "/admin/stats",
    response_model=IndexStatsResponse,
    summary="Get Knowledge Base statistics",
    status_code=status.HTTP_200_OK
)
async def get_knowledge_base_stats(
    current_user: User = Depends(get_current_user),
):
    """Get statistics about the Knowledge Base index.
    
    Returns information about:
    - Total number of indexed documents
    - Number of unique meetings
    - Breakdown by content type
    - Index size
    
    Returns:
        IndexStatsResponse with current statistics.
    """
    logger.info(f"Stats requested by user {current_user.id}")
    
    try:
        from app.services.elasticsearch_indexing_service import get_index_stats
        
        stats = await get_index_stats()
        
        return IndexStatsResponse(
            total_documents=stats.get("total_documents", 0),
            total_meetings=stats.get("total_meetings", 0),
            by_content_type=stats.get("by_content_type", {}),
            index_size_bytes=stats.get("index_size_bytes"),
            last_updated=stats.get("last_updated"),
        )
        
    except Exception as e:
        logger.error(f"Error getting index stats: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )
