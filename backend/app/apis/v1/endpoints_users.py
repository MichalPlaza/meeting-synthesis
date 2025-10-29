import logging
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import UserResponse
from ...crud import crud_users
from ...auth_dependencies import get_current_user
from ...models.user import User
from ...services import user_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserResponse)
async def get_user_me(
        current_user: User = Depends(get_current_user)
):
    logger.info(f"Fetching current user: {current_user.username}")
    return current_user


@router.get("/", response_model=List[UserResponse])
async def get_users(
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info("Fetching all users")
    all_users = await crud_users.get_all_users(database)
    logger.info(f"Found {len(all_users)} users")
    return all_users


@router.patch("/{user_id}/approve", response_model=UserResponse)
async def approve_user_endpoint(
        user_id: str,
        current_user: User = Depends(get_current_user),
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"User {current_user.username} attempting to approve user ID {user_id}")

    approved_user = await user_service.approve_user(database, user_id, str(current_user.id))
    if not approved_user:
        logger.warning(f"Approval failed: User ID {user_id} cannot be approved by {current_user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to approve this user or user not found.",
        )

    logger.info(f"User ID {user_id} approved successfully by {current_user.username}")
    return approved_user


@router.get("/by-manager/{manager_id}", response_model=List[UserResponse])
async def get_users_by_manager_endpoint(
        manager_id: str,
        current_user: User = Depends(get_current_user),
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"API request: get users by manager {manager_id}")
    return await user_service.get_users_by_manager(database, manager_id, current_user)


@router.patch("/{user_id}/revoke", response_model=UserResponse)
async def revoke_user_endpoint(
        user_id: str,
        current_user: User = Depends(get_current_user),
        database: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"User {current_user.username} attempting to revoke access for {user_id}")
    revoked_user = await user_service.revoke_user(database, user_id, current_user)

    if not revoked_user:
        logger.warning(f"Revocation failed for {user_id} by {current_user.username}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to revoke this user or user not found.",
        )

    logger.info(f"User {user_id} revoked successfully by {current_user.username}")
    return revoked_user


@router.patch("/{user_id}/toggle-edit", response_model=UserResponse)
async def toggle_edit_access_endpoint(
        user_id: str,
        database: AsyncIOMotorDatabase = Depends(get_database),
        current_user: User = Depends(get_current_user),
):
    logger.info(f"User {current_user.username} requested toggle-edit for user {user_id}")
    updated_user = await user_service.toggle_edit_access(database, user_id, current_user)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to change edit access for this user.",
        )
    return updated_user
