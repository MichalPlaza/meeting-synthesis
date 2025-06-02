from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate
from ..models.meeting import Meeting
from ..crud import crud_meetings


async def create_new_meeting(db: AsyncIOMotorDatabase, data: MeetingCreate) -> Meeting:
    return await crud_meetings.create_meeting(db, data)

async def get_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> Optional[Meeting]:
    return await crud_meetings.get_meeting_by_id(db, meeting_id)

async def get_meetings(db: AsyncIOMotorDatabase) -> List[Meeting]:
    return await crud_meetings.get_all_meetings(db)

async def get_meetings_for_project(db: AsyncIOMotorDatabase, project_id: str) -> List[Meeting]:
    return await crud_meetings.get_meetings_by_project(db, project_id)

async def update_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate) -> Optional[Meeting]:
    return await crud_meetings.update_meeting(db, meeting_id, update_data)

async def delete_existing_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    return await crud_meetings.delete_meeting(db, meeting_id)
