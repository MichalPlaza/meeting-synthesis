
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import UserResponse, UserUpdate
from ...crud import crud_users
from ...auth_dependencies import get_current_user
from ...models.user import User

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
        search: str | None = Query(None, description="Search term for username"),
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    if search:
        logger.info(f"Searching for users with term: '{search}'")
        searched_users = await crud_users.search_users_by_username(database, search)
        logger.info(f"Found {len(searched_users)} users from search")
        return searched_users

    logger.info("Fetching all users")
    all_users = await crud_users.get_all_users(database)
    logger.info(f"Found {len(all_users)} users")
    return all_users

@router.put("/{user_id}", response_model=UserResponse)
async def update_user_endpoint(
    user_id: str,
    user_data: UserUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info(f"Received request to update user ID: {user_id}")
    updated_user = await crud_users.update_user(db, user_id, user_data)
    
    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )
    return updated_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_endpoint(
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    logger.info(f"Received request to delete user ID: {user_id}")
    deleted = await crud_users.delete_user(db, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found",
        )

    return None