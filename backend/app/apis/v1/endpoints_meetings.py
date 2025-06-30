import os
import re
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Form, Query
from fastapi.responses import FileResponse
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.meeting_schema import MeetingCreate, MeetingResponse, MeetingUpdate, MeetingCreateForm
from ...services import meeting_service
from ...crud import crud_meetings

router = APIRouter()

def sanitize_filename(name: str) -> str:
    """Removes illegal characters from a string to make it a valid filename."""
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'\s+', '_', name)
    return name

@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_in: MeetingCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    meeting = await meeting_service.create_new_meeting(db, meeting_in)
    return meeting

@router.get("/", response_model=List[MeetingResponse])
async def list_meetings(
    q: str = Query(None, description="Search term for meeting titles"),
    project_ids: List[str] = Query(None, description="List of project IDs to filter by"),
    tags: List[str] = Query(None, description="List of tags to filter by"),
    sort_by: str = Query("newest", description="Sort order"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    meetings = await meeting_service.get_meetings_with_filters(
        db=db, q=q, project_ids=project_ids, tags=tags, sort_by=sort_by
    )
    return meetings

@router.post("/upload", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting_with_file(
    title: str = Form(...),
    meeting_datetime: datetime = Form(...),
    project_id: str = Form(...),
    uploader_id: str = Form(...),
    tags: str = Form(""),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    form_data = MeetingCreateForm(
        title=title,
        meeting_datetime=meeting_datetime,
        project_id=project_id,
        uploader_id=uploader_id,
        tags=tags,
    )
    return await meeting_service.handle_meeting_upload(db, form_data, file)

@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    meeting = await meeting_service.get_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.get("/project/{project_id}", response_model=list[MeetingResponse])
async def meetings_by_project(
    project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    return await meeting_service.get_meetings_for_project(db, project_id)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: str,
    update_data: MeetingUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    updated = await meeting_service.update_existing_meeting(db, meeting_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="Meeting not found or not updated")
    return updated


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    meeting_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    deleted = await meeting_service.delete_existing_meeting(db, meeting_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return

@router.get("/{meeting_id}/download")
async def download_meeting_audio(
    meeting_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Endpoint to download a meeting's audio file with a user-friendly name.
    """
    meeting = await crud_meetings.get_meeting_by_id(db, meeting_id)
    if not meeting or not meeting.audio_file or not meeting.audio_file.storage_path_or_url:
        raise HTTPException(status_code=404, detail="Meeting or audio file not found")
        
    storage_filename = os.path.basename(meeting.audio_file.storage_path_or_url)
    local_file_path = os.path.join("uploads", storage_filename)

    if not os.path.exists(local_file_path):
        raise HTTPException(status_code=404, detail="Audio file not found on server")

    meeting_date = meeting.meeting_datetime.strftime("%Y-%m-%d")
    sanitized_title = sanitize_filename(meeting.title)
    original_extension = os.path.splitext(meeting.audio_file.original_filename)[1]
    
    user_friendly_filename = f"{meeting_date}_{sanitized_title}{original_extension}"

    return FileResponse(
        path=local_file_path, 
        media_type='application/octet-stream', 
        filename=user_friendly_filename
    )