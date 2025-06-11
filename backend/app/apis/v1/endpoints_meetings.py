
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, Form
from future.backports.datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...schemas.meeting_schema import MeetingCreate, MeetingResponse, MeetingUpdate, MeetingCreateForm
from ...services import meeting_service
from ...services.meeting_service import handle_meeting_upload

router = APIRouter()


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_in: MeetingCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    meeting = await meeting_service.create_new_meeting(db, meeting_in)
    return meeting


@router.post("/upload", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def upload_meeting_with_file(
    title: str = Form(...),
    meeting_datetime: datetime = Form(...),
    project_id: str = Form(...),
    uploader_id: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    form_data = MeetingCreateForm(
        title=title,
        meeting_datetime=meeting_datetime,
        project_id=project_id,
        uploader_id=uploader_id,
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
