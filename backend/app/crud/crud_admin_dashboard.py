from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
from typing import List
import asyncio

async def get_dashboard_stats(db: AsyncIOMotorClient) -> dict:
    user_count_task = db.get_collection("users").count_documents({})
    project_count_task = db.get_collection("projects").count_documents({})
    meeting_count_task = db.get_collection("meetings").count_documents({})

    user_count, project_count, meeting_count = await asyncio.gather(
        user_count_task,
        project_count_task,
        meeting_count_task,
    )
    return {
        "total_users": user_count,
        "total_projects": project_count,
        "total_meetings": meeting_count,
    }

async def get_registrations_chart_data(db: AsyncIOMotorClient, period_days: int) -> List[dict]:
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)

    pipeline = [
        {"$match": {"created_at": {"$gte": start_date, "$lt": end_date}}},
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "date": "$_id", "count": "$count"}}
    ]
    cursor = db.get_collection("users").aggregate(pipeline)
    return await cursor.to_list(length=None)

async def get_meetings_chart_data(db: AsyncIOMotorClient, period_days: int) -> List[dict]:
    """Gets meeting creation data aggregated by day for a given period."""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=period_days)

    pipeline = [
        {"$match": {"uploaded_at": {"$gte": start_date, "$lt": end_date}}}, 
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$uploaded_at"}}, 
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}},
        {"$project": {"_id": 0, "date": "$_id", "count": "$count"}}
    ]
    cursor = db.get_collection("meetings").aggregate(pipeline) 
    return await cursor.to_list(length=None)

async def get_recent_activities(db: AsyncIOMotorClient, limit: int) -> List[dict]:
    if "activities" not in await db.list_collection_names():
        return []
        
    cursor = db.get_collection("activities").find().sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)