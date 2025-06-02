from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, Field

from ..models.py_object_id import PyObjectId


class ProjectBase(BaseModel):
    name: str
    description: str | None = None
    meeting_datetime: datetime


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    owner_id: PyObjectId
    members_ids: list[PyObjectId] = []
    meeting_datetime: datetime


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    meeting_datetime: datetime | None = None
    members_ids: list[PyObjectId] | None = None


class ProjectResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: str
    owner_id: PyObjectId
    members_ids: list[PyObjectId]
    created_at: datetime
    updated_at: datetime
    meeting_datetime: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True
