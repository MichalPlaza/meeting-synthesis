from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...services.meeting_history_service import get_latest_changes_for_meeting

router = APIRouter()


@router.get("/{meeting_id}")
async def get_meeting_history(
        meeting_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    changes = await get_latest_changes_for_meeting(database, meeting_id)

    if not changes:
        raise HTTPException(status_code=404, detail="No history found for this meeting")

    return changes
