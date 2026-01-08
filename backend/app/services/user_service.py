"""User service for authentication and user management.

Handles user registration, authentication, approval, access control, and password reset.
"""

import logging
import secrets
from datetime import datetime, timedelta, UTC
from typing import Optional

from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_users
from ..models.user import UserRole, User, PasswordResetToken
from ..schemas.user_schema import Token, UserCreate, UserLogin, UserResponse
from ..services.security import create_access_token, create_refresh_token, verify_password, get_password_hash

# Password reset token expiration time
RESET_TOKEN_EXPIRE_HOURS = 1
PASSWORD_RESET_COLLECTION = "password_reset_tokens"

logger = logging.getLogger(__name__)


def user_to_response(user: User) -> UserResponse:
    """Convert User model to UserResponse schema.

    Args:
        user: User model instance.

    Returns:
        UserResponse schema with user data.
    """
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        manager_id=user.manager_id,
        is_approved=user.is_approved,
        can_edit=user.can_edit,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def register_new_user(
        database: AsyncIOMotorDatabase, user_data: UserCreate
) -> UserResponse:
    """Register a new user.

    Args:
        database: MongoDB database instance.
        user_data: User registration data.

    Returns:
        UserResponse with created user data.

    Raises:
        HTTPException: If email or username already exists.
    """
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

    return user_to_response(created_user)


async def authenticate_user(database: AsyncIOMotorDatabase, form_data: UserLogin) -> Token:
    """Authenticate a user and generate tokens.

    Args:
        database: MongoDB database instance.
        form_data: Login credentials.

    Returns:
        Token with access and optional refresh token.

    Raises:
        HTTPException: If credentials are invalid.
    """
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


async def approve_user(
        database: AsyncIOMotorDatabase, user_id: str, approver_id: str
) -> UserResponse | None:
    """Approve a user for system access.

    Args:
        database: MongoDB database instance.
        user_id: ID of user to approve.
        approver_id: ID of approving admin/manager.

    Returns:
        UserResponse if approved, None otherwise.
    """
    logger.info(f"Attempting to approve user ID {user_id} by approver ID {approver_id}")

    user = await crud_users.get_user_by_id(database, user_id)
    if not user:
        logger.warning(f"User ID {user_id} not found for approval.")
        return None

    approver = await crud_users.get_user_by_id(database, approver_id)
    if not approver:
        logger.warning(f"Approver ID {approver_id} not found.")
        return None

    # Check permissions: admin can approve anyone, PM can approve their own developers
    can_approve = (
        approver.role == UserRole.ADMIN or
        (approver.role == UserRole.PROJECT_MANAGER and user.manager_id == approver.id)
    )

    if not can_approve:
        logger.warning(f"Approver ID {approver_id} does not have permission to approve user ID {user_id}")
        return None

    updated_user = await crud_users.update_user(
        database,
        user_id,
        {"is_approved": True, "can_edit": True}
    )

    if not updated_user:
        logger.error(f"Failed to update user ID {user_id} during approval.")
        return None

    logger.info(f"User ID {user_id} approved successfully by approver ID {approver_id}")
    return user_to_response(updated_user)


async def get_users_by_manager(
        database: AsyncIOMotorDatabase, manager_id: str, requester: User
) -> list[UserResponse]:
    """Get all users under a manager.

    Args:
        database: MongoDB database instance.
        manager_id: ID of the manager.
        requester: User making the request.

    Returns:
        List of UserResponse for managed users.

    Raises:
        HTTPException: If requester lacks permission.
    """
    logger.info(f"Fetching users managed by {manager_id} (requested by {requester.username})")

    if requester.role not in [UserRole.PROJECT_MANAGER, UserRole.ADMIN]:
        logger.warning(
            f"User {requester.username} (role={requester.role}) tried to access users of another manager {manager_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to view users for this manager.",
        )

    users = await crud_users.get_users_by_manager(database, manager_id)
    logger.info(f"Found {len(users)} users managed by {manager_id}")

    return [user_to_response(u) for u in users]


async def revoke_user(
        database: AsyncIOMotorDatabase, user_id: str, requester: User
) -> UserResponse | None:
    """Revoke a user's access.

    Args:
        database: MongoDB database instance.
        user_id: ID of user to revoke.
        requester: User making the request.

    Returns:
        UserResponse if revoked, None if not found.

    Raises:
        HTTPException: If requester lacks permission.
    """
    logger.info(f"Revoking user {user_id} by {requester.username}")

    if requester.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        logger.warning(f"User {requester.username} ({requester.role}) cannot revoke anyone.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to revoke users.",
        )

    user = await crud_users.get_user_by_id(database, user_id)
    if not user:
        logger.warning(f"User to revoke not found: {user_id}")
        return None

    # PM can only revoke their own developers
    if requester.role == UserRole.PROJECT_MANAGER and user.manager_id != requester.id:
        logger.warning(f"Manager {requester.username} tried to revoke user {user_id} not under their management.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revoke developers under your management.",
        )

    updated_user = await crud_users.update_user(
        database,
        user_id,
        {"is_approved": False, "can_edit": False}
    )

    if not updated_user:
        logger.warning(f"Failed to revoke user {user_id} — no modification.")
        return None

    logger.info(f"User {user_id} revoked successfully")
    return user_to_response(updated_user)


