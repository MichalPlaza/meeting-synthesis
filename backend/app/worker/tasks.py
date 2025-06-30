import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

from ..core.config import MONGO_DETAILS, DATABASE_NAME
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
    try:
        motor_client = AsyncIOMotorClient(MONGO_DETAILS)
        db = motor_client[DATABASE_NAME]

        meeting = await crud_meetings.get_meeting_by_id(db, meeting_id)
        if not meeting or not meeting.audio_file:
            print(f"Meeting or audio file not found for ID: {meeting_id}")
            return
            
        filename = os.path.basename(meeting.audio_file.storage_path_or_url)
        local_file_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(local_file_path):
             raise FileNotFoundError(f"Audio file not found at path: {local_file_path}")

        await crud_meetings.update_meeting(
            db,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(current_stage=ProcessingStage.PROCESSING)
            ),
        )

        full_text = await transcribe_audio(local_file_path)
        transcription_obj = Transcription(full_text=full_text)
        await crud_meetings.update_meeting(
            db, meeting_id, MeetingUpdate(transcription=transcription_obj)
        )

        ai_analysis_obj = await analyze_transcription(full_text)
        await crud_meetings.update_meeting(
            db, meeting_id, MeetingUpdate(ai_analysis=ai_analysis_obj)
        )

        await crud_meetings.update_meeting(
            db,
            meeting_id,
            MeetingUpdate(
                processing_status=ProcessingStatus(
                    current_stage=ProcessingStage.COMPLETED
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
        if motor_client:
            motor_client.close()


@celery_app.task(name="process_meeting_audio")
def process_meeting_audio(meeting_id: str):
    asyncio.run(run_processing(meeting_id))