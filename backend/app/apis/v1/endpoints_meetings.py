import logging
import os
import pathlib
import re
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Form, Query
from fastapi.responses import FileResponse
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...auth_dependencies import get_current_user
from ...core.permissions import require_approval, require_edit_permission
from ...db.mongodb_utils import get_database
from ...models.enums.processing_mode import ProcessingMode
from ...models.user import User
from ...schemas.meeting_schema import MeetingCreate, MeetingResponse, MeetingUpdate, MeetingCreateForm, \
    MeetingPartialUpdate, MeetingResponsePopulated, MergeSpeakersRequest
from ...services import meeting_service
from ...crud import crud_meetings, crud_projects
from ...worker.tasks import reanalyze_meeting

router = APIRouter(
    tags=["meetings"],
    dependencies=[Depends(require_approval), Depends(require_edit_permission)]
)
logger = logging.getLogger(__name__)

# Base upload directory (resolved to absolute path)
UPLOAD_DIR = pathlib.Path("uploads").resolve()


def sanitize_filename(name: str) -> str:
    """Sanitize filename by removing dangerous characters."""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', '_', name)
    # Remove path traversal sequences
    name = name.replace('..', '_')
    return name


def safe_file_path(base_dir: pathlib.Path, filename: str) -> pathlib.Path:
    """
    Safely join base directory with filename, preventing path traversal attacks.

    Args:
        base_dir: Base directory (must be absolute path)
        filename: Filename to join (may contain malicious sequences)

    Returns:
        Safe absolute path within base_dir

    Raises:
        ValueError: If resulting path would be outside base_dir
    """
    # Get just the filename, removing any directory components
    safe_name = pathlib.Path(filename).name

    # Resolve the full path
    file_path = (base_dir / safe_name).resolve()

    # Verify the path is within base_dir
    try:
        file_path.relative_to(base_dir)
    except ValueError:
        raise ValueError(f"Path traversal attempt detected: {filename}")

    return file_path


async def user_can_access_meeting(
    database: AsyncIOMotorDatabase,
    user: User,
    meeting
) -> bool:
    """
    Check if user has access to a meeting based on project membership.

    Admin users have access to all meetings.
    Other users must be members of the meeting's project.
    """
    # Admins can access everything
    if user.role == "admin":
        return True

    # Check if user is member of the meeting's project
    project = await crud_projects.get_project_by_id(database, str(meeting.project_id))
    if not project:
        return False

    # Check if user is in project members
    user_id_str = str(user.id)
    return user_id_str in [str(m) for m in project.members]


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
        meeting_in: MeetingCreate, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Creating new meeting: {meeting_in.title}")
    meeting = await meeting_service.create_new_meeting(database, meeting_in)
    logger.info(f"Successfully created meeting with ID: {meeting.id}")
    return meeting


