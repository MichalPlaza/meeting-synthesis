
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_projects
from ..models.project import Project
from ..schemas.project_schema import ProjectCreate, ProjectUpdate

logger = logging.getLogger(__name__)


async def create_new_project(
        database: AsyncIOMotorDatabase, project_data: ProjectCreate
) -> Project:
    logger.info(f"Service: Creating new project: {project_data.name}")
    return await crud_projects.create_project(database, project_data)


async def get_project(database: AsyncIOMotorDatabase, project_id: str) -> Project | None:
    logger.info(f"Service: Getting project with ID: {project_id}")
    return await crud_projects.get_project_by_id(database, project_id)


async def get_projects_filtered(
        database: AsyncIOMotorDatabase, q: str | None, sort_by: str
) -> list[Project]:
    logger.info(f"Service: Getting projects with filters: q={q}, sort_by={sort_by}")
    return await crud_projects.get_projects_filtered(database, q=q, sort_by=sort_by)


async def update_existing_project(
        database: AsyncIOMotorDatabase, project_id: str, project_data: ProjectUpdate
) -> Project | None:
    logger.info(f"Service: Updating project with ID: {project_id}")
    return await crud_projects.update_project(database, project_id, project_data)


async def delete_existing_project(database: AsyncIOMotorDatabase, project_id: str) -> bool:
    logger.info(f"Service: Deleting project with ID: {project_id}")
    return await crud_projects.delete_project(database, project_id)


async def get_projects_owned_by_user(
        database: AsyncIOMotorDatabase, owner_id: str
) -> list[Project]:
    logger.info(f"Service: Getting projects owned by user ID: {owner_id}")
    return await crud_projects.get_projects_by_owner(database, owner_id)


async def get_projects_with_member(
        database: AsyncIOMotorDatabase, member_id: str
) -> list[Project]:
    logger.info(f"Service: Getting projects with member ID: {member_id}")
    return await crud_projects.get_projects_by_member(database, member_id)

