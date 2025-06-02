from dataclasses import Field
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel

from .py_object_id import PyObjectId


class User(BaseModel): # Odpowiada UserInDB
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: str
    hashed_password: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True