async def toggle_edit_access(
        database: AsyncIOMotorDatabase, user_id: str, requester: User
) -> Optional[UserResponse]:
    """Toggle a user's edit access.

    Args:
        database: MongoDB database instance.
        user_id: ID of user to modify.
        requester: User making the request.

    Returns:
        UserResponse if updated, None if not found or no permission.
    """
    user = await crud_users.get_user_by_id(database, user_id)
    if not user:
        logger.warning(f"User {user_id} not found for toggle-edit.")
        return None

    # Check permissions
    can_toggle = (
        requester.role == UserRole.ADMIN or
        (requester.role == UserRole.PROJECT_MANAGER and user.manager_id == requester.id)
    )

    if not can_toggle:
        logger.warning(f"User {requester.username} has no permission to toggle edit for {user.username}")
        return None

    updated_user = await crud_users.update_user(
        database,
        user_id,
        {"can_edit": not user.can_edit}
    )

    if not updated_user:
        logger.error(f"Failed to update can_edit for user {user_id}")
        return None

    logger.info(f"Toggled can_edit for user {user.username} to {updated_user.can_edit}")
    return user_to_response(updated_user)


async def get_users_by_role(database: AsyncIOMotorDatabase, role: str) -> list[UserResponse]:
    """Get all users with a specific role.

    Args:
        database: MongoDB database instance.
        role: Role to filter by.

    Returns:
        List of UserResponse for matching users.
    """
    users = await crud_users.get_users_by_role(database, role)
    return [user_to_response(u) for u in users]


async def get_users_by_roles(database: AsyncIOMotorDatabase, roles: list[str]) -> list[UserResponse]:
    """Get all users with any of the specified roles.

    Args:
        database: MongoDB database instance.
        roles: List of roles to filter by.

    Returns:
        List of UserResponse for matching users.
    """
    users = await crud_users.get_users_by_roles(database, roles)
    return [user_to_response(u) for u in users]


# ===== PASSWORD RESET FUNCTIONS =====

async def create_password_reset_token(database: AsyncIOMotorDatabase, email: str) -> str | None:
    """Generate a password reset token for a user.

    Args:
        database: MongoDB database instance.
        email: User's email address.

    Returns:
        Reset token string if user exists, None otherwise.
    """
    logger.info(f"Creating password reset token for email: {email}")

    # Check if user exists
    user = await crud_users.get_user_by_email(database, email)
    if not user:
        logger.warning(f"Password reset requested for non-existent email: {email}")
        return None

    # Generate secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)

    # Invalidate any existing tokens for this email
    await database[PASSWORD_RESET_COLLECTION].update_many(
        {"email": email, "used": False},
        {"$set": {"used": True}}
    )

    # Create new token
    reset_token = PasswordResetToken(
        email=email,
        token=token,
        expires_at=expires_at,
        used=False
    )

    await database[PASSWORD_RESET_COLLECTION].insert_one(
        reset_token.model_dump(by_alias=True)
    )

    logger.info(f"Password reset token created for email: {email}")
    return token


async def verify_password_reset_token(database: AsyncIOMotorDatabase, token: str) -> str | None:
    """Verify a password reset token and return the associated email.

    Args:
        database: MongoDB database instance.
        token: Reset token to verify.

    Returns:
        Email address if token is valid, None otherwise.
    """
    logger.info("Verifying password reset token")

    record = await database[PASSWORD_RESET_COLLECTION].find_one({
        "token": token,
        "used": False,
        "expires_at": {"$gt": datetime.now(UTC)}
    })

    if not record:
        logger.warning("Invalid or expired password reset token")
        return None

    logger.info(f"Password reset token verified for email: {record['email']}")
    return record["email"]


async def reset_password(
    database: AsyncIOMotorDatabase,
    token: str,
    new_password: str
) -> bool:
    """Reset a user's password using a valid token.

    Args:
        database: MongoDB database instance.
        token: Valid reset token.
        new_password: New password to set.

    Returns:
        True if password was reset, False otherwise.
    """
    logger.info("Attempting to reset password with token")

    # Verify token
    email = await verify_password_reset_token(database, token)
    if not email:
        logger.warning("Password reset failed: invalid token")
        return False

    # Hash new password
    hashed_password = get_password_hash(new_password)

    # Update user's password
    result = await database["users"].update_one(
        {"email": email},
        {
            "$set": {
                "hashed_password": hashed_password,
                "updated_at": datetime.now(UTC)
            }
        }
    )

    if result.modified_count == 0:
        logger.error(f"Failed to update password for email: {email}")
        return False

    # Mark token as used
    await database[PASSWORD_RESET_COLLECTION].update_one(
        {"token": token},
        {"$set": {"used": True}}
    )

    logger.info(f"Password reset successfully for email: {email}")
    return True
