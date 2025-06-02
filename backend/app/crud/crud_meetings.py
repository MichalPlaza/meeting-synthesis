from datetime import datetime, timezone
from typing import Optional, List

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate


async def get_meeting_by_id(db: AsyncIOMotorDatabase, meeting_id: str) -> Optional[Meeting]:
    if not ObjectId.is_valid(meeting_id):
        return None
    meeting_doc = await db["meetings"].find_one({"_id": ObjectId(meeting_id)})
    if meeting_doc:
        return Meeting(**meeting_doc)
    return None


async def get_all_meetings(db: AsyncIOMotorDatabase) -> List[Meeting]:
    meetings = []
    cursor = db["meetings"].find()
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    return meetings


async def get_meetings_by_project(db: AsyncIOMotorDatabase, project_id: str) -> List[Meeting]:
    if not ObjectId.is_valid(project_id):
        return []
    cursor = db["meetings"].find({"project_id": ObjectId(project_id)})
    meetings = []
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    return meetings


async def create_meeting(db: AsyncIOMotorDatabase, meeting_data: MeetingCreate) -> Meeting:
    meeting_doc = meeting_data.dict(by_alias=True)
    meeting_doc["uploaded_at"] = datetime.now(timezone.utc)
    meeting_doc["last_updated_at"] = datetime.now(timezone.utc)

    result = await db["meetings"].insert_one(meeting_doc)
    meeting_doc["_id"] = result.inserted_id

    return Meeting(**meeting_doc)


async def update_meeting(db: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate) -> Optional[Meeting]:
    if not ObjectId.is_valid(meeting_id):
        return None

    data = {k: v for k, v in update_data.dict(exclude_unset=True).items()}
    if not data:
        return await get_meeting_by_id(db, meeting_id)

    data["last_updated_at"] = datetime.now(timezone.utc)

    result = await db["meetings"].update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": data}
    )
    if result.modified_count == 1:
        return await get_meeting_by_id(db, meeting_id)
    return None


async def delete_meeting(db: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    if not ObjectId.is_valid(meeting_id):
        return False
    result = await db["meetings"].delete_one({"_id": ObjectId(meeting_id)})
    return result.deleted_count == 1

async def update_meeting_transcription(db: AsyncIOMotorDatabase, meeting_id: str, transcription_text: str) -> Optional[Meeting]:
    update_data = {
        "transcription.text": transcription_text,
        "last_updated_at": datetime.now(timezone.utc),
    }
    result = await db["meetings"].update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": update_data}
    )
    if result.modified_count == 1:
        return await get_meeting_by_id(db, meeting_id)
    return None