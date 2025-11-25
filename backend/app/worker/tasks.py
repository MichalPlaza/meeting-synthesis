
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from ..core.config import MONGO_DETAILS, DATABASE_NAME
from ..core.redis_client import publish_event
from ..crud import crud_meetings
from ..schemas.meeting_schema import MeetingUpdate
from ..models.processing_status import ProcessingStatus
from ..models.enums.processing_stage import ProcessingStage
from ..models.transcription import Transcription
from ..services.whisper_service import transcribe_audio
from .celery_app import celery_app

from ..services.ai_analysis_service import AIAnalysisService

UPLOAD_DIR = "uploads"
logger = logging.getLogger(__name__)


async def run_processing(meeting_id: str):
    motor_client = None
    try:
        logger.info(f"[Meeting ID: {meeting_id}] Starting full processing flow.")
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        database = motor_client[DATABASE_NAME]
        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.TRANSCRIBING))
        )
        logger.info(f"[Meeting ID: {meeting_id}] Status updated to TRANSCRIBING.")

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)

        if not meeting or not meeting.audio_file:
            logger.error(f"[Meeting ID: {meeting_id}] Meeting or audio file not found.")
            raise ValueError(f"Meeting or audio file not found for ID: {meeting_id}")

        filename = os.path.basename(meeting.audio_file.storage_path_or_url)
        local_file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(local_file_path):
            logger.error(f"[Meeting ID: {meeting_id}] Audio file not found at path: {local_file_path}")
            raise FileNotFoundError(f"Audio file not found at path: {local_file_path}")

        logger.info(f"[Meeting ID: {meeting_id}] Starting transcription...")
        full_text = await transcribe_audio(local_file_path)
        transcription_obj = Transcription(full_text=full_text)
        await crud_meetings.update_meeting(
            database, meeting_id, MeetingUpdate(transcription=transcription_obj)
        )
        logger.info(f"[Meeting ID: {meeting_id}] Transcription finished.")

        logger.info(f"[Meeting ID: {meeting_id}] Starting AI analysis...")
        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.ANALYZING))
        )
        logger.info(f"[Meeting ID: {meeting_id}] Status updated to ANALYZING.")

        ai_service = AIAnalysisService.get_instance()
        await ai_service.run_ai_analysis(database, meeting_id, full_text)
        logger.info(f"[Meeting ID: {meeting_id}] AI analysis finished.")

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            logger.error(f"[Meeting ID: {meeting_id}] Meeting not found after analysis.")
            raise ValueError(f"Meeting not found after analysis for ID: {meeting_id}")

        # Index to Knowledge Base (Elasticsearch)
        logger.info(f"[Meeting ID: {meeting_id}] Starting Knowledge Base indexing...")
        from ..services.meeting_indexing_service import index_meeting_to_knowledge_base
        try:
            indexed = await index_meeting_to_knowledge_base(meeting)
            if indexed:
                logger.info(f"[Meeting ID: {meeting_id}] Successfully indexed to Knowledge Base.")
            else:
                logger.warning(f"[Meeting ID: {meeting_id}] Knowledge Base indexing returned False (no content?).")
        except Exception as kb_e:
            logger.error(f"[Meeting ID: {meeting_id}] Knowledge Base indexing failed: {kb_e}", exc_info=True)
            # Don't fail the whole process if indexing fails

        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(
                    current_stage=ProcessingStage.COMPLETED,
                    completed_at=datetime.now(timezone.utc)
                )
            )
        )
        logger.info(f"[Meeting ID: {meeting_id}] Successfully processed and status updated to COMPLETED.")

    except Exception as e:
        logger.exception(f"[Meeting ID: {meeting_id}] Error during processing: {e}")
        if motor_client:
            database = motor_client[DATABASE_NAME]
            try:
                await crud_meetings.update_meeting(
                    database,
                    meeting_id,
                    MeetingUpdate(
                        processing_status=ProcessingStatus(
                            current_stage=ProcessingStage.FAILED, error_message=str(e)
                        )
                    ),
                )
                logger.error(f"[Meeting ID: {meeting_id}] Status updated to FAILED due to error.")
            except Exception as db_e:
                logger.exception(f"[Meeting ID: {meeting_id}] Failed to write FAILED status to DB: {db_e}")
    finally:
        if motor_client:
            try:
                final_status = await crud_meetings.get_meeting_by_id(database, meeting_id)
                if final_status:
                    event = {
                        "event_type": "meeting_processed",
                        "meeting_id": str(final_status.id),
                        "project_id": str(final_status.project_id),
                        "uploader_id": str(final_status.uploader_id),
                        "status": final_status.processing_status.current_stage.value,
                        "title": final_status.title,
                    }
                    await publish_event(event)
                    logger.info(f"[Meeting ID: {meeting_id}] Published meeting_processed event with status: {final_status.processing_status.current_stage.value}")
            except Exception as pub_e:
                logger.exception(f"[Meeting ID: {meeting_id}] Failed to publish meeting_processed event: {pub_e}")
            finally:
                motor_client.close()
                logger.info(f"[Meeting ID: {meeting_id}] MongoDB client closed.")


@celery_app.task(name="process_meeting_audio")
def process_meeting_audio(meeting_id: str):
    logger.info(f"[Celery Task] Received task to process meeting audio for ID: {meeting_id}")
    motor_client = AsyncIOMotorClient(MONGO_DETAILS)
    database = motor_client[DATABASE_NAME]
    asyncio.run(crud_meetings.update_meeting(
        database,
        meeting_id,
        MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.QUEUED))
    ))
    logger.info(f"[Celery Task] Meeting ID: {meeting_id} status updated to QUEUED.")
    motor_client.close()
    asyncio.run(run_processing(meeting_id))
    logger.info(f"[Celery Task] Finished processing task for meeting ID: {meeting_id}")

