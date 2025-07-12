import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, UTC

from ..core.config import MONGO_DETAILS, DATABASE_NAME
from ..core.redis_client import publish_event
from ..crud import crud_meetings
from ..models.enums.processing_stage import ProcessingStage
from ..models.processing_status import ProcessingStatus
from ..models.transcrpion import Transcription
from ..schemas.meeting_schema import MeetingUpdate
from ..services.ai_analysis_service import analyze_transcription
from ..services.whisper_service import transcribe_audio
from .celery_app import celery_app

UPLOAD_DIR = "uploads"

async def run_processing(meeting_id: str):
    motor_client = None
    meeting = None
    try:
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        db = motor_client[DATABASE_NAME]

        # --- KROK 1: Poinformuj, że zadanie zostało podjęte ---
        await crud_meetings.update_meeting(
            db,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(current_stage=ProcessingStage.TRANSCRIBING)
            ),
        )

        meeting = await crud_meetings.get_meeting_by_id(db, meeting_id)

        if not meeting or not meeting.audio_file:
            raise ValueError(f"Meeting or audio file not found for ID: {meeting_id}")
            
        filename = os.path.basename(meeting.audio_file.storage_path_or_url)
        local_file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(local_file_path):
             raise FileNotFoundError(f"Audio file not found at path: {local_file_path}")

        # --- KROK 2: Transkrypcja ---
        print(f"[{meeting_id}] Starting transcription...")
        full_text = await transcribe_audio(local_file_path)
        transcription_obj = Transcription(full_text=full_text)
        await crud_meetings.update_meeting(
            db, meeting_id, MeetingUpdate(transcription=transcription_obj)
        )
        print(f"[{meeting_id}] Transcription finished.")

        # --- KROK 3: Analiza AI ---
        print(f"[{meeting_id}] Starting AI analysis...")
        await crud_meetings.update_meeting(
            db,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(current_stage=ProcessingStage.ANALYZING)
            ),
        )
        ai_analysis_obj = await analyze_transcription(full_text)
        await crud_meetings.update_meeting(
            db, meeting_id, MeetingUpdate(ai_analysis=ai_analysis_obj)
        )
        print(f"[{meeting_id}] AI analysis finished.")

        meeting = await crud_meetings.get_meeting_by_id(db, meeting_id)

        if not meeting:
            raise ValueError(f"Meeting or audio file not found for ID: {meeting_id}")

        # --- KROK 4: Zakończenie ---
        await crud_meetings.update_meeting(
            db,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(
                    current_stage=ProcessingStage.COMPLETED,
                    completed_at=datetime.now(UTC)
                )
            ),
        )
        print(f"Successfully processed meeting ID: {meeting_id}")

    except Exception as e:
        print(f"Error processing meeting ID {meeting_id}: {e}")
        if motor_client:
            db = motor_client[DATABASE_NAME]
            await crud_meetings.update_meeting(
                db,
                meeting_id,
                MeetingUpdate(
                    processing_status=ProcessingStatus(
                        current_stage=ProcessingStage.FAILED, error_message=str(e)
                    )
                ),
            )
    finally:
        if meeting:
            final_status = await crud_meetings.get_meeting_by_id(db, meeting_id)
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

        if motor_client:
            motor_client.close()


@celery_app.task(name="process_meeting_audio")
def process_meeting_audio(meeting_id: str):
    # Ustawiamy status QUEUED zaraz po wywołaniu zadania
    # (ta część kodu wykona się niemal natychmiast)
    motor_client = AsyncIOMotorClient(MONGO_DETAILS)
    db = motor_client[DATABASE_NAME]
    asyncio.run(crud_meetings.update_meeting(
        db,
        meeting_id,
        MeetingUpdate(
            processing_status=ProcessingStatus(current_stage=ProcessingStage.QUEUED)
        )
    ))
    motor_client.close()

    # Następnie uruchamiamy główną logikę przetwarzania
    asyncio.run(run_processing(meeting_id))