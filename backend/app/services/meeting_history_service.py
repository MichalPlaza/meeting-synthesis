from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.meeting_history import MeetingHistory


async def get_latest_changes_for_meeting(database: AsyncIOMotorDatabase, meeting_id: str):
    pipeline = [
        {"$match": {"meeting_id": meeting_id}},
        {"$sort": {"changed_at": -1}},
        {
            "$group": {
                "_id": "$field",
                "meeting_id": {"$first": "$meeting_id"},
                "field": {"$first": "$field"},
                "old_value": {"$first": "$old_value"},
                "new_value": {"$first": "$new_value"},
                "user_id": {"$first": "$user_id"},
                "username": {"$first": "$username"},
                "changed_at": {"$first": "$changed_at"},
            }
        },
        {"$sort": {"changed_at": -1}}
    ]

    results = await database["meeting_history"].aggregate(pipeline).to_list(None)

    for r in results:
        if "user_id" in r and r["user_id"] is not None:
            r["user_id"] = str(r["user_id"])
        if "_id" in r:
            r["_id"] = str(r["_id"])

    return results
