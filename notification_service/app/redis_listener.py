import asyncio
import json
import logging
import os
import redis.asyncio as redis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
NOTIFICATION_CHANNEL = "meeting_events"


async def redis_listener(manager):
    r = redis.from_url(REDIS_URL, decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe(NOTIFICATION_CHANNEL)

    logger.info(f"Redis listener started, subscribed to channel: {NOTIFICATION_CHANNEL}")
    while True:
        try:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and "data" in message:
                event_data = json.loads(message["data"])
                user_id = event_data.get("uploader_id")
                if user_id:
                    await manager.broadcast_to_user(user_id, json.dumps(event_data))
                    logger.info(f"Relayed event to user {user_id}: {event_data}")
            await asyncio.sleep(0.01)
        except Exception as e:
            logger.error(f"Error in redis_listener: {e}")
            await asyncio.sleep(5)
