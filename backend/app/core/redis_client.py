
import logging
import redis.asyncio as redis
import os
import json

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
NOTIFICATION_CHANNEL = "meeting_events"

pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)
logger = logging.getLogger(__name__)


async def publish_event(event_data: dict):
    try:
        redis_client = redis.Redis(connection_pool=pool)
        message = json.dumps(event_data)
        await redis_client.publish(NOTIFICATION_CHANNEL, message)
        logger.info(f"Published event to {NOTIFICATION_CHANNEL}: {message}")
    except Exception as e:
        logger.error(f"Error publishing Redis event: {e}")

