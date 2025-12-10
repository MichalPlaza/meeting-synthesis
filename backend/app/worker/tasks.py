"""Celery tasks for meeting audio processing.

This module handles the async processing pipeline for meetings:
transcription, AI analysis, and knowledge base indexing.
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import logging

from ..core.config import MONGO_DETAILS, DATABASE_NAME
from ..core.redis_client import publish_event
from ..crud import crud_meetings
from ..schemas.meeting_schema import MeetingUpdate
from ..models.processing_status import ProcessingStatus
from ..models.enums.processing_stage import ProcessingStage
from ..models.transcription import Transcription
from ..models.meeting import Meeting
from ..services.whisper_service import transcribe_audio, transcribe_audio_with_segments
from ..services.diarization_service import add_speaker_labels, is_diarization_available
from .celery_app import celery_app

from ..services.ai_analysis_service import AIAnalysisService

UPLOAD_DIR = "uploads"
logger = logging.getLogger(__name__)


async def _update_processing_stage(
    database: AsyncIOMotorDatabase,
    meeting_id: str,
    stage: ProcessingStage,
    error_message: str | None = None,
    completed_at: datetime | None = None,
) -> None:
    """Update meeting processing stage.

    Args:
        database: MongoDB database instance.
        meeting_id: ID of the meeting to update.
        stage: New processing stage.
        error_message: Optional error message for failed stage.
        completed_at: Optional completion timestamp.
    """
    status = ProcessingStatus(
        current_stage=stage,
        error_message=error_message,
        completed_at=completed_at,
    )
    await crud_meetings.update_meeting(
        database, meeting_id, MeetingUpdate(processing_status=status)
    )
    logger.info(f"[Meeting ID: {meeting_id}] Status updated to {stage.value}.")


async def _run_transcription(
    database: AsyncIOMotorDatabase,
    meeting_id: str,
    meeting: Meeting,
) -> str:
    """Execute transcription phase with optional speaker diarization.

    Args:
        database: MongoDB database instance.
        meeting_id: ID of the meeting.
        meeting: Meeting object with audio file info.

    Returns:
        Transcribed text.

    Raises:
        FileNotFoundError: If audio file doesn't exist.
    """
    filename = os.path.basename(meeting.audio_file.storage_path_or_url)
    local_file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(local_file_path):
        raise FileNotFoundError(f"Audio file not found at path: {local_file_path}")

    logger.info(f"[Meeting ID: {meeting_id}] Starting transcription with segments...")
    result = await transcribe_audio_with_segments(local_file_path)

    # Optionally add speaker labels via diarization
    segments = result.segments
    if is_diarization_available():
        logger.info(f"[Meeting ID: {meeting_id}] Running speaker diarization...")
        segments = await add_speaker_labels(local_file_path, segments)
        logger.info(f"[Meeting ID: {meeting_id}] Diarization complete.")

    # Convert segments to dict format for MongoDB
    segments_data = [seg.model_dump() for seg in segments]

    transcription_obj = Transcription(full_text=result.full_text, segments=segments)
    await crud_meetings.update_meeting(
        database, meeting_id, MeetingUpdate(transcription=transcription_obj)
    )
    logger.info(f"[Meeting ID: {meeting_id}] Transcription finished with {len(segments)} segments.")

    return result.full_text


async def _run_ai_analysis(
    database: AsyncIOMotorDatabase,
    meeting_id: str,
    full_text: str,
) -> None:
    """Execute AI analysis phase.

    Args:
        database: MongoDB database instance.
        meeting_id: ID of the meeting.
        full_text: Transcribed text to analyze.
    """
    await _update_processing_stage(database, meeting_id, ProcessingStage.ANALYZING)

    ai_service = AIAnalysisService.get_instance()
    await ai_service.run_ai_analysis(database, meeting_id, full_text)
    logger.info(f"[Meeting ID: {meeting_id}] AI analysis finished.")


async def _run_indexing(meeting: Meeting) -> bool:
    """Index meeting to knowledge base.

    Non-critical operation - failures are logged but don't stop processing.

    Args:
        meeting: Meeting object to index.

    Returns:
        True if indexing succeeded, False otherwise.
    """
    from ..services.meeting_indexing_service import index_meeting_to_knowledge_base

    meeting_id = str(meeting.id)
    logger.info(f"[Meeting ID: {meeting_id}] Starting Knowledge Base indexing...")

    try:
        indexed = await index_meeting_to_knowledge_base(meeting)
        if indexed:
            logger.info(f"[Meeting ID: {meeting_id}] Successfully indexed to Knowledge Base.")
        else:
            logger.warning(f"[Meeting ID: {meeting_id}] Knowledge Base indexing returned False (no content?).")
        return indexed
    except Exception as e:
        logger.error(f"[Meeting ID: {meeting_id}] Knowledge Base indexing failed: {e}", exc_info=True)
        return False


async def _publish_completion_event(
    database: AsyncIOMotorDatabase,
    meeting_id: str,
) -> None:
    """Publish meeting processed event to Redis.

    Args:
        database: MongoDB database instance.
        meeting_id: ID of the meeting.
    """
    try:
        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if meeting:
            event = {
                "event_type": "meeting_processed",
                "meeting_id": str(meeting.id),
                "project_id": str(meeting.project_id),
                "uploader_id": str(meeting.uploader_id),
                "status": meeting.processing_status.current_stage.value,
                "title": meeting.title,
            }
            await publish_event(event)
            logger.info(
                f"[Meeting ID: {meeting_id}] Published meeting_processed event "
                f"with status: {meeting.processing_status.current_stage.value}"
            )
    except Exception as e:
        logger.exception(f"[Meeting ID: {meeting_id}] Failed to publish meeting_processed event: {e}")


async def run_processing(meeting_id: str) -> None:
    """Execute full meeting processing pipeline.

    Pipeline stages:
    1. Transcription - Convert audio to text
    2. AI Analysis - Extract insights from transcription
    3. Indexing - Add to knowledge base for search

    Args:
        meeting_id: ID of the meeting to process.
    """
    motor_client = None
    try:
        logger.info(f"[Meeting ID: {meeting_id}] Starting full processing flow.")
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        database = motor_client[DATABASE_NAME]

        # Phase 1: Transcription
        await _update_processing_stage(database, meeting_id, ProcessingStage.TRANSCRIBING)

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting or not meeting.audio_file:
            raise ValueError(f"Meeting or audio file not found for ID: {meeting_id}")

        full_text = await _run_transcription(database, meeting_id, meeting)

        # Phase 2: AI Analysis
        await _run_ai_analysis(database, meeting_id, full_text)

        # Phase 3: Knowledge Base Indexing (non-critical)
        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            raise ValueError(f"Meeting not found after analysis for ID: {meeting_id}")

        await _run_indexing(meeting)

        # Mark complete
        await _update_processing_stage(
            database,
            meeting_id,
            ProcessingStage.COMPLETED,
            completed_at=datetime.now(timezone.utc),
        )
        logger.info(f"[Meeting ID: {meeting_id}] Successfully processed.")

    except Exception as e:
        logger.exception(f"[Meeting ID: {meeting_id}] Error during processing: {e}")
        if motor_client:
            try:
                database = motor_client[DATABASE_NAME]
                await _update_processing_stage(
                    database,
                    meeting_id,
                    ProcessingStage.FAILED,
                    error_message=str(e),
                )
            except Exception as db_e:
                logger.exception(f"[Meeting ID: {meeting_id}] Failed to write FAILED status to DB: {db_e}")

    finally:
        if motor_client:
            database = motor_client[DATABASE_NAME]
            await _publish_completion_event(database, meeting_id)
            motor_client.close()
            logger.info(f"[Meeting ID: {meeting_id}] MongoDB client closed.")


@celery_app.task(name="process_meeting_audio")
def process_meeting_audio(meeting_id: str) -> None:
    """Celery task to process meeting audio.

    Sets initial QUEUED status and runs the async processing pipeline.

    Args:
        meeting_id: ID of the meeting to process.
    """
    logger.info(f"[Celery Task] Received task to process meeting audio for ID: {meeting_id}")

    motor_client = AsyncIOMotorClient(MONGO_DETAILS)
    database = motor_client[DATABASE_NAME]
    asyncio.run(
        _update_processing_stage(database, meeting_id, ProcessingStage.QUEUED)
    )
    motor_client.close()

    asyncio.run(run_processing(meeting_id))
    logger.info(f"[Celery Task] Finished processing task for meeting ID: {meeting_id}")


async def run_reanalysis(meeting_id: str) -> None:
    """Execute re-analysis pipeline on existing transcription.

    Pipeline stages:
    1. AI Analysis - Re-extract insights from existing transcription
    2. Indexing - Re-index to knowledge base for search

    Args:
        meeting_id: ID of the meeting to re-analyze.
    """
    motor_client = None
    try:
        logger.info(f"[Meeting ID: {meeting_id}] Starting re-analysis flow.")
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        database = motor_client[DATABASE_NAME]

        # Get meeting with existing transcription
        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            raise ValueError(f"Meeting not found for ID: {meeting_id}")

        if not meeting.transcription or not meeting.transcription.full_text:
            raise ValueError(f"No transcription found for meeting ID: {meeting_id}")

        full_text = meeting.transcription.full_text

        # Run AI Analysis
        await _run_ai_analysis(database, meeting_id, full_text)

        # Re-index to Knowledge Base (non-critical)
        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            raise ValueError(f"Meeting not found after analysis for ID: {meeting_id}")

        await _run_indexing(meeting)

        # Mark complete
        await _update_processing_stage(
            database,
            meeting_id,
            ProcessingStage.COMPLETED,
            completed_at=datetime.now(timezone.utc),
        )
        logger.info(f"[Meeting ID: {meeting_id}] Re-analysis completed successfully.")

    except Exception as e:
        logger.exception(f"[Meeting ID: {meeting_id}] Error during re-analysis: {e}")
        if motor_client:
            try:
                database = motor_client[DATABASE_NAME]
                await _update_processing_stage(
                    database,
                    meeting_id,
                    ProcessingStage.FAILED,
                    error_message=str(e),
                )
            except Exception as db_e:
                logger.exception(f"[Meeting ID: {meeting_id}] Failed to write FAILED status to DB: {db_e}")

    finally:
        if motor_client:
            database = motor_client[DATABASE_NAME]
            await _publish_completion_event(database, meeting_id)
            motor_client.close()
            logger.info(f"[Meeting ID: {meeting_id}] MongoDB client closed.")


@celery_app.task(name="reanalyze_meeting")
def reanalyze_meeting(meeting_id: str) -> None:
    """Celery task to re-analyze meeting using existing transcription.

    Re-runs AI analysis and knowledge base indexing without re-transcribing.

    Args:
        meeting_id: ID of the meeting to re-analyze.
    """
    logger.info(f"[Celery Task] Received task to re-analyze meeting for ID: {meeting_id}")

    motor_client = AsyncIOMotorClient(MONGO_DETAILS)
    database = motor_client[DATABASE_NAME]
    asyncio.run(
        _update_processing_stage(database, meeting_id, ProcessingStage.ANALYZING)
    )
    motor_client.close()

    asyncio.run(run_reanalysis(meeting_id))
    logger.info(f"[Celery Task] Finished re-analysis task for meeting ID: {meeting_id}")
