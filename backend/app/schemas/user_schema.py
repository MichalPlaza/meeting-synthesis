from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from ..models.py_object_id import PyObjectId


# ===== ENUM ROLI =====
class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    SCRUM_MASTER = "scrum_master"
    DEVELOPER = "developer"


# ===== BAZOWY SCHEMAT =====
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    manager_id: PyObjectId | None = None  # admin może być None
    is_approved: bool = False
    can_edit: bool = True
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.DEVELOPER
    manager_id: PyObjectId | None = None

    class Config:
        schema_extra = {
            "example": {
                "username": "jan.kowalski",
                "email": "jan.kowalski@example.com",
                "password": "supersecret",
                "full_name": "Jan Kowalski",
                "role": "developer",
                "manager_id": "64f1e8f5c2a1b2c3d4e5f6a7"
            }
        }


class UserLogin(BaseModel):
    username_or_email: str
    password: str
    remember_me: bool = False


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None
    role: UserRole | None = None
    manager_id: PyObjectId | None = None
    is_approved: bool | None = None
    can_edit: bool | None = None


class UserResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    username: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    manager_id: PyObjectId | None = None
    is_approved: bool
    can_edit: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True
        json_encoders = {ObjectId: str, PyObjectId: str}


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str


class TokenData(BaseModel):
    username: str | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str
