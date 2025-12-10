
import logging
import os
import shutil
import uuid

from bson import ObjectId
from fastapi import UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from mutagen.flac import FLAC
from mutagen.mp3 import MP3
from mutagen.mp4 import MP4
from mutagen.wave import WAVE

from ..crud import crud_meetings
from ..crud.crud_meeting_history import save_changes_history
from ..crud.crud_meetings import update_meeting_fields
from ..models.audio_file import AudioFile
from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate, MeetingCreateForm, MeetingResponse, \
    MeetingPartialUpdate
from ..worker.tasks import process_meeting_audio, reanalyze_meeting

logger = logging.getLogger(__name__)


def get_audio_duration(file_path: str, mimetype: str) -> int | None:
    logger.debug(f"Getting audio duration for file: {file_path} with mimetype: {mimetype}")
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
            logger.warning(f"Unsupported audio mimetype for duration calculation: {mimetype}")
            return None
        duration = int(audio.info.length)
        logger.debug(f"Audio duration for {file_path}: {duration} seconds.")
        return duration
    except Exception as e:
        logger.error(f"Could not read duration from {file_path}: {e}", exc_info=True)
        return None


def estimate_processing_time(duration_seconds: int | None) -> int | None:
    logger.debug(f"Estimating processing time for duration: {duration_seconds} seconds.")
    if duration_seconds is None:
        logger.debug("Duration is None, returning None for estimated processing time.")
        return None

    FIXED_OVERHEAD_SECONDS = 10
    TRANSCRIPTION_FACTOR = 0.5
    AI_ANALYSIS_SECONDS = 20

    estimated_time = (
            FIXED_OVERHEAD_SECONDS +
            (duration_seconds * TRANSCRIPTION_FACTOR) +
            AI_ANALYSIS_SECONDS
    )
    logger.debug(f"Estimated processing time: {int(estimated_time)} seconds.")
    return int(estimated_time)


async def create_new_meeting(database: AsyncIOMotorDatabase, data: MeetingCreate) -> Meeting:
    logger.info(f"Service: Creating new meeting with title: {data.title}")
    return await crud_meetings.create_meeting(database, data)


async def get_meeting(database: AsyncIOMotorDatabase, meeting_id: str) -> MeetingResponse | None:
    logger.info(f"Service: Getting meeting with ID: {meeting_id}")
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        logger.warning(f"Service: Meeting with ID {meeting_id} not found.")
        return None

    estimated_time = estimate_processing_time(meeting.duration_seconds)
    meeting_dict = meeting.model_dump(by_alias=True)
    meeting_dict["estimated_processing_time_seconds"] = estimated_time

    logger.info(f"Service: Successfully retrieved meeting with ID: {meeting_id}")
    return MeetingResponse(**meeting_dict)


async def get_meetings_with_filters(
        database: AsyncIOMotorDatabase,
        q: str | None,
        project_ids: list[str] | None,
        tags: list[str] | None,
        sort_by: str,
) -> list[Meeting]:
    logger.info(f"Service: Getting meetings with filters: q={q}, project_ids={project_ids}, tags={tags}, sort_by={sort_by}")
    return await crud_meetings.get_meetings_filtered(database, q, project_ids, tags, sort_by)


