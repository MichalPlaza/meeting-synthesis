import logging
from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import re

from ..models.meeting import Meeting
from ..schemas.meeting_schema import MeetingCreate, MeetingUpdate

logger = logging.getLogger(__name__)


async def get_meeting_by_id(
        database: AsyncIOMotorDatabase, meeting_id: str
) -> Meeting | None:
    logger.debug(f"Attempting to retrieve meeting with ID: {meeting_id}")
    if not ObjectId.is_valid(meeting_id):
        logger.warning(f"Invalid meeting ID format: {meeting_id}")
        return None
    meeting_doc = await database["meetings"].find_one({"_id": ObjectId(meeting_id)})
    if meeting_doc:
        logger.debug(f"Meeting with ID {meeting_id} found.")
        return Meeting(**meeting_doc)
    logger.debug(f"Meeting with ID {meeting_id} not found.")
    return None


async def get_all_meetings(database: AsyncIOMotorDatabase) -> list[Meeting]:
    logger.debug("Retrieving all meetings.")
    meetings = []
    cursor = database["meetings"].find()
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    logger.debug(f"Found {len(meetings)} total meetings.")
    return meetings


async def get_meetings_filtered(
        database: AsyncIOMotorDatabase,
        q: str | None = None,
        project_ids: list[str] | None = None,
        tags: list[str] | None = None,
        sort_by: str = "newest",
) -> list[Meeting]:
    logger.debug(
        f"Retrieving filtered meetings with query='{q}', project_ids={project_ids}, tags={tags}, sort_by='{sort_by}'.")
    query_conditions = []

    if q:
        query_conditions.append({"title": {"$regex": re.escape(q), "$options": "i"}})

    if project_ids:
        valid_project_ids = []
        for pid in project_ids:
            if ObjectId.is_valid(pid):
                valid_project_ids.append(ObjectId(pid))
            else:
                logger.warning(f"Invalid project ID encountered in filter: {pid}")
        if valid_project_ids:
            query_conditions.append({"project_id": {"$in": valid_project_ids}})

    if tags:
        query_conditions.append({"tags": {"$in": tags}})

    query = {"$and": query_conditions} if query_conditions else {}

    sort_options = {
        "newest": [("meeting_datetime", -1)],
        "oldest": [("meeting_datetime", 1)],
        "duration-desc": [("duration_seconds", -1)],
        "duration-asc": [("duration_seconds", 1)],
    }
    sort_order = sort_options.get(sort_by, sort_options["newest"])

    cursor = database["meetings"].find(query).sort(sort_order)
    meetings = []
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    logger.debug(f"Found {len(meetings)} filtered meetings.")
    return meetings


async def get_meetings_by_project(
        database: AsyncIOMotorDatabase, project_id: str
) -> list[Meeting]:
    logger.debug(f"Retrieving meetings for project ID: {project_id}")
    if not ObjectId.is_valid(project_id):
        logger.warning(f"Invalid project ID format: {project_id}")
        return []
    cursor = database["meetings"].find({"project_id": ObjectId(project_id)})
    meetings = []
    async for doc in cursor:
        meetings.append(Meeting(**doc))
    logger.debug(f"Found {len(meetings)} meetings for project ID: {project_id}")
    return meetings


async def create_meeting(
        database: AsyncIOMotorDatabase, meeting_data: MeetingCreate
) -> Meeting:
    logger.debug(f"Creating new meeting with title: {meeting_data.title}")
    meeting_doc = meeting_data.model_dump(by_alias=True)
    meeting_doc["uploaded_at"] = datetime.now(UTC)
    meeting_doc["last_updated_at"] = datetime.now(UTC)
    
    # Ensure ObjectId types are preserved for database queries
    if "project_id" in meeting_doc and isinstance(meeting_doc["project_id"], str):
        meeting_doc["project_id"] = ObjectId(meeting_doc["project_id"])
    if "uploader_id" in meeting_doc and isinstance(meeting_doc["uploader_id"], str):
        meeting_doc["uploader_id"] = ObjectId(meeting_doc["uploader_id"])

    result = await database["meetings"].insert_one(meeting_doc)
    meeting_doc["_id"] = result.inserted_id
    logger.info(f"Meeting '{meeting_data.title}' created with ID: {result.inserted_id}")

    return Meeting(**meeting_doc)


