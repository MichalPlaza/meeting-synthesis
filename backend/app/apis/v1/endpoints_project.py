
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...auth_dependencies import get_current_user
from ...core.permissions import require_approval, require_edit_permission, user_can_access_project
from ...db.mongodb_utils import get_database
from ...models.user import User
from ...schemas.project_schema import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectResponsePopulated
from ...services import project_service
from ...crud import crud_projects

router = APIRouter(
    tags=["projects"],
    dependencies=[Depends(require_approval), Depends(require_edit_permission)]
)
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
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} listing projects with query: {query}, sort_by: {sort_by}")

    if current_user.role == "admin":
        # Admins see all projects
        projects = await project_service.get_projects_filtered(database, q=query, sort_by=sort_by)
    else:
        # Non-admins see only their projects
        user_projects = await crud_projects.get_projects_by_member(database, str(current_user.id))

        # Apply query filter if provided
        if query:
            query_lower = query.lower()
            user_projects = [p for p in user_projects if query_lower in p.name.lower()]

        # Apply sorting
        if sort_by == "oldest":
            user_projects.sort(key=lambda p: p.created_at)
        elif sort_by == "name-asc":
            user_projects.sort(key=lambda p: p.name.lower())
        elif sort_by == "name-desc":
            user_projects.sort(key=lambda p: p.name.lower(), reverse=True)
        else:  # newest (default)
            user_projects.sort(key=lambda p: p.created_at, reverse=True)

        projects = user_projects

    logger.info(f"Found {len(projects)} projects for user {current_user.username}")
    return projects


@router.get(
    "/populated",
    response_model=list[ProjectResponsePopulated],
    summary="Get a list of projects with populated user data"
)
async def read_projects(
    q: str | None = Query(None, description="Search query for project name"),
    sort_by: str = Query("newest", description="Sort order"),
    database: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve projects. Owner and member information is populated.
    """
    if current_user.role == "admin":
        projects = await project_service.get_projects_filtered_populated(database, q=q, sort_by=sort_by)
    else:
        # For non-admins, get populated data and filter
        all_projects = await project_service.get_projects_filtered_populated(database, q=q, sort_by=sort_by)
        user_id_str = str(current_user.id)
        projects = [
            p for p in all_projects
            if any(str(m.id) == user_id_str for m in (p.members or []))
        ]
    return projects

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
        project_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} fetching project with ID: {project_id}")
    project = await project_service.get_project(database, project_id)
    if not project:
        logger.warning(f"Project with ID {project_id} not found")
        raise HTTPException(status_code=404, detail="Project not found")

    # Check membership
    if not await user_can_access_project(database, current_user, project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )

    logger.info(f"Successfully fetched project with ID: {project_id}")
    return project


@router.get("/owner/{owner_id}", response_model=list[ProjectResponse])
async def projects_by_owner(
        owner_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} fetching projects for owner with ID: {owner_id}")

    # Only admin or the owner themselves can view projects by owner
    if current_user.role != "admin" and str(current_user.id) != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own projects"
        )

    projects = await project_service.get_projects_owned_by_user(database, owner_id)
    logger.info(f"Found {len(projects)} projects for owner with ID: {owner_id}")
    return projects


@router.get("/member/{member_id}", response_model=list[ProjectResponse])
async def projects_by_member(
        member_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} fetching projects for member with ID: {member_id}")

    # Only admin or the member themselves can view their projects
    if current_user.role != "admin" and str(current_user.id) != member_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own projects"
        )

    projects = await project_service.get_projects_with_member(database, member_id)
    logger.info(f"Found {len(projects)} projects for member with ID: {member_id}")
    return projects


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
        project_id: str,
        project_in: ProjectUpdate,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} updating project with ID: {project_id}")

    # Fetch project to check ownership
    project = await project_service.get_project(database, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only owner or admin can update
    if current_user.role != "admin" and str(project.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner or admin can update this project"
        )

    updated_project = await project_service.update_existing_project(database, project_id, project_in)
    if not updated_project:
        logger.warning(f"Project with ID {project_id} not found or no changes")
        raise HTTPException(status_code=404, detail="Project not found or no changes")
    logger.info(f"Successfully updated project with ID: {project_id}")
    return updated_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
        project_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} deleting project with ID: {project_id}")

    # Fetch project to check ownership
    project = await project_service.get_project(database, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Only owner or admin can delete
    if current_user.role != "admin" and str(project.owner_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project owner or admin can delete this project"
        )

    deleted = await project_service.delete_existing_project(database, project_id)
    if not deleted:
        logger.warning(f"Project with ID {project_id} not found for deletion")
        raise HTTPException(status_code=404, detail="Project not found")
    logger.info(f"Successfully deleted project with ID: {project_id}")
    return

