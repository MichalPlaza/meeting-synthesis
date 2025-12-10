"""Fix audio paths in seeded meetings."""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

os.environ["MONGO_DETAILS"] = "mongodb://localhost:27017"

MONGO_DETAILS = "mongodb://localhost:27017"
DATABASE_NAME = "meeting_synthesis_db"
MICHAL_USER_ID = "6858e901658d3dc81ed842f5"


async def fix_audio_paths():
    client = AsyncIOMotorClient(MONGO_DETAILS)
    db = client[DATABASE_NAME]

    # Find meetings that have paths not starting with /media/
    cursor = db.meetings.find({
        "audio_file.storage_path_or_url": {"$not": {"$regex": "^/media/"}}
    })

    meetings = await cursor.to_list(length=None)
    print(f"Found {len(meetings)} meetings to fix")

    for meeting in meetings:
        old_path = meeting["audio_file"]["storage_path_or_url"]

        # Skip if already correct or is a placeholder
        if old_path.startswith("/media/") or old_path == "string":
            continue

        new_path = f"/media/{old_path}"

        await db.meetings.update_one(
            {"_id": meeting["_id"]},
            {"$set": {"audio_file.storage_path_or_url": new_path}}
        )
        print(f"Fixed: {meeting['title']} -> {new_path}")

    client.close()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(fix_audio_paths())
