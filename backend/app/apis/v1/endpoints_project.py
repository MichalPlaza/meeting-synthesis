from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ...db.mongodb_utils import get_database
from ...schemas.project_schema import ProjectCreate, ProjectResponse, ProjectUpdate
from ...services import project_service

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate, db: AsyncIOMotorDatabase = Depends(get_database)
):
    project = await project_service.create_new_project(db, project_in)
    return project


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(db: AsyncIOMotorDatabase = Depends(get_database)):
    projects = await project_service.get_projects(db)
    return projects


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    project = await project_service.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/owner/{owner_id}", response_model=list[ProjectResponse])
async def projects_by_owner(
    owner_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    projects = await project_service.get_projects_owned_by_user(db, owner_id)
    return projects


@router.get("/member/{member_id}", response_model=list[ProjectResponse])
async def projects_by_member(
    member_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    projects = await project_service.get_projects_with_member(db, member_id)
    return projects


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    project = await project_service.update_existing_project(db, project_id, project_in)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or no changes")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str, db: AsyncIOMotorDatabase = Depends(get_database)
):
    deleted = await project_service.delete_existing_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return
