import logging
from typing import Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..crud import crud_users
from ..models.user import UserRole, User
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
        role=created_user.role,
        manager_id=created_user.manager_id,
        is_approved=created_user.is_approved,
        can_edit=created_user.can_edit,
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


async def approve_user(database: AsyncIOMotorDatabase, user_id: str, approver_id: str) -> UserResponse | None:
    logger.info(f"Attempting to approve user ID {user_id} by approver ID {approver_id}")
    user = await crud_users.get_user_by_id(database, user_id)
    if not user:
        logger.warning(f"User ID {user_id} not found for approval.")
        return None
    approver = await crud_users.get_user_by_id(database, approver_id)
    if not approver:
        logger.warning(f"Approver ID {approver_id} not found.")
        return None

    if approver.role == "admin" or (approver.role == "project_manager" and user.manager_id == approver.id):
        updated_user = await crud_users.update_user(
            database,
            user_id,
            {"is_approved": True, "can_edit": True}
        )
        if updated_user:
            logger.info(f"User ID {user_id} approved successfully by approver ID {approver_id}")
            return UserResponse(
                id=updated_user.id,
                username=updated_user.username,
                email=updated_user.email,
                full_name=updated_user.full_name,
                role=updated_user.role,
                manager_id=updated_user.manager_id,
                is_approved=updated_user.is_approved,
                can_edit=updated_user.can_edit,
                created_at=updated_user.created_at,
                updated_at=updated_user.updated_at,
            )
        else:
            logger.error(f"Failed to update user ID {user_id} during approval.")
    else:
        logger.warning(f"Approver ID {approver_id} does not have permission to approve user ID {user_id}")

    return None


async def get_users_by_manager(
        database: AsyncIOMotorDatabase, manager_id: str, requester: User
) -> list[UserResponse]:
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

    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            manager_id=u.manager_id,
            is_approved=u.is_approved,
            can_edit=u.can_edit,
            created_at=u.created_at,
            updated_at=u.updated_at,
        )
        for u in users
    ]


from bson import ObjectId
from fastapi import HTTPException, status


async def revoke_user(database: AsyncIOMotorDatabase, user_id: str, requester: User):
    logger.info(f"Revoking user {user_id} by {requester.username}")

    # tylko admin lub manager tego dev-a
    if requester.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        logger.warning(f"User {requester.username} ({requester.role}) cannot revoke anyone.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not allowed to revoke users.",
        )

    # znajdź usera do zablokowania
    user_doc = await database["users"].find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        logger.warning(f"User to revoke not found: {user_id}")
        return None

    # sprawdź czy manager jest jego managerem
    if requester.role == UserRole.PROJECT_MANAGER and str(user_doc.get("manager_id")) != str(requester.id):
        logger.warning(f"Manager {requester.username} tried to revoke user {user_id} not under their management.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revoke developers under your management.",
        )

    # aktualizacja statusu
    update_result = await database["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_approved": False, "can_edit": False}}
    )

    if update_result.modified_count == 0:
        logger.warning(f"Failed to revoke user {user_id} — no modification.")
        return None

    updated_user = await database["users"].find_one({"_id": ObjectId(user_id)})
    return UserResponse(**User(**updated_user).model_dump())


async def toggle_edit_access(database: AsyncIOMotorDatabase, user_id: str, requester: User) -> Optional[UserResponse]:
    user = await crud_users.get_user_by_id(database, user_id)
    if not user:
        logger.warning(f"User {user_id} not found for toggle-edit.")
        return None

    if requester.role != UserRole.ADMIN and not (
            requester.role == UserRole.PROJECT_MANAGER and user.manager_id == requester.id):
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
    return UserResponse(
        id=updated_user.id,
        username=updated_user.username,
        email=updated_user.email,
        full_name=updated_user.full_name,
        role=updated_user.role,
        manager_id=updated_user.manager_id,
        is_approved=updated_user.is_approved,
        can_edit=updated_user.can_edit,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at,
    )


async def get_users_by_role(database: AsyncIOMotorDatabase, role: str) -> list[UserResponse]:
    users_cursor = database["users"].find({"role": role})
    users_list = await users_cursor.to_list(length=None)

    return [
        UserResponse(
            id=u["_id"],
            username=u["username"],
            email=u["email"],
            full_name=u.get("full_name"),
            role=u["role"],
            manager_id=u.get("manager_id"),
            is_approved=u.get("is_approved", False),
            can_edit=u.get("can_edit", False),
            created_at=u.get("created_at"),
            updated_at=u.get("updated_at"),
        )
        for u in users_list
    ]
