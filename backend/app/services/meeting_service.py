import os
import shutil
import uuid
from mutagen.mp3 import MP3
from mutagen.wave import WAVE
from mutagen.flac import FLAC
from mutagen.mp4 import MP4

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_meetings
from ..models.audio_file import AudioFile
from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate, MeetingCreateForm, MeetingResponse
# --- POCZĄTEK ZMIANY ---
# Dodajemy brakujący import zadania Celery
from ..worker.tasks import process_meeting_audio
# --- KONIEC ZMIANY ---

def get_audio_duration(file_path: str, mimetype: str) -> int | None:
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
            return None
        return int(audio.info.length)
    except Exception as e:
        print(f"Could not read duration from {file_path}: {e}")
        return None

def estimate_processing_time(duration_seconds: int | None) -> int | None:
    if duration_seconds is None:
        return None
    
    FIXED_OVERHEAD_SECONDS = 10
    TRANSCRIPTION_FACTOR = 0.5
    AI_ANALYSIS_SECONDS = 20
    
    estimated_time = (
        FIXED_OVERHEAD_SECONDS + 
        (duration_seconds * TRANSCRIPTION_FACTOR) + 
        AI_ANALYSIS_SECONDS
    )
    return int(estimated_time)

async def create_new_meeting(db: AsyncIOMotorDatabase, data: MeetingCreate) -> Meeting:
    return await crud_meetings.create_meeting(db, data)

async def get_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> MeetingResponse | None:
    meeting = await crud_meetings.get_meeting_by_id(db, meeting_id)
    if not meeting:
        return None
    
    estimated_time = estimate_processing_time(meeting.duration_seconds)
    meeting_dict = meeting.model_dump(by_alias=True)
    meeting_dict["estimated_processing_time_seconds"] = estimated_time
    
    return MeetingResponse(**meeting_dict)

async def get_meetings_with_filters(
    db: AsyncIOMotorDatabase,
    q: str | None,
    project_ids: list[str] | None,
    tags: list[str] | None,
    sort_by: str,
) -> list[Meeting]:
    return await crud_meetings.get_meetings_filtered(db, q, project_ids, tags, sort_by)

async def get_meetings_for_project(
    db: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    return await crud_meetings.get_meetings_by_project(db, project_id)

async def update_existing_meeting(
    db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    return await crud_meetings.update_meeting(db, meeting_id, update_data)

async def delete_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    return await crud_meetings.delete_meeting(db, meeting_id)

UPLOAD_DIR = "uploads"
MEDIA_BASE_URL = "/media"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def handle_meeting_upload(
    db: AsyncIOMotorDatabase, meeting_data: MeetingCreateForm, audio_file: UploadFile
) -> MeetingResponse:
    original_filename = audio_file.filename or "uploaded_file"
    extension = original_filename.split(".")[-1]
    generated_filename = f"{uuid.uuid4().hex}.{extension}"
    storage_path = os.path.join(UPLOAD_DIR, generated_filename)

    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)
    
    duration = get_audio_duration(storage_path, audio_file.content_type or "")
    estimated_time = estimate_processing_time(duration)
    
    public_url = os.path.join(MEDIA_BASE_URL, generated_filename).replace("\\", "/")

    audio_data = AudioFile(
        original_filename=original_filename,
        storage_path_or_url=public_url,
        mimetype=audio_file.content_type or "application/octet-stream"
    )
    
    full_data = meeting_data.to_meeting_create(audio_data, duration)
    
    meeting = await crud_meetings.create_meeting(db, full_data)

    process_meeting_audio.delay(str(meeting.id))

    response_data = meeting.model_dump(by_alias=True)
    response_data["estimated_processing_time_seconds"] = estimated_time

    return MeetingResponse(**response_data)