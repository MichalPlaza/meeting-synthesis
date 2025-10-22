import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

from ..core.config import MONGO_DETAILS, DATABASE_NAME
from ..core.redis_client import publish_event
from ..crud import crud_meetings
from ..schemas.meeting_schema import MeetingUpdate
from ..models.processing_status import ProcessingStatus
from ..models.enums.processing_stage import ProcessingStage
from ..models.transcrpion import Transcription
from ..services.whisper_service import transcribe_audio
from .celery_app import celery_app

from ..services.ai_analysis_service import AIAnalysisService

UPLOAD_DIR = "uploads"


async def run_processing(meeting_id: str):
    motor_client = None
    try:
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        database = motor_client[DATABASE_NAME]
        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.TRANSCRIBING))
        )

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)

        if not meeting or not meeting.audio_file:
            raise ValueError(f"Meeting or audio file not found for ID: {meeting_id}")

        filename = os.path.basename(meeting.audio_file.storage_path_or_url)
        local_file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(local_file_path):
            raise FileNotFoundError(f"Audio file not found at path: {local_file_path}")

        print(f"[{meeting_id}] Starting transcription...")
        full_text = await transcribe_audio(local_file_path)
        transcription_obj = Transcription(full_text=full_text)
        await crud_meetings.update_meeting(
            database, meeting_id, MeetingUpdate(transcription=transcription_obj)
        )
        print(f"[{meeting_id}] Transcription finished.")

        print(f"[{meeting_id}] Starting AI analysis...")
        await crud_meetings.update_meeting(
            database,
            meeting_id,
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.ANALYZING))
        )

        ai_service = AIAnalysisService.get_instance()
        await ai_service.run_ai_analysis(database, meeting_id, full_text)
        print(f"[{meeting_id}] AI analysis finished.")

        meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
        if not meeting:
            raise ValueError(f"Meeting not found after analysis for ID: {meeting_id}")

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
        print(f"Successfully processed meeting ID: {meeting_id}")

    except Exception as e:
        import traceback
        print(f"Error processing meeting ID {meeting_id}: {e}")
        traceback.print_exc()
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
            except Exception:
                import logging
                logging.exception("Failed to write FAILED status to DB")
    finally:
        if motor_client:
            database = motor_client[DATABASE_NAME]
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
            except Exception:
                import logging
                logging.exception("Failed to publish meeting_processed event")
        if motor_client:
            motor_client.close()


@celery_app.task(name="process_meeting_audio")
def process_meeting_audio(meeting_id: str):
    motor_client = AsyncIOMotorClient(MONGO_DETAILS)
    database = motor_client[DATABASE_NAME]
    asyncio.run(crud_meetings.update_meeting(
        database,
        meeting_id,
        MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.QUEUED))
    ))
    motor_client.close()
    asyncio.run(run_processing(meeting_id))
