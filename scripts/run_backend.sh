#!/bin/bash

# Exit on error
set -e

# Navigate to the backend directory
cd backend

# Install dependencies
poetry install

# Run the backend server
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
