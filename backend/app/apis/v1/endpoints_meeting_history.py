from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...auth_dependencies import get_current_user
from ...core.permissions import user_can_access_meeting
from ...crud import crud_meetings
from ...db.mongodb_utils import get_database
from ...models.user import User
from ...services.meeting_history_service import get_latest_changes_for_meeting

router = APIRouter()


@router.get("/{meeting_id}")
async def get_meeting_history(
    meeting_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    # Verify user has access to the meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not await user_can_access_meeting(database, current_user, meeting):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this meeting"
        )

    changes = await get_latest_changes_for_meeting(database, meeting_id)

    if not changes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No history found for this meeting")

    return changes
