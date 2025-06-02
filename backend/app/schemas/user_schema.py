from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field

from ..models.py_object_id import PyObjectId


class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str = None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None


class UserResponse(BaseModel):
    id: PyObjectId | None = Field(alias="_id")
    username: str
    email: EmailStr
    full_name: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        from_attributes = True
        json_encoders = {ObjectId: str, PyObjectId: str}


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str | None = None
