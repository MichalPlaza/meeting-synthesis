
import logging
import os
import re
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Form, Query
from fastapi.responses import FileResponse
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...models.enums.proccessing_mode import ProcessingMode
from ...schemas.meeting_schema import MeetingCreate, MeetingResponse, MeetingUpdate, MeetingCreateForm
from ...services import meeting_service
from ...crud import crud_meetings

router = APIRouter()
logger = logging.getLogger(__name__)

def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', '_', name)
    return name


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
        processing_mode_selected=processing_mode_selected.value,
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
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Downloading audio for meeting with ID: {meeting_id}")
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting or not meeting.audio_file or not meeting.audio_file.storage_path_or_url:
        logger.warning(f"Meeting or audio file not found for meeting ID: {meeting_id}")
        raise HTTPException(status_code=404, detail="Meeting or audio file not found")

    storage_filename = os.path.basename(meeting.audio_file.storage_path_or_url)
    local_file_path = os.path.join("uploads", storage_filename)

    if not os.path.exists(local_file_path):
        logger.error(f"Audio file not found on server for meeting ID: {meeting_id} at path: {local_file_path}")
        raise HTTPException(status_code=404, detail="Audio file not found on server")

    meeting_date = meeting.meeting_datetime.strftime("%Y-%m-%d")
    sanitized_title = sanitize_filename(meeting.title)
    original_extension = os.path.splitext(meeting.audio_file.original_filename)[1]

    user_friendly_filename = f"{meeting_date}_{sanitized_title}{original_extension}"
    logger.info(f"Serving audio file for meeting ID: {meeting_id} with filename: {user_friendly_filename}")
    return FileResponse(
        path=local_file_path,
        media_type='application/octet-stream',
        filename=user_friendly_filename
    )

