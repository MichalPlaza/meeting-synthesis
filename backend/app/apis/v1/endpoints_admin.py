import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from ...core.permissions import require_approval, require_edit_permission
from ...db.mongodb_utils import get_database
from ...crud import crud_admin_dashboard
from ...schemas.admin_dashboard_schema import (
    DashboardStatsResponse,
    ChartResponse,
    RecentActivityResponse,
)

router = APIRouter(
    tags=["Admin Dashboard"],
    dependencies=[Depends(require_approval), Depends(require_edit_permission)]
)
logger = logging.getLogger(__name__)

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_stats(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Retrieve key statistics for the admin dashboard."""
    try:
        stats = await crud_admin_dashboard.get_dashboard_stats(db)
        return DashboardStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch dashboard statistics.")

@router.get("/dashboard/registrations-chart", response_model=ChartResponse)
async def get_chart_data(
    period_days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Provides time-series data for new user registrations."""
    try:
        chart_data = await crud_admin_dashboard.get_registrations_chart_data(db, period_days)
        return ChartResponse(data=chart_data)
    except Exception as e:
        logger.error(f"Error fetching chart data: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch chart data.")

@router.get("/dashboard/meetings-chart", response_model=ChartResponse)
async def get_meetings_chart(
    period_days: int = Query(7, ge=1, le=90),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Provides time-series data for new meeting creations."""
    try:
        chart_data = await crud_admin_dashboard.get_meetings_chart_data(db, period_days)
        return ChartResponse(data=chart_data)
    except Exception as e:
        logger.error(f"Error fetching meetings chart data: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch meetings chart data.")

@router.get("/dashboard/recent-activities", response_model=RecentActivityResponse)
async def get_activities(
    limit: int = Query(5, ge=1, le=20),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Retrieves the most recent activities in the system."""
    try:
        activities = await crud_admin_dashboard.get_recent_activities(db, limit)
        return RecentActivityResponse(activities=activities)
    except Exception as e:
        logger.error(f"Error fetching recent activities: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch recent activities.")