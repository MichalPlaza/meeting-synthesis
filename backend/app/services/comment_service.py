import logging
from datetime import datetime, UTC

from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from ..models.comment import Comment
from ..crud import crud_comments, crud_meetings

logger = logging.getLogger(__name__)


async def add_comment(database: AsyncIOMotorDatabase, meeting_id: str, author_id: str, author_name: str, content: str):
    meeting = await crud_meetings.get_meeting_by_id(database, meeting_id)
    if not meeting:
        logger.warning(f"Tried to comment on nonexistent meeting {meeting_id}")
        raise HTTPException(status_code=404, detail="Meeting not found")

    comment = Comment(
        meeting_id=ObjectId(meeting_id),
        author_id=ObjectId(author_id),
        author_name=author_name,
        content=content.strip(),
    )

    return await crud_comments.create_comment(database, comment)


async def get_comments(database: AsyncIOMotorDatabase, meeting_id: str, skip: int = 0, limit: int = 50):
    return await crud_comments.get_comments_for_meeting(database, meeting_id, skip, limit)


async def delete_comment(database: AsyncIOMotorDatabase, comment_id: str, user_id: str):
    ok, msg = await crud_comments.delete_comment(database, comment_id, user_id)
    if not ok:
        raise HTTPException(status_code=403 if msg == "Not authorized to delete this comment" else 404, detail=msg)
    return {"detail": msg}


async def update_comment(db, comment_id: str, user_id: str, new_content: str):
    comment = await db.comments.find_one({"_id": ObjectId(comment_id)})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if str(comment["author_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    await db.comments.update_one(
        {"_id": ObjectId(comment_id)},
        {"$set": {"content": new_content, "updated_at": datetime.now(UTC)}}
    )
    updated = await db.comments.find_one({"_id": ObjectId(comment_id)})

    return {
        "_id": str(updated["_id"]),
        "meeting_id": str(updated["meeting_id"]),
        "author_id": str(updated["author_id"]),
        "author_name": updated["author_name"],
        "content": updated["content"],
        "created_at": updated["created_at"],
        "updated_at": updated.get("updated_at", datetime.now(UTC)),
    }
