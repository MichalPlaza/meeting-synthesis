
import logging
from motor.motor_asyncio import AsyncIOMotorClient

from ..core.config import DATABASE_NAME, MONGO_DETAILS

logger = logging.getLogger(__name__)


class MongoDB:
    client: AsyncIOMotorClient = None


mongo_db = MongoDB()


async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    mongo_db.client = AsyncIOMotorClient(MONGO_DETAILS)
    logger.info("MongoDB connection established.")


async def close_mongo_connection():
    logger.info("Closing MongoDB connection...")
    mongo_db.client.close()
    logger.info("MongoDB connection closed.")


async def get_database():
    if mongo_db.client is None:
        logger.warning("MongoDB client not initialized. Attempting to connect.")
        await connect_to_mongo()
    return mongo_db.client[DATABASE_NAME]

