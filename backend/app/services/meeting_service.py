import os
import shutil
import uuid
from mutagen.mp3 import MP3
from mutagen.wave import WAVE
from mutagen.flac import FLAC
from mutagen.mp4 import MP4

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from .ai_analysis_service import analyze_transcription
from .whisper_service import transcribe_audio
from ..crud import crud_meetings
from ..models.audio_file import AudioFile
from ..models.enums.processing_stage import ProcessingStage
from ..models.meeting import Meeting
from ..models.processing_status import ProcessingStatus
from ..models.transcrpion import Transcription
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate, MeetingCreateForm


def get_audio_duration(file_path: str, mimetype: str) -> int | None:
    """Calculates the duration of an audio file in seconds."""
    try:
        if 'mp3' in mimetype:
            audio = MP3(file_path)
        elif 'wav' in mimetype:
            audio = WAVE(file_path)
        elif 'flac' in mimetype:
            audio = FLAC(file_path)
        elif 'mp4' in mimetype or 'm4a' in mimetype:
            audio = MP4(file_path)
        else:
            return None # Unsupported format
        return int(audio.info.length)
    except Exception as e:
        print(f"Could not read duration from {file_path}: {e}")
        return None

async def create_new_meeting(db: AsyncIOMotorDatabase, data: MeetingCreate) -> Meeting:
    return await crud_meetings.create_meeting(db, data)


async def get_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> Meeting | None:
    return await crud_meetings.get_meeting_by_id(db, meeting_id)


async def get_meetings(db: AsyncIOMotorDatabase) -> list[Meeting]:
    return await crud_meetings.get_all_meetings(db)


async def get_meetings_for_project(
    db: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    return await crud_meetings.get_meetings_by_project(db, project_id)


async def get_meetings_with_filters(
    db: AsyncIOMotorDatabase,
    q: str | None,
    project_ids: list[str] | None,
    tags: list[str] | None,
    sort_by: str,
) -> list[Meeting]:
    return await crud_meetings.get_meetings_filtered(db, q, project_ids, tags, sort_by)


async def update_existing_meeting(
    db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    return await crud_meetings.update_meeting(db, meeting_id, update_data)


async def delete_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    return await crud_meetings.delete_meeting(db, meeting_id)


UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def handle_meeting_upload(
    db: AsyncIOMotorDatabase, meeting_data: MeetingCreateForm, audio_file: UploadFile
) -> Meeting:
    original_filename = audio_file.filename or "uploaded_file"
    extension = original_filename.split(".")[-1]
    generated_filename = f"{uuid.uuid4().hex}.{extension}"
    storage_path = os.path.join(UPLOAD_DIR, generated_filename)

    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
    
    duration = get_audio_duration(storage_path, audio_file.content_type or "")

    audio_data = AudioFile(
        original_filename=original_filename,
        storage_path_or_url=storage_path,
        mimetype=audio_file.content_type or "application/octet-stream"
    )
    
    full_data = meeting_data.to_meeting_create(audio_data, duration)
    meeting = await crud_meetings.create_meeting(db, full_data)

    try:
        await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(processing_status=ProcessingStatus(current_stage=ProcessingStage.PROCESSING))
        )
        full_text = await transcribe_audio(storage_path)
        transcription_obj = Transcription(full_text=full_text)

        await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(
                transcription=transcription_obj,
                processing_status=ProcessingStatus(current_stage=ProcessingStage.PROCESSING)
            )
        )
        ai_analysis_obj = await analyze_transcription(full_text)

        updated_meeting = await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(
                ai_analysis=ai_analysis_obj,
                processing_status=ProcessingStatus(current_stage=ProcessingStage.COMPLETED)
            )
        )
        return updated_meeting or meeting

    except Exception as e:
        print(f"Processing failed for meeting {meeting.id}: {e}")
        await crud_meetings.update_meeting(
            db, str(meeting.id),
            MeetingUpdate(
                processing_status=ProcessingStatus(
                    current_stage=ProcessingStage.FAILED,
                    error_message=str(e)
                )
            )
        )
        failed_meeting = await crud_meetings.get_meeting_by_id(db, str(meeting.id))
        if failed_meeting:
            return failed_meeting
        return meeting