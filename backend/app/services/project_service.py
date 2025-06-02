from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..schemas.project_schema import ProjectCreate, ProjectUpdate
from ..models.project import Project
from ..crud import crud_projects


async def create_new_project(db: AsyncIOMotorDatabase, project_data: ProjectCreate) -> Project:
    return await crud_projects.create_project(db, project_data)


async def get_project(db: AsyncIOMotorDatabase, project_id: str) -> Optional[Project]:
    return await crud_projects.get_project_by_id(db, project_id)


async def get_projects(db: AsyncIOMotorDatabase) -> List[Project]:
    return await crud_projects.get_all_projects(db)


async def update_existing_project(db: AsyncIOMotorDatabase, project_id: str, project_data: ProjectUpdate) -> Optional[
    Project]:
    return await crud_projects.update_project(db, project_id, project_data)


async def delete_existing_project(db: AsyncIOMotorDatabase, project_id: str) -> bool:
    return await crud_projects.delete_project(db, project_id)

async def get_projects_owned_by_user(db: AsyncIOMotorDatabase, owner_id: str) -> List[Project]:
    return await crud_projects.get_projects_by_owner(db, owner_id)

async def get_projects_with_member(db: AsyncIOMotorDatabase, member_id: str) -> List[Project]:
    return await crud_projects.get_projects_by_member(db, member_id)
