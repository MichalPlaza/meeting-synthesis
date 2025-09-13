from motor.motor_asyncio import AsyncIOMotorClient

from ..core.config import DATABASE_NAME, MONGO_DETAILS


class MongoDB:
    client: AsyncIOMotorClient = None


mongo_db = MongoDB()


async def connect_to_mongo():
    mongo_db.client = AsyncIOMotorClient(MONGO_DETAILS)


async def close_mongo_connection():
    mongo_db.client.close()


async def get_database():
    if mongo_db.client is None:
        await connect_to_mongo()
    return mongo_db.client[DATABASE_NAME]
