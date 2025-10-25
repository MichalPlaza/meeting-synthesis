
import os
from celery import Celery

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")

celery_app = Celery(
    "meeting_synthesis_worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"]
)

celery_app.conf.update(task_track_started=True)

# Optional: Configure logging for Celery
# This will ensure Celery logs are also captured by our main logging setup
from ..core.logging_config import setup_logging
setup_logging()