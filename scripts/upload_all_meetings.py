#!/usr/bin/env python3
"""
Script to clear the meetings database and upload all audio files from 5-20min directory.
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from elasticsearch import AsyncElasticsearch

# Configuration
BACKEND_URL = "http://localhost:8000"
AUDIO_DIR = Path(__file__).parent.parent / "5-20min"
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DATABASE", "meeting_synthesis")
ES_URL = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
ES_INDEX = "meetings_knowledge_base"

# Login credentials
USERNAME = "michal@gmail.com"
PASSWORD = "password"


async def clear_database():
    """Clear all meetings from MongoDB and Elasticsearch."""
    print("Clearing database...")

    # Clear MongoDB
    mongo_client = AsyncIOMotorClient(MONGODB_URL)
    db = mongo_client[MONGODB_DB]

    # Delete all meetings
    result = await db.meetings.delete_many({})
    print(f"  Deleted {result.deleted_count} meetings from MongoDB")

    # Delete all meeting history
    result = await db.meeting_history.delete_many({})
    print(f"  Deleted {result.deleted_count} history entries from MongoDB")

    # Delete all comments
    result = await db.comments.delete_many({})
    print(f"  Deleted {result.deleted_count} comments from MongoDB")

    mongo_client.close()

    # Clear Elasticsearch
    es_client = AsyncElasticsearch([ES_URL])
    try:
        # Delete all documents in the index
        await es_client.delete_by_query(
            index=ES_INDEX,
            body={"query": {"match_all": {}}},
            conflicts="proceed"
        )
        print(f"  Cleared Elasticsearch index: {ES_INDEX}")
    except Exception as e:
        print(f"  Warning: Could not clear ES index: {e}")
    finally:
        await es_client.close()

    # Clear uploads directory
    uploads_dir = Path(__file__).parent.parent / "backend" / "uploads"
    if uploads_dir.exists():
        import shutil
        for f in uploads_dir.iterdir():
            if f.is_file():
                f.unlink()
        print(f"  Cleared uploads directory")

    print("Database cleared!")


async def login(client: httpx.AsyncClient) -> str:
    """Login and get access token."""
    print(f"Logging in as {USERNAME}...")
    response = await client.post(
        f"{BACKEND_URL}/auth/login",
        json={"username_or_email": USERNAME, "password": PASSWORD}
    )
    response.raise_for_status()
    token = response.json()["access_token"]
    print("  Login successful!")
    return token


async def get_projects(client: httpx.AsyncClient, token: str, user_id: str) -> list:
    """Get all projects for the user."""
    response = await client.get(
        f"{BACKEND_URL}/project/member/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    return response.json()


async def get_current_user(client: httpx.AsyncClient, token: str) -> dict:
    """Get current user info."""
    response = await client.get(
        f"{BACKEND_URL}/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    return response.json()


async def upload_meeting(
    client: httpx.AsyncClient,
    token: str,
    file_path: Path,
    project_id: str,
    uploader_id: str
) -> dict:
    """Upload a single meeting file."""
    title = file_path.stem.replace("-", " ").replace("_", " ")

    with open(file_path, "rb") as f:
        files = {"file": (file_path.name, f, "audio/mpeg")}
        data = {
            "title": title,
            "meeting_datetime": datetime.now().isoformat(),
            "project_id": project_id,
            "uploader_id": uploader_id,
            "tags": "",
            "processing_mode_selected": "local",
            "language": "en"  # These are English audio files
        }

        response = await client.post(
            f"{BACKEND_URL}/meetings/upload",
            headers={"Authorization": f"Bearer {token}"},
            data=data,
            files=files,
            timeout=300.0  # 5 minutes timeout for large files
        )
        response.raise_for_status()
        return response.json()


async def main():
    """Main function to clear DB and upload all meetings."""
    # Step 1: Clear the database
    await clear_database()

    # Step 2: Get list of audio files
    audio_files = sorted([
        f for f in AUDIO_DIR.iterdir()
        if f.suffix.lower() in [".mp3", ".wav", ".m4a", ".ogg"]
    ])

    print(f"\nFound {len(audio_files)} audio files to upload")

    if not audio_files:
        print("No audio files found!")
        return

    # Step 3: Login and get project info
    async with httpx.AsyncClient() as client:
        token = await login(client)
        user = await get_current_user(client, token)
        user_id = user["_id"]

        projects = await get_projects(client, token, user_id)
        if not projects:
            print("No projects found! Please create a project first.")
            return

        # Use first project by default
        project_id = projects[0]["_id"]
        print(f"\nUsing project: {projects[0]['name']} ({project_id})")

        # Step 4: Upload all files
        print(f"\nUploading {len(audio_files)} meetings...")

        for i, file_path in enumerate(audio_files, 1):
            print(f"\n[{i}/{len(audio_files)}] Uploading: {file_path.name}")
            try:
                meeting = await upload_meeting(client, token, file_path, project_id, user_id)
                print(f"  Created meeting: {meeting['_id']} - {meeting['title']}")
                print(f"  Status: {meeting.get('status', 'unknown')}")
            except Exception as e:
                print(f"  ERROR: {e}")

    print("\n" + "="*50)
    print("Upload complete!")
    print("Celery workers will process the audio files in the background.")
    print("Check the logs for processing status.")


if __name__ == "__main__":
    asyncio.run(main())