@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(
        query: str = Query(None, description="Search term for meeting titles"),
        project_ids: List[str] = Query(None, description="List of project IDs to filter by"),
        tags: List[str] = Query(None, description="List of tags to filter by"),
        sort_by: str = Query("newest", description="Sort order"),
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Listing meetings with query: {query}, project_ids: {project_ids}, tags: {tags}, sort_by: {sort_by}")

    if project_ids is not None and len(project_ids) == 0:
        logger.info("User has no projects assigned -> returning empty meeting list.")
        return []

    if project_ids is None:
        logger.info("No project_ids provided -> returning empty meeting list.")
        return []

    meetings = await meeting_service.get_meetings_with_filters(
        database=database, q=query, project_ids=project_ids, tags=tags, sort_by=sort_by
    )

    logger.info(f"Found {len(meetings)} meetings")
    return meetings


@router.post("/upload", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting_with_file(
        title: str = Form(...),
        meeting_datetime: datetime = Form(...),
        project_id: str = Form(...),
        uploader_id: str = Form(...),
        tags: str = Form(""),
        file: UploadFile = File(...),
        processing_mode_selected: ProcessingMode = Form(ProcessingMode.LOCAL),
        language: str = Form("pl"),
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"Uploading meeting '{title}' with file: {file.filename}")
    form_data = MeetingCreateForm(
        title=title,
        meeting_datetime=meeting_datetime,
        project_id=project_id,
        uploader_id=uploader_id,
        tags=tags,
        processing_mode_selected=processing_mode_selected,
        language=language,
    )

    meeting = await meeting_service.handle_meeting_upload(database, form_data, file)
    logger.info(f"Successfully uploaded meeting with ID: {meeting.id}")
    return meeting


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
        meeting_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Fetching meeting with ID: {meeting_id}")
    meeting = await meeting_service.get_meeting(database, meeting_id)
    if not meeting:
        logger.warning(f"Meeting with ID {meeting_id} not found")
        raise HTTPException(status_code=404, detail="Meeting not found")
    logger.info(f"Successfully fetched meeting with ID: {meeting_id}")
    return meeting


@router.get("/project/{project_id}", response_model=list[MeetingResponse])
async def meetings_by_project(
        project_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Fetching meetings for project with ID: {project_id}")
    meetings = await meeting_service.get_meetings_for_project(database, project_id)
    logger.info(f"Found {len(meetings)} meetings for project with ID: {project_id}")
    return meetings


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
        meeting_id: str,
        update_data: MeetingUpdate,
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"Updating meeting with ID: {meeting_id}")
    updated = await meeting_service.update_existing_meeting(database, meeting_id, update_data)
    if not updated:
        logger.warning(f"Meeting with ID {meeting_id} not found or not updated")
        raise HTTPException(status_code=404, detail="Meeting not found or not updated")
    logger.info(f"Successfully updated meeting with ID: {meeting_id}")
    return updated


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
        meeting_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Deleting meeting with ID: {meeting_id}")
    deleted = await meeting_service.delete_existing_meeting(database, meeting_id)
    if not deleted:
        logger.warning(f"Meeting with ID {meeting_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Meeting not found")
    logger.info(f"Successfully deleted meeting with ID: {meeting_id}")
    return


@router.get("/{meeting_id}/download")
async def download_meeting_audio(
        meeting_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    """
    Download audio file for a meeting.

    Requires authentication and authorization (user must have access to the meeting's project).
    """
    logger.info(f"User {current_user.username} requesting download for meeting ID: {meeting_id}")

    # Fetch meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting or not meeting.audio_file or not meeting.audio_file.storage_path_or_url:
        logger.warning(f"Meeting or audio file not found for meeting ID: {meeting_id}")
        raise HTTPException(status_code=404, detail="Meeting or audio file not found")

    # Authorization check - user must have access to the meeting's project
    if not await user_can_access_meeting(database, current_user, meeting):
        logger.warning(f"User {current_user.username} denied access to meeting {meeting_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this meeting"
        )

    # Safe path construction to prevent path traversal attacks
    try:
        local_file_path = safe_file_path(UPLOAD_DIR, meeting.audio_file.storage_path_or_url)
    except ValueError as e:
        logger.error(f"Path traversal attempt for meeting {meeting_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )

    if not local_file_path.exists():
        logger.error(f"Audio file not found on server for meeting ID: {meeting_id} at path: {local_file_path}")
        raise HTTPException(status_code=404, detail="Audio file not found on server")

    # Prepare user-friendly filename
    meeting_date = meeting.meeting_datetime.strftime("%Y-%m-%d")
    sanitized_title = sanitize_filename(meeting.title)
    original_extension = os.path.splitext(meeting.audio_file.original_filename)[1]

    user_friendly_filename = f"{meeting_date}_{sanitized_title}{original_extension}"
    logger.info(f"Serving audio file for meeting ID: {meeting_id} to user {current_user.username}")

    return FileResponse(
        path=str(local_file_path),
        media_type='application/octet-stream',
        filename=user_friendly_filename
    )


@router.patch("/{meeting_id}", response_model=MeetingResponse)
async def partial_update_meeting(
        meeting_id: str,
        update_data: MeetingPartialUpdate,
        database: AsyncIOMotorDatabase = Depends(get_database),
        user: User = Depends(get_current_user),
):

    updated = await meeting_service.partial_update_meeting(database, meeting_id, update_data, user)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return updated


@router.post("/{meeting_id}/merge-speakers", response_model=MeetingResponse)
async def merge_speakers(
        meeting_id: str,
        merge_request: MergeSpeakersRequest,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    """
    Merge two speakers into one by updating all segment speaker labels.

    This updates all segments where speaker_label == source_speaker to target_speaker.
    Also cleans up speaker_mappings if the source speaker had a custom name.
    """
    logger.info(f"User {current_user.username} merging speakers in meeting {meeting_id}: "
                f"{merge_request.source_speaker} -> {merge_request.target_speaker}")

    # Fetch meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Check if meeting has segments
    if not meeting.transcription or not meeting.transcription.segments:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meeting has no transcript segments"
        )

    # Validate speakers exist
    existing_speakers = set(
        seg.speaker_label for seg in meeting.transcription.segments
        if seg.speaker_label
    )
    if merge_request.source_speaker not in existing_speakers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source speaker '{merge_request.source_speaker}' not found in segments"
        )
    if merge_request.target_speaker not in existing_speakers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target speaker '{merge_request.target_speaker}' not found in segments"
        )

    # Update segments - change source_speaker to target_speaker
    updated_segments = []
    merge_count = 0
    for seg in meeting.transcription.segments:
        if seg.speaker_label == merge_request.source_speaker:
            updated_segments.append({
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": seg.text,
                "speaker_label": merge_request.target_speaker
            })
            merge_count += 1
        else:
            updated_segments.append(seg.model_dump())

    # Update speaker_mappings: transfer source mapping to target if exists
    updated_mappings = dict(meeting.speaker_mappings or {})
    if merge_request.source_speaker in updated_mappings:
        # If source had a custom name, apply it to target (unless target already has one)
        if merge_request.target_speaker not in updated_mappings:
            updated_mappings[merge_request.target_speaker] = updated_mappings[merge_request.source_speaker]
        del updated_mappings[merge_request.source_speaker]

    # Save to database
    from bson import ObjectId
    await database["meetings"].update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": {
            "transcription.segments": updated_segments,
            "speaker_mappings": updated_mappings
        }}
    )

    logger.info(f"Merged {merge_count} segments from {merge_request.source_speaker} to {merge_request.target_speaker}")

    # Fetch and return updated meeting
    updated_meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    return updated_meeting


