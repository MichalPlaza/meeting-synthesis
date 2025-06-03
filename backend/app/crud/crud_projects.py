from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..models.project import Project
from ..schemas.project_schema import ProjectCreate, ProjectUpdate


async def get_project_by_id(
    db: AsyncIOMotorDatabase, project_id: str
) -> Project | None:
    if not ObjectId.is_valid(project_id):
        return None
    project_doc = await db["projects"].find_one({"_id": ObjectId(project_id)})
    if project_doc:
        return Project(**project_doc)
    return None


async def get_all_projects(db: AsyncIOMotorDatabase) -> list[Project]:
    projects = []
    cursor = db["projects"].find()
    async for project_doc in cursor:
        projects.append(Project(**project_doc))
    return projects


async def get_projects_by_owner(
    db: AsyncIOMotorDatabase, owner_id: str
) -> list[Project]:
    if not ObjectId.is_valid(owner_id):
        return []
    cursor = db["projects"].find({"owner_id": ObjectId(owner_id)})
    projects = []
    async for doc in cursor:
        projects.append(Project(**doc))
    return projects


async def get_projects_by_member(
    db: AsyncIOMotorDatabase, member_id: str
) -> list[Project]:
    if not ObjectId.is_valid(member_id):
        return []
    cursor = db["projects"].find({"members_ids": ObjectId(member_id)})
    projects = []
    async for doc in cursor:
        projects.append(Project(**doc))
    return projects


async def create_project(
    db: AsyncIOMotorDatabase, project_data: ProjectCreate
) -> Project:
    project_doc = {
        "name": project_data.name,
        "description": project_data.description,
        "meeting_datetime": project_data.meeting_datetime,
        "owner_id": project_data.owner_id,
        "members_ids": project_data.members_ids or [],
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    result = await db["projects"].insert_one(project_doc)
    project_doc["_id"] = result.inserted_id

    return Project(**project_doc)


async def update_project(
    db: AsyncIOMotorDatabase, project_id: str, project_data: ProjectUpdate
) -> Project | None:
    if not ObjectId.is_valid(project_id):
        return None
    update_data = {k: v for k, v in project_data.dict(exclude_unset=True).items()}
    if not update_data:
        return await get_project_by_id(db, project_id)  # Nic do aktualizacji
    update_data["updated_at"] = datetime.now(UTC)
    result = await db["projects"].update_one(
        {"_id": ObjectId(project_id)}, {"$set": update_data}
    )
    if result.modified_count == 1:
        return await get_project_by_id(db, project_id)
    return None


async def delete_project(db: AsyncIOMotorDatabase, project_id: str) -> bool:
    if not ObjectId.is_valid(project_id):
        return False
    result = await db["projects"].delete_one({"_id": ObjectId(project_id)})
    return result.deleted_count == 1
