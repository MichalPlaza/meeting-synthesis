
import logging
from datetime import UTC, datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..models.user import User
from ..schemas.user_schema import UserCreate
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

