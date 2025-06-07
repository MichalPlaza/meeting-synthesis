import os
import shutil
import tempfile
from uuid import uuid4

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_meetings
from ..models.audio_file import AudioFile
from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate
#from .whisper_service import transcribe_audio


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


async def update_existing_meeting(
    db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    return await crud_meetings.update_meeting(db, meeting_id, update_data)


async def delete_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    return await crud_meetings.delete_meeting(db, meeting_id)


UPLOAD_DIR = "./uploads"


async def handle_meeting_upload(
    db: AsyncIOMotorDatabase,
    form_data,  # MeetingCreateForm
    file: UploadFile,
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = file.filename.split(".")[-1]
    unique_filename = f"{uuid4().hex}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    audio_metadata = AudioFile(
        original_filename=file.filename,
        storage_path_or_url=file_path,
        mimetype=file.content_type,
    )

    meeting_create = form_data.to_meeting_create(audio_file=audio_metadata)
    meeting = await crud_meetings.create_meeting(db, meeting_create)


    return meeting
