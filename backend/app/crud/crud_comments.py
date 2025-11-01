import logging
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from ..models.comment import Comment

logger = logging.getLogger(__name__)

COLLECTION_NAME = "comments"


async def create_comment(db: AsyncIOMotorDatabase, data: Comment) -> Comment:
    doc = data.model_dump(by_alias=True)
    result = await db[COLLECTION_NAME].insert_one(doc)
    logger.info(f"Created comment with ID: {result.inserted_id}")
    saved = await db[COLLECTION_NAME].find_one({"_id": result.inserted_id})
    return Comment(**saved)


async def get_comments_for_meeting(db: AsyncIOMotorDatabase, meeting_id: str, skip: int = 0, limit: int = 50):
    cursor = db[COLLECTION_NAME].find({"meeting_id": ObjectId(meeting_id)}).sort("created_at", -1).skip(skip).limit(limit)
    comments = await cursor.to_list(length=limit)
    return [Comment(**c) for c in comments]


async def delete_comment(db: AsyncIOMotorDatabase, comment_id: str, user_id: str):
    comment = await db[COLLECTION_NAME].find_one({"_id": ObjectId(comment_id)})
    if not comment:
        return False, "Comment not found"

    if str(comment["author_id"]) != str(user_id):
        return False, "Not authorized to delete this comment"

    await db[COLLECTION_NAME].delete_one({"_id": ObjectId(comment_id)})
    return True, "Deleted"
