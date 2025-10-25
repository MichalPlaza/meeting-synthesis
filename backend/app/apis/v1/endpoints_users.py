
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...db.mongodb_utils import get_database
from ...schemas.user_schema import UserResponse
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
        database: AsyncIOMotorDatabase = Depends(get_database)
):
    logger.info("Fetching all users")
    all_users = await crud_users.get_all_users(database)
    logger.info(f"Found {len(all_users)} users")
    return all_users

