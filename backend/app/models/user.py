from datetime import UTC, datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from enum import Enum

from .py_object_id import PyObjectId


class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    SCRUM_MASTER = "scrum_master"
    DEVELOPER = "developer"


class User(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    username: str
    email: str
    hashed_password: str
    full_name: str | None = None
    role: UserRole = Field(default=UserRole.DEVELOPER)
    manager_id: PyObjectId | None = None
    is_approved: bool = False
    can_edit: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True
