from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from ..models.py_object_id import PyObjectId


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    meeting_datetime: datetime


class ProjectCreate(ProjectBase):
    owner_id: PyObjectId
    members_ids: Optional[List[PyObjectId]] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    meeting_datetime: Optional[datetime] = None
    members_ids: Optional[List[PyObjectId]] = None


class ProjectResponse(ProjectBase):
    id: PyObjectId
    owner_id: PyObjectId
    members_ids: List[PyObjectId]
    created_at: datetime
    updated_at: datetime

    class Config:
        json_encoders = {PyObjectId: str}
        from_attributes = True
