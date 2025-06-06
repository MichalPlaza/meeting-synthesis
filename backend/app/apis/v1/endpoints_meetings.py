from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...schemas.meeting_schema import MeetingCreate, MeetingResponse, MeetingUpdate
from ...services import meeting_service
from ...services.meeting_service import handle_meeting_upload

router = APIRouter()


@router.post("/", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    meeting_in: MeetingCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    meeting = await meeting_service.create_new_meeting(db, meeting_in)
    return meeting


# @TODO nie dziala upload pliku do traksrybcji, to tylko wzor jak powinno wygladac.
@router.post("/upload", response_model=MeetingResponse)
async def upload_meeting(
    meeting_in: MeetingCreate = Depends(),
    audio_file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    if audio_file.content_type not in ("audio/mpeg", "audio/wav", "audio/mp3"):
        raise HTTPException(status_code=400, detail="Invalid audio file type")
    meeting = await handle_meeting_upload(db, meeting_in, audio_file)
    return meeting


@router.get("/", response_model=list[MeetingResponse])
async def list_meetings(db: AsyncIOMotorDatabase = Depends(get_database)):
    return await meeting_service.get_meetings(db)


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