async def update_meeting(
        database: AsyncIOMotorDatabase, meeting_id: str, update_data: MeetingUpdate
) -> Meeting | None:
    logger.debug(f"Attempting to update meeting with ID: {meeting_id}")
    if not ObjectId.is_valid(meeting_id):
        logger.warning(f"Invalid meeting ID format for update: {meeting_id}")
        return None

    data = {k: v for k, v in update_data.model_dump(exclude_unset=True).items()}
    if not data:
        logger.debug(f"No update data provided for meeting ID: {meeting_id}")
        return await get_meeting_by_id(database, meeting_id)

    data["last_updated_at"] = datetime.now(UTC)

    result = await database["meetings"].update_one(
        {"_id": ObjectId(meeting_id)}, {"$set": data}
    )
    if result.modified_count == 1:
        logger.info(f"Meeting with ID {meeting_id} updated successfully.")
        return await get_meeting_by_id(database, meeting_id)
    logger.warning(f"Meeting with ID {meeting_id} not found or not modified during update.")
    return None


async def delete_meeting(database: AsyncIOMotorDatabase, meeting_id: str) -> bool:
    logger.debug(f"Attempting to delete meeting with ID: {meeting_id}")
    if not ObjectId.is_valid(meeting_id):
        logger.warning(f"Invalid meeting ID format for deletion: {meeting_id}")
        return False
    result = await database["meetings"].delete_one({"_id": ObjectId(meeting_id)})
    if result.deleted_count == 1:
        logger.info(f"Meeting with ID {meeting_id} deleted successfully.")
        return True
    logger.warning(f"Meeting with ID {meeting_id} not found for deletion.")
    return False


async def update_meeting_fields(database, meeting_id: str, fields: dict):
    logger.debug(f"Attempting to update meeting with ID: {meeting_id}")
    oid = ObjectId(meeting_id)

    result = await database["meetings"].update_one(
        {"_id": oid},
        {"$set": fields}
    )

    logger.info(f"result {str(result)}")

    if result.modified_count == 0:
        return None

    return await database["meetings"].find_one({"_id": oid})


async def get_all_meetings_populated(database: AsyncIOMotorDatabase) -> list[dict]:
    """
    Retrieves all meetings with populated project and uploader information.
    """
    pipeline = [
        {"$sort": {"uploaded_at": -1}},
        # join collection "projects"
        {
            "$lookup": {
                "from": "projects",
                "localField": "project_id",
                "foreignField": "_id",
                "as": "project_info"
            }
        },
        # join collection "users"
        {
            "$lookup": {
                "from": "users",
                "localField": "uploader_id",
                "foreignField": "_id",
                "as": "uploader_info"
            }
        },
        {
            "$unwind": {
                "path": "$project_info",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$unwind": {
                "path": "$uploader_info",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$addFields": {
                "project": {
                    "_id": {"$ifNull": ["$project_info._id", None]},
                    "name": {"$ifNull": ["$project_info.name", None]}
                },
                "uploader": {
                    "_id": {"$ifNull": ["$uploader_info._id", None]},
                    "username": {"$ifNull": ["$uploader_info.username", None]},
                    "full_name": {"$ifNull": ["$uploader_info.full_name", None]}
                }
            }
        },
        {
            "$project": {
                "project_info": 0,
                "uploader_info": 0
            }
        }
    ]

    cursor = database["meetings"].aggregate(pipeline)
    meetings = await cursor.to_list(length=None)
    return meetings
