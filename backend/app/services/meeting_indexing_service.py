"""Meeting indexing service for Knowledge Base integration.

This service automatically indexes meetings to Elasticsearch when they're
processed, enabling semantic search and RAG functionality.
"""

import logging
from typing import Optional

from app.models.meeting import Meeting
from app.services.embedding_service import generate_embedding
from app.services.elasticsearch_indexing_service import (
    index_meeting_document,
    delete_meeting_documents,
)

logger = logging.getLogger(__name__)


async def index_meeting_to_knowledge_base(meeting: Meeting) -> bool:
    """Index a meeting to the Knowledge Base.
    
    Creates multiple Elasticsearch documents for different content types:
    - Transcription (full text)
    - AI Summary
    - Action Items (if present)
    - Key Topics (if present)
    - Decisions Made (if present)
    
    Args:
        meeting: Meeting object with transcription and/or AI analysis.
        
    Returns:
        True if successfully indexed, False otherwise.
    """
    logger.info(f"Starting Knowledge Base indexing for meeting {meeting.id}")
    
    try:
        indexed_count = 0
        
        # Base metadata for all documents
        base_metadata = {
            "meeting_id": str(meeting.id),
            "title": meeting.title,
            "project_id": str(meeting.project_id),
            "user_id": str(meeting.uploader_id),
            "meeting_datetime": meeting.meeting_datetime.isoformat(),
            "tags": meeting.tags,
        }
        
        # 1. Index transcription if available
        if meeting.transcription and meeting.transcription.full_text:
            logger.debug(f"Indexing transcription for meeting {meeting.id}")
            
            content = meeting.transcription.full_text
            
            doc_id = await index_meeting_document(
                meeting_id=str(meeting.id),
                project_id=str(meeting.project_id),
                user_id=str(meeting.uploader_id),
                title=meeting.title,
                content=content,
                content_type="transcription",
                tags=meeting.tags,
                meeting_datetime=meeting.meeting_datetime,
            )
            if doc_id:
                indexed_count += 1
                logger.debug("Transcription indexed successfully")
        
        # 2. Index AI analysis if available
        if meeting.ai_analysis:
            ai = meeting.ai_analysis
            
            # 2a. Index summary
            if ai.summary:
                logger.debug(f"Indexing summary for meeting {meeting.id}")
                
                doc_id = await index_meeting_document(
                    meeting_id=str(meeting.id),
                    project_id=str(meeting.project_id),
                    user_id=str(meeting.uploader_id),
                    title=meeting.title,
                    content=ai.summary,
                    content_type="summary",
                    tags=meeting.tags,
                    meeting_datetime=meeting.meeting_datetime,
                )
                if doc_id:
                    indexed_count += 1
                    logger.debug("Summary indexed successfully")
            
            # 2b. Index action items
            if ai.action_items:
                logger.debug(f"Indexing {len(ai.action_items)} action items for meeting {meeting.id}")
                
                # Combine all action items into one document
                action_text = "\n".join([
                    f"- {item.description} (Assigned to: {item.assigned_to or 'Unassigned'})"
                    for item in ai.action_items
                ])
                
                doc_id = await index_meeting_document(
                    meeting_id=str(meeting.id),
                    project_id=str(meeting.project_id),
                    user_id=str(meeting.uploader_id),
                    title=meeting.title,
                    content=action_text,
                    content_type="action_items",
                    tags=meeting.tags,
                    meeting_datetime=meeting.meeting_datetime,
                    metadata={"count": len(ai.action_items)},
                )
                if doc_id:
                    indexed_count += 1
                    logger.debug("Action items indexed successfully")
            
            # 2c. Index key topics
            if ai.key_topics:
                logger.debug(f"Indexing {len(ai.key_topics)} key topics for meeting {meeting.id}")
                
                topics_text = "\n".join([
                    f"- {topic.topic}: {topic.details or 'No details'}"
                    for topic in ai.key_topics
                ])
                
                doc_id = await index_meeting_document(
                    meeting_id=str(meeting.id),
                    project_id=str(meeting.project_id),
                    user_id=str(meeting.uploader_id),
                    title=meeting.title,
                    content=topics_text,
                    content_type="key_topics",
                    tags=meeting.tags,
                    meeting_datetime=meeting.meeting_datetime,
                    metadata={"count": len(ai.key_topics)},
                )
                if doc_id:
                    indexed_count += 1
                    logger.debug("Key topics indexed successfully")
            
            # 2d. Index decisions
            if ai.decisions_made:
                logger.debug(f"Indexing {len(ai.decisions_made)} decisions for meeting {meeting.id}")
                
                decisions_text = "\n".join([
                    f"- {decision.description}"
                    for decision in ai.decisions_made
                ])
                
                doc_id = await index_meeting_document(
                    meeting_id=str(meeting.id),
                    project_id=str(meeting.project_id),
                    user_id=str(meeting.uploader_id),
                    title=meeting.title,
                    content=decisions_text,
                    content_type="decisions",
                    tags=meeting.tags,
                    meeting_datetime=meeting.meeting_datetime,
                    metadata={"count": len(ai.decisions_made)},
                )
                if doc_id:
                    indexed_count += 1
                    logger.debug("Decisions indexed successfully")
        
        if indexed_count > 0:
            logger.info(f"Successfully indexed {indexed_count} documents for meeting {meeting.id}")
            return True
        else:
            logger.warning(f"No content to index for meeting {meeting.id}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to index meeting {meeting.id}: {e}", exc_info=True)
        return False


async def delete_meeting_from_knowledge_base(meeting_id: str) -> bool:
    """Delete all documents for a meeting from the Knowledge Base.
    
    Args:
        meeting_id: ID of the meeting to delete.
        
    Returns:
        True if successfully deleted, False otherwise.
    """
    logger.info(f"Deleting meeting {meeting_id} from Knowledge Base")
    
    try:
        success = await delete_meeting_documents(meeting_id)
        
        if success:
            logger.info(f"Successfully deleted meeting {meeting_id} from Knowledge Base")
        else:
            logger.warning(f"Failed to delete meeting {meeting_id} from Knowledge Base")
        
        return success
        
    except Exception as e:
        logger.error(f"Error deleting meeting {meeting_id}: {e}", exc_info=True)
        return False


async def reindex_meeting(meeting: Meeting) -> bool:
    """Reindex a meeting (delete old, index new).
    
    Used when a meeting is updated to refresh the index.
    
    Args:
        meeting: Updated meeting object.
        
    Returns:
        True if successfully reindexed, False otherwise.
    """
    logger.info(f"Reindexing meeting {meeting.id}")
    
    # Delete old documents
    await delete_meeting_from_knowledge_base(str(meeting.id))
    
    # Index new documents
    return await index_meeting_to_knowledge_base(meeting)
