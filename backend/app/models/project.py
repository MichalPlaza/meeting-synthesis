from datetime import UTC, datetime

from bson import ObjectId
from pydantic import BaseModel, Field

from .py_object_id import PyObjectId


class Project(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: str | None = None
    owner_id: PyObjectId
    members_ids: list[PyObjectId] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    meeting_datetime: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True