@router.post("/{meeting_id}/reanalyze", response_model=MeetingResponse)
async def reanalyze_meeting_endpoint(
        meeting_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    """
    Re-run AI analysis on existing transcription.

    This endpoint triggers a background task to:
    1. Re-analyze the existing transcription text with AI
    2. Update summary, key topics, action items, decisions, and tags
    3. Re-index the meeting to Elasticsearch

    Requires existing transcription text.
    """
    logger.info(f"User {current_user.username} requesting re-analysis for meeting ID: {meeting_id}")

    # Fetch meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        logger.warning(f"Meeting with ID {meeting_id} not found")
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Authorization check - user must have access to the meeting's project
    if not await user_can_access_meeting(database, current_user, meeting):
        logger.warning(f"User {current_user.username} denied access to meeting {meeting_id}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this meeting"
        )

    # Check if transcription exists
    if not meeting.transcription or not meeting.transcription.full_text:
        logger.warning(f"No transcription found for meeting ID: {meeting_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transcription found. Cannot re-analyze without transcription."
        )

    # Trigger re-analysis task
    reanalyze_meeting.delay(meeting_id)
    logger.info(f"Re-analysis task queued for meeting ID: {meeting_id}")

    # Return current meeting state (status will be updated by background task)
    return meeting


# Admin router without router-level dependencies
admin_router = APIRouter(tags=["meetings-admin"])

@admin_router.get("/populated", response_model=List[MeetingResponsePopulated])
async def list_populated_meetings(
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user = Depends(get_current_user)
):
    """
    Get a list of all meetings with populated project and uploader info.
    (For Admin Panel - requires admin role)
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Only admins can access this endpoint"
        )
    
    meetings = await crud_meetings.get_all_meetings_populated(database)
    return meetings