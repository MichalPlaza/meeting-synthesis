
import logging
from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import re

from ..models.project import Project
from ..schemas.project_schema import ProjectCreate, ProjectUpdate
from ..schemas.project_schema import ProjectResponsePopulated

logger = logging.getLogger(__name__)


async def get_project_by_id(
        database: AsyncIOMotorDatabase, project_id: str
) -> Project | None:
    logger.debug(f"Attempting to retrieve project with ID: {project_id}")
    if not ObjectId.is_valid(project_id):
        logger.warning(f"Invalid project ID format: {project_id}")
        return None
    project_doc = await database["projects"].find_one({"_id": ObjectId(project_id)})
    if project_doc:
        logger.debug(f"Project with ID {project_id} found.")
        return Project(**project_doc)
    logger.debug(f"Project with ID {project_id} not found.")
    return None


async def get_projects_filtered(
        database: AsyncIOMotorDatabase,
        q: str | None = None,
        sort_by: str = "newest",
) -> list[Project]:
    logger.debug(f"Retrieving filtered projects with query='{q}', sort_by='{sort_by}'.")
    query = {}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}

    sort_options = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "name-asc": [("name", 1)],
        "name-desc": [("name", -1)],
    }
    sort_order = sort_options.get(sort_by, sort_options["newest"])

    cursor = database["projects"].find(query).sort(sort_order)
    projects = []
    async for doc in cursor:
        projects.append(Project(**doc))
    logger.debug(f"Found {len(projects)} filtered projects.")
    return projects


async def get_projects_by_owner(
        database: AsyncIOMotorDatabase, owner_id: str
) -> list[Project]:
    logger.debug(f"Retrieving projects for owner with ID: {owner_id}")
    if not ObjectId.is_valid(owner_id):
        logger.warning(f"Invalid owner ID format: {owner_id}")
        return []
    cursor = database["projects"].find({"owner_id": ObjectId(owner_id)})
    projects = []
    async for doc in cursor:
        projects.append(Project(**doc))
    logger.debug(f"Found {len(projects)} projects for owner with ID: {owner_id}")
    return projects


async def get_projects_by_member(
        database: AsyncIOMotorDatabase, member_id: str
) -> list[Project]:
    logger.debug(f"Retrieving projects for member with ID: {member_id}")
    if not ObjectId.is_valid(member_id):
        logger.warning(f"Invalid member ID format: {member_id}")
        return []
    cursor = database["projects"].find({"members_ids": ObjectId(member_id)})
    projects = []
    async for doc in cursor:
        projects.append(Project(**doc))
    logger.debug(f"Found {len(projects)} projects for member with ID: {member_id}")
    return projects


async def create_project(
        database: AsyncIOMotorDatabase, project_data: ProjectCreate
) -> Project:
    logger.debug(f"Creating new project with name: {project_data.name}")
    project_doc = {
        "name": project_data.name,
        "description": project_data.description,
        "owner_id": project_data.owner_id,
        "members_ids": project_data.members_ids or [],
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    result = await database["projects"].insert_one(project_doc)
    project_doc["_id"] = result.inserted_id
    logger.info(f"Project '{project_data.name}' created with ID: {result.inserted_id}")

    return Project(**project_doc)


async def update_project(
        database: AsyncIOMotorDatabase, project_id: str, project_data: ProjectUpdate
) -> Project | None:
    logger.debug(f"Attempting to update project with ID: {project_id}")
    if not ObjectId.is_valid(project_id):
        logger.warning(f"Invalid project ID format for update: {project_id}")
        return None
    update_data = {k: v for k, v in project_data.dict(exclude_unset=True).items()}
    if not update_data:
        logger.debug(f"No update data provided for project ID: {project_id}")
        return await get_project_by_id(database, project_id)
    update_data["updated_at"] = datetime.now(UTC)
    result = await database["projects"].update_one(
        {"_id": ObjectId(project_id)}, {"$set": update_data}
    )
    if result.modified_count == 1:
        logger.info(f"Project with ID {project_id} updated successfully.")
        return await get_project_by_id(database, project_id)
    logger.warning(f"Project with ID {project_id} not found or not modified during update.")
    return None


async def delete_project(database: AsyncIOMotorDatabase, project_id: str) -> bool:
    logger.debug(f"Attempting to delete project with ID: {project_id}")
    if not ObjectId.is_valid(project_id):
        logger.warning(f"Invalid project ID format for deletion: {project_id}")
        return False
    result = await database["projects"].delete_one({"_id": ObjectId(project_id)})
    if result.deleted_count == 1:
        logger.info(f"Project with ID {project_id} deleted successfully.")
        return True
    logger.warning(f"Project with ID {project_id} not found for deletion.")
    return False

async def get_projects_filtered_populated(
        database: AsyncIOMotorDatabase,
        q: str | None = None,
        sort_by: str = "newest",
) -> list[ProjectResponsePopulated]:
    logger.debug(f"Retrieving populated projects with query='{q}', sort_by='{sort_by}'.")
    
    query = {}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}

    sort_options = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "name-asc": [("name", 1)],
        "name-desc": [("name", -1)],
    }
    sort_order = sort_options.get(sort_by, sort_options["newest"])

    # --- AGGREGATION PIPELINE ---
    pipeline = [
        # find
        {"$match": query},
        {"$sort": dict(sort_order)},
        
        # Join collection 'users' get owner
        {
            "$lookup": {
                "from": "users",  
                "localField": "owner_id",  
                "foreignField": "_id",  
                "as": "owner_info", 
            }
        },
        
        {"$unwind": {"path": "$owner_info", "preserveNullAndEmptyArrays": True}},

        # Join collection 'users' get members
        {
            "$lookup": {
                "from": "users",
                "localField": "members_ids",
                "foreignField": "_id",
                "as": "members_info",
            }
        },

        # output
        {
            "$project": {
                "_id": 1,
                "name": 1,
                "description": 1,
                "created_at": 1,
                "updated_at": 1,
                "owner": {
                    "_id": "$owner_info._id",
                    "username": "$owner_info.username",
                },
                "members": {
                    "$map": {
                        "input": "$members_info",
                        "as": "member",
                        "in": {
                            "_id": "$$member._id",
                            "username": "$$member.username",
                        },
                    }
                },
            }
        },
    ]

    cursor = database["projects"].aggregate(pipeline)
    
    projects = []
    async for doc in cursor:
        projects.append(ProjectResponsePopulated(**doc))
        
    logger.debug(f"Found {len(projects)} populated projects.")
    return projects