
import logging
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_users
from ..schemas.user_schema import Token, UserCreate, UserLogin, UserResponse
from ..services.security import create_access_token, create_refresh_token, verify_password

logger = logging.getLogger(__name__)


async def register_new_user(
    database: AsyncIOMotorDatabase, user_data: UserCreate
) -> UserResponse:
    logger.info(f"Attempting to register new user: {user_data.username}")
    if await crud_users.get_user_by_email(database, email=user_data.email):
        logger.warning(f"Registration failed: User with email {user_data.email} already exists.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with provided email already exists.",
        )
    if await crud_users.get_user_by_username(database, username=user_data.username):
        logger.warning(f"Registration failed: User with username {user_data.username} already exists.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with provided username already exists.",
        )

    created_user = await crud_users.create_user(database, user_data)
    logger.info(f"User {created_user.username} registered successfully with ID: {created_user.id}")

    return UserResponse(
        id=created_user.id,
        username=created_user.username,
        email=created_user.email,
        full_name=created_user.full_name,
        created_at=created_user.created_at,
        updated_at=created_user.updated_at,
    )


async def authenticate_user(database: AsyncIOMotorDatabase, form_data: UserLogin) -> Token:
    logger.info(f"Attempting to authenticate user: {form_data.username_or_email}")
    user = await crud_users.get_user_by_username_or_email(
        database, username_or_email=form_data.username_or_email
    )
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        logger.warning(f"Authentication failed for user: {form_data.username_or_email} - Invalid credentials.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": user.username, "email": user.email}
    access_token = create_access_token(data=token_data)
    logger.info(f"Access token created for user: {user.username}")
    
    refresh_token = None
    if form_data.remember_me:
        refresh_token = create_refresh_token(data=token_data)
        logger.info(f"Refresh token created for user: {user.username}")

    logger.info(f"User {user.username} authenticated successfully.")
    return Token(
        access_token=access_token, 
        refresh_token=refresh_token, 
        token_type="bearer"
    )

