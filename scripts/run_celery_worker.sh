#!/bin/bash

# Exit on error
set -e

# Navigate to the backend directory
cd backend

# Set environment variables for local Redis
export CELERY_BROKER_URL=redis://localhost:6379/0
export CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Run the Celery worker
poetry run celery -A app.worker.celery_app worker --loglevel=info
