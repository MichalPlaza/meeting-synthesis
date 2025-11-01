
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.project_schema import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectResponsePopulated
from ...services import project_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
        project_in: ProjectCreate, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Creating new project: {project_in.name}")
    project = await project_service.create_new_project(database, project_in)
    logger.info(f"Successfully created project with ID: {project.id}")
    return project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
        query: str = Query(None, description="Search term for project name"),
        sort_by: str = Query("newest", description="Sort order"),
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Listing projects with query: {query}, sort_by: {sort_by}")
    projects = await project_service.get_projects_filtered(database, q=query, sort_by=sort_by)
    logger.info(f"Found {len(projects)} projects")
    return projects

@router.get(
    "/populated",
    response_model=list[ProjectResponsePopulated], # <-- SỬ DỤNG RESPONSE MODEL MỚI
    summary="Get a list of projects with populated user data"
)
async def read_projects(
    q: str | None = Query(None, description="Search query for project name"),
    sort_by: str = Query("newest", description="Sort order"),
    database: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Retrieve projects. Owner and member information is populated.
    """
    # GỌI HÀM CRUD MỚI
    projects = await project_service.get_projects_filtered_populated(database, q=q, sort_by=sort_by)
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
        project_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Fetching project with ID: {project_id}")
    project = await project_service.get_project(database, project_id)
    if not project:
        logger.warning(f"Project with ID {project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info(f"Successfully fetched project with ID: {project_id}")
    return project


@router.get("/owner/{owner_id}", response_model=list[ProjectResponse])
async def projects_by_owner(
        owner_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Fetching projects for owner with ID: {owner_id}")
    projects = await project_service.get_projects_owned_by_user(database, owner_id)
    logger.info(f"Found {len(projects)} projects for owner with ID: {owner_id}")
    return projects


@router.get("/member/{member_id}", response_model=list[ProjectResponse])
async def projects_by_member(
        member_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Fetching projects for member with ID: {member_id}")
    projects = await project_service.get_projects_with_member(database, member_id)
    logger.info(f"Found {len(projects)} projects for member with ID: {member_id}")
    return projects


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
        project_id: str,
        project_in: ProjectUpdate,
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"Updating project with ID: {project_id}")
    project = await project_service.update_existing_project(database, project_id, project_in)
    if not project:
        logger.warning(f"Project with ID {project_id} not found or no changes")
        raise HTTPException(status_code=404, detail="Project not found or no changes")
    logger.info(f"Successfully updated project with ID: {project_id}")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
        project_id: str, database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Deleting project with ID: {project_id}")
    deleted = await project_service.delete_existing_project(database, project_id)
    if not deleted:
        logger.warning(f"Project with ID {project_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info(f"Successfully deleted project with ID: {project_id}")
    return

