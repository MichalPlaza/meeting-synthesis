from pydantic import BaseModel, Field
from typing import List, Dict, Any
from datetime import datetime
from ..models.py_object_id import PyObjectId

class DashboardStatsResponse(BaseModel):
    total_users: int
    total_projects: int
    total_meetings: int

class ChartDataPoint(BaseModel):
    date: str  
    count: int 

class ChartResponse(BaseModel):
    data: List[ChartDataPoint]

class RecentActivityItem(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    activity_type: str 
    timestamp: datetime
    details: Dict[str, Any]

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {PyObjectId: str}

class RecentActivityResponse(BaseModel):
    activities: List[RecentActivityItem]