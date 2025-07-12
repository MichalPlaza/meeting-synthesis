import redis.asyncio as redis
import os
import json

REDIS_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
NOTIFICATION_CHANNEL = "meeting_events"

# Tworzymy pulę połączeń, która będzie reużywana
pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)

async def publish_event(event_data: dict):
    """Publikuje zdarzenie do kanału Redis."""
    try:
        # Pobieramy połączenie z puli
        r = redis.Redis(connection_pool=pool)
        message = json.dumps(event_data)
        await r.publish(NOTIFICATION_CHANNEL, message)
        print(f"Published event to {NOTIFICATION_CHANNEL}: {message}")
    except Exception as e:
        print(f"Error publishing Redis event: {e}")