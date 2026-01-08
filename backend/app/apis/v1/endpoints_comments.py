import logging
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...auth_dependencies import get_current_user
from ...core.permissions import user_can_access_meeting
from ...crud import crud_meetings
from ...db.mongodb_utils import get_database
from ...models.user import User
from ...schemas.comment_schema import CommentResponse, CommentCreate, CommentUpdate
from ...services import comment_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{meeting_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    meeting_id: str,
    data: CommentCreate,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} adding comment to meeting {meeting_id}")

    # Verify user has access to the meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not await user_can_access_meeting(database, current_user, meeting):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this meeting"
        )

    return await comment_service.add_comment(
        database, meeting_id, str(current_user.id), current_user.username, data.content
    )


@router.get("/{meeting_id}", response_model=list[CommentResponse])
async def list_comments(
    meeting_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 50,
):
    logger.info(f"User {current_user.username} fetching comments for meeting {meeting_id}")

    # Verify user has access to the meeting
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    if not await user_can_access_meeting(database, current_user, meeting):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this meeting"
        )

    return await comment_service.get_comments(database, meeting_id, skip, limit)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: str,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} deleting comment {comment_id}")
    await comment_service.delete_comment(database, comment_id, str(current_user.id))


@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: str,
    data: CommentUpdate,
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} updating comment {comment_id}")
    return await comment_service.update_comment(database, comment_id, str(current_user.id), data.content)
