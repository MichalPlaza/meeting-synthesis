from datetime import UTC, datetime

from motor.motor_asyncio import AsyncIOMotorDatabase

from ..models.user import User
from ..schemas.user_schema import UserCreate
from ..services.security import get_password_hash


async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> User | None:
    user_doc = await db["users"].find_one({"email": email})
    if user_doc:
        return User(**user_doc)
    return None


async def get_user_by_username(
    db: AsyncIOMotorDatabase, username: str
) -> User | None:
    user_doc = await db["users"].find_one({"username": username})
    if user_doc:
        return User(**user_doc)
    return None


async def get_user_by_username_or_email(
    db: AsyncIOMotorDatabase, username_or_email: str
) -> User | None:
    user_doc = await db["users"].find_one(
        {"$or": [{"username": username_or_email}, {"email": username_or_email}]}
    )
    if user_doc:
        return User(**user_doc)
    return None


async def create_user(db: AsyncIOMotorDatabase, user_data: UserCreate) -> User:
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
    result = await db["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return User(**user_doc)


async def get_all_users(db: AsyncIOMotorDatabase) -> list[User]:
    user_docs = await db["users"].find({}).to_list(None)
    return [User(**doc) for doc in user_docs]


async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: str) -> User | None:
    try:
        if not ObjectId.is_valid(user_id):
            return None

        user_doc = await db["users"].find_one({"_id": ObjectId(user_id)})
        if user_doc:
            return User(**user_doc)
        return None
    except Exception as e:
        print(f"Error getting user by ID {user_id}: {e}")
        return None