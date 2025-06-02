from ctypes import py_object
from typing import Optional, List
from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, Field
from ..models.py_object_id import PyObjectId


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    meeting_datetime: datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    owner_id: PyObjectId
    members_ids: List[PyObjectId] = []
    meeting_datetime: datetime



class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    meeting_datetime: Optional[datetime] = None
    members_ids: Optional[List[PyObjectId]] = None


class ProjectResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: str
    owner_id: PyObjectId
    members_ids: List[PyObjectId]
    created_at: datetime
    updated_at: datetime
    meeting_datetime: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True

