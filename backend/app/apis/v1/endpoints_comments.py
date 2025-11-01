import logging
from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...auth_dependencies import get_current_user
from ...db.mongodb_utils import get_database
from ...schemas.comment_schema import CommentResponse, CommentCreate
from ...services import comment_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/{meeting_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(meeting_id: str, data: CommentCreate, database: AsyncIOMotorDatabase = Depends(get_database),
                      user=Depends(get_current_user)):
    logger.info(f"User {user.username} adding comment to meeting {meeting_id}")
    return await comment_service.add_comment(database, meeting_id, str(user.id), user.username, data.content)


@router.get("/{meeting_id}", response_model=list[CommentResponse])
async def list_comments(meeting_id: str, database: AsyncIOMotorDatabase = Depends(get_database),
                        skip: int = 0, limit: int = 50):
    logger.info(f"Fetching comments for meeting {meeting_id}")
    return await comment_service.get_comments(database, meeting_id, skip, limit)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: str, database: AsyncIOMotorDatabase = Depends(get_database),
                         user=Depends(get_current_user)):
    logger.info(f"User {user.username} deleting comment {comment_id}")
    return await comment_service.delete_comment(database, comment_id, str(user.id))
