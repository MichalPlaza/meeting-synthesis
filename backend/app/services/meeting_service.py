import shutil
import tempfile

from fastapi import UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_meetings
from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate
from .whisper_service import transcribe_audio


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


async def handle_meeting_upload(
    db: AsyncIOMotorDatabase, meeting_data: MeetingCreate, audio_file: UploadFile
):
    # Zapisz plik tymczasowo
    suffix = audio_file.filename.split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=True, suffix=f".{suffix}") as tmp:
        shutil.copyfileobj(audio_file.file, tmp)
        tmp.flush()
        # Wstaw dokument meeting bez transkrypcji
        meeting = await MeetingCreate(db, meeting_data)
        # Transkrypcja
        text = await transcribe_audio(tmp.name)
        # Aktualizacja dokumentu meeting o transkrypcję
        updated_meeting = await crud_meetings.update_meeting_transcription(
            db, str(meeting.id), text
        )
        return updated_meeting or meeting
