# app/core/permissions.py
from fastapi import Depends, HTTPException, Request, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..auth_dependencies import get_current_user
from ..models.user import User


async def require_approval(user=Depends(get_current_user)):
    if not user.is_approved:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account not approved")
    return user


async def require_edit_permission(request: Request, user=Depends(get_current_user)):
    if request.method in {"PATCH", "PUT", "DELETE", "POST"} and not user.can_edit:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User cannot edit data")
    return user


async def get_user_accessible_project_ids(
    database: AsyncIOMotorDatabase,
    user: User
) -> list[str]:
    """Get list of project IDs the user can access.

    Admins can access all projects.
    Other users can only access projects where they are members.

    Args:
        database: MongoDB database instance.
        user: Current user.

    Returns:
        List of project ID strings.
    """
    from ..crud import crud_projects

    if user.role == "admin":
        all_projects = await crud_projects.get_projects_filtered(database)
        return [str(p.id) for p in all_projects]
    else:
        user_projects = await crud_projects.get_projects_by_member(database, str(user.id))
        return [str(p.id) for p in user_projects]


async def user_can_access_project(
    database: AsyncIOMotorDatabase,
    user: User,
    project_id: str
) -> bool:
    """Check if user can access a specific project.

    Args:
        database: MongoDB database instance.
        user: Current user.
        project_id: ID of the project to check.

    Returns:
        True if user has access, False otherwise.
    """
    from ..crud import crud_projects

    if user.role == "admin":
        return True

    project = await crud_projects.get_project_by_id(database, project_id)
    if not project:
        return False

    return str(user.id) in [str(m) for m in project.members_ids]


async def user_can_access_meeting(
    database: AsyncIOMotorDatabase,
    user: User,
    meeting
) -> bool:
    """Check if user has access to a meeting based on project membership.

    Args:
        database: MongoDB database instance.
        user: Current user.
        meeting: Meeting object to check access for.

    Returns:
        True if user has access, False otherwise.
    """
    if user.role == "admin":
        return True

    return await user_can_access_project(database, user, str(meeting.project_id))
