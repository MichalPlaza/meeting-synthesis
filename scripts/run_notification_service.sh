#!/bin/bash

# Exit on error
set -e

# Navigate to the notification_service directory
cd notification_service

# Set environment variables for local Redis
export CELERY_BROKER_URL=redis://localhost:6379/0

# Install dependencies
poetry install

# Run the notification service
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8001
