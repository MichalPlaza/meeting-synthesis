import logging
import re
from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from ..models.user import User
from ..schemas.user_schema import UserCreate, UserUpdate
from ..services.security import get_password_hash

logger = logging.getLogger(__name__)


async def get_user_by_email(database: AsyncIOMotorDatabase, email: str) -> User | None:
    logger.debug(f"Attempting to retrieve user by email: {email}")
    user_doc = await database["users"].find_one({"email": email})
    if user_doc:
        logger.debug(f"User with email {email} found.")
        return User(**user_doc)
    logger.debug(f"User with email {email} not found.")
    return None


async def get_user_by_username(
        database: AsyncIOMotorDatabase, username: str
) -> User | None:
    logger.debug(f"Attempting to retrieve user by username: {username}")
    user_doc = await database["users"].find_one({"username": username})
    if user_doc:
        logger.debug(f"User with username {username} found.")
        return User(**user_doc)
    logger.debug(f"User with username {username} not found.")
    return None


async def get_user_by_username_or_email(
        database: AsyncIOMotorDatabase, username_or_email: str
) -> User | None:
    logger.debug(f"Attempting to retrieve user by username or email: {username_or_email}")
    user_doc = await database["users"].find_one(
        {"$or": [{"username": username_or_email}, {"email": username_or_email}]}
    )
    if user_doc:
        logger.debug(f"User with username or email {username_or_email} found.")
        return User(**user_doc)
    logger.debug(f"User with username or email {username_or_email} not found.")
    return None


async def create_user(database: AsyncIOMotorDatabase, user_data: UserCreate) -> User:
    logger.debug(f"Creating new user: {user_data.username}")
    hashed_password = get_password_hash(user_data.password)
    now = datetime.now(UTC)

    user_doc = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "manager_id": user_data.manager_id,
        "is_approved": False,
        "can_edit": False,
        "created_at": now,
        "updated_at": now,
    }

    result = await database["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    logger.info(f"User {user_data.username} created with ID: {result.inserted_id}")
    return User(**user_doc)


async def get_all_users(database: AsyncIOMotorDatabase) -> list[User]:
    logger.debug("Retrieving all users.")
    user_docs = await database["users"].find({}).to_list(None)
    logger.debug(f"Found {len(user_docs)} total users.")
    return [User(**doc) for doc in user_docs]


async def get_user_by_id(database: AsyncIOMotorDatabase, user_id: str) -> User | None:
    logger.debug(f"Attempting to retrieve user by ID: {user_id}")
    try:
        if not ObjectId.is_valid(user_id):
            logger.warning(f"Invalid user ID format: {user_id}")
            return None

        user_doc = await database["users"].find_one({"_id": ObjectId(user_id)})
        if user_doc:
            logger.debug(f"User with ID {user_id} found.")
            return User(**user_doc)
        logger.debug(f"User with ID {user_id} not found.")
        return None
    except Exception as e:
        logger.error(f"Error getting user by ID {user_id}: {e}", exc_info=True)
        return None

async def update_user(
    database: AsyncIOMotorDatabase, user_id: str, user_data: UserUpdate
) -> User | None:
    logger.debug(f"Attempting to update user with ID: {user_id}")
    
    if not (existing_user := await get_user_by_id(database, user_id)):
        logger.warning(f"Update failed: User with ID {user_id} not found.")
        return None

    if isinstance(user_data, BaseModel):
        update_data = user_data.dict(exclude_unset=True)
    else:
        update_data = user_data

    if not update_data:
        logger.debug(f"No fields provided to update for user ID {user_id}.")
        return existing_user
    update_data["updated_at"] = datetime.now(UTC)
    
    result = await database["users"].update_one(
        {"_id": ObjectId(user_id)}, {"$set": update_data}
    )

    if result.modified_count > 0:
        updated_user = await get_user_by_id(database, user_id)
        logger.info(f"User with ID {user_id} was updated successfully.")
        return updated_user
    
    logger.debug(f"Data for user ID {user_id} was the same, no update performed.")
    return existing_user

async def delete_user(database: AsyncIOMotorDatabase, user_id: str) -> bool:
    logger.debug(f"Attempting to delete user with ID: {user_id}")
    result = await database["users"].delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 1:
        logger.info(f"User with ID {user_id} was deleted successfully.")
        return True
    
    logger.warning(f"Delete failed: User with ID {user_id} not found.")
    return False

async def search_users_by_username(
    database: AsyncIOMotorDatabase, search_term: str, limit: int = 10
) -> list[User]:
    """
    Finds users whose username contains the search term (case-insensitive).
    """
    if not search_term:
        return []

    query = {"username": {"$regex": re.escape(search_term), "$options": "i"}}
    
    cursor = database["users"].find(query).limit(limit)
    
    users = []
    async for doc in cursor:
        users.append(User(**doc))
        
    return users

async def get_users_by_manager(database: AsyncIOMotorDatabase, manager_id: str) -> list[User]:
    """Get all users managed by a specific manager.

    Args:
        database: MongoDB database instance.
        manager_id: ID of the manager.

    Returns:
        List of User objects under the manager.
    """
    if not ObjectId.is_valid(manager_id):
        logger.warning(f"Invalid manager ID format: {manager_id}")
        return []

    cursor = database["users"].find({"manager_id": ObjectId(manager_id)})
    users = [User(**doc) async for doc in cursor]
    return users


async def get_users_by_role(database: AsyncIOMotorDatabase, role: str) -> list[User]:
    """Get all users with a specific role.

    Args:
        database: MongoDB database instance.
        role: Role to filter by.

    Returns:
        List of User objects with the specified role.
    """
    logger.debug(f"Retrieving users with role: {role}")
    cursor = database["users"].find({"role": role})
    users = [User(**doc) async for doc in cursor]
    logger.debug(f"Found {len(users)} users with role {role}")
    return users


async def get_users_by_roles(database: AsyncIOMotorDatabase, roles: list[str]) -> list[User]:
    """Get all users with any of the specified roles.

    Args:
        database: MongoDB database instance.
        roles: List of roles to filter by.

    Returns:
        List of User objects with any of the specified roles.
    """
    logger.debug(f"Retrieving users with roles: {roles}")
    cursor = database["users"].find({"role": {"$in": roles}})
    users = [User(**doc) async for doc in cursor]
    logger.debug(f"Found {len(users)} users with roles {roles}")
    return users

