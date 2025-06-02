from dataclasses import Field
from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from pydantic import BaseModel

from .py_object_id import PyObjectId


class Project(BaseModel): # Odpowiada ProjectInDB
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    owner_id: PyObjectId
    members_ids: List[PyObjectId] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True