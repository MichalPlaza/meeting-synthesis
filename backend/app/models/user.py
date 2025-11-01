from datetime import UTC, datetime

from bson import ObjectId
from pydantic import BaseModel, Field

from .py_object_id import PyObjectId


class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: str
    hashed_password: str
    full_name: str | None = None
    role: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True