async def get_meetings_for_project(
        database: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    logger.info(f"Service: Getting meetings for project ID: {project_id}")
    return await crud_meetings.get_meetings_by_project(database, project_id)


async def update_existing_meeting(
        database: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    logger.info(f"Service: Updating meeting with ID: {meeting_id}")
    
    # Update the meeting
    updated_meeting = await crud_meetings.update_meeting(database, meeting_id, update_data)
    
    if not updated_meeting:
        return None
    
    # Reindex to Knowledge Base if meeting is completed and has indexable content
    from .meeting_indexing_service import reindex_meeting
    from ..models.enums.processing_stage import ProcessingStage
    
    if (updated_meeting.processing_status.current_stage == ProcessingStage.COMPLETED and
        (updated_meeting.transcription or updated_meeting.ai_analysis)):
        try:
            logger.info(f"Reindexing meeting {meeting_id} to Knowledge Base after update")
            await reindex_meeting(updated_meeting)
        except Exception as e:
            logger.error(f"Failed to reindex meeting {meeting_id}: {e}", exc_info=True)
            # Don't fail the update if reindexing fails
    
    return updated_meeting


async def delete_existing_meeting(database: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    logger.info(f"Service: Deleting meeting with ID: {meeting_id}")
    
    # Delete from Knowledge Base first
    from .meeting_indexing_service import delete_meeting_from_knowledge_base
    try:
        await delete_meeting_from_knowledge_base(meeting_id)
        logger.info(f"Meeting {meeting_id} removed from Knowledge Base")
    except Exception as e:
        logger.error(f"Failed to remove meeting {meeting_id} from Knowledge Base: {e}", exc_info=True)
        # Continue with deletion even if KB removal fails
    
    return await crud_meetings.delete_meeting(database, meeting_id)


UPLOAD_DIR = "uploads"
MEDIA_BASE_URL = "/media"
os.makedirs(UPLOAD_DIR, exist_ok=True)
logger.info(f"Ensured upload directory exists: {UPLOAD_DIR}")


async def handle_meeting_upload(
        database: AsyncIOMotorDatabase, meeting_data: MeetingCreateForm, audio_file: UploadFile
) -> MeetingResponse:
    logger.info(f"Service: Handling meeting upload for file: {audio_file.filename}")
    original_filename = audio_file.filename or "uploaded_file"
    extension = original_filename.split(".")[-1]
    generated_filename = f"{uuid.uuid4().hex}.{extension}"
    storage_path = os.path.join(UPLOAD_DIR, generated_filename)

    try:
        with open(storage_path, "wb") as buffer:
            shutil.copyfileobj(audio_file.file, buffer)
        logger.info(f"File saved to {storage_path}")
    except Exception as e:
        logger.error(f"Failed to save uploaded file {original_filename}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save audio file")

    duration = get_audio_duration(storage_path, audio_file.content_type or "")
    estimated_time = estimate_processing_time(duration)

    public_url = os.path.join(MEDIA_BASE_URL, generated_filename).replace("\\", "/")

    audio_data = AudioFile(
        original_filename=original_filename,
        storage_path_or_url=public_url,
        mimetype=audio_file.content_type or "application/octet-stream"
    )

    full_data = meeting_data.to_meeting_create(audio_data, duration)

    meeting = await crud_meetings.create_meeting(database, full_data)
    logger.info(f"Meeting entry created in DB for uploaded file, meeting ID: {meeting.id}")

    process_meeting_audio.delay(str(meeting.id))
    logger.info(f"Celery task 'process_meeting_audio' dispatched for meeting ID: {meeting.id}")

    response_data = meeting.model_dump(by_alias=True)
    response_data["estimated_processing_time_seconds"] = estimated_time

    return MeetingResponse(**response_data)


async def partial_update_meeting(db, meeting_id, update_data: MeetingPartialUpdate, user):
    oid = ObjectId(meeting_id)

    old_doc = await db["meetings"].find_one({"_id": oid})
    if not old_doc:
        return None

    update_dict = {}
    transcription_changed = False

    for k, v in update_data.model_dump(exclude_unset=True).items():
        if isinstance(v, dict):
            for nested_k, nested_v in v.items():
                # Handle segments array specially
                if k == "transcription" and nested_k == "segments" and nested_v is not None:
                    update_dict["transcription.segments"] = nested_v
                    # Rebuild full_text from segments
                    rebuilt_text = " ".join(seg.get("text", "") for seg in nested_v)
                    update_dict["transcription.full_text"] = rebuilt_text
                    transcription_changed = True
                    logger.info(f"[Meeting ID: {meeting_id}] Segments updated, rebuilt full_text.")
                else:
                    update_dict[f"{k}.{nested_k}"] = nested_v
                    # Detect transcription.full_text change
                    if k == "transcription" and nested_k == "full_text":
                        old_text = old_doc.get("transcription", {}).get("full_text", "")
                        if nested_v != old_text:
                            transcription_changed = True
                            logger.info(f"[Meeting ID: {meeting_id}] Transcription changed, will trigger re-analysis.")
        else:
            update_dict[k] = v

    await save_changes_history(
        db=db,
        meeting_id=meeting_id,
        old_doc=old_doc,
        update_fields=update_dict,
        user=user
    )

    result = await update_meeting_fields(db, meeting_id, update_dict)

    # Auto-trigger re-analysis if transcription was changed
    if transcription_changed and result:
        logger.info(f"[Meeting ID: {meeting_id}] Triggering automatic re-analysis after transcription edit.")
        reanalyze_meeting.delay(meeting_id)

    return result


