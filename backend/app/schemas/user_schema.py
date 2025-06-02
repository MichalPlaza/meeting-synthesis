from bson import ObjectId
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Annotated
from datetime import datetime

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
    full_name: Optional[str] = None



class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id")
    username: str
    email: EmailStr
    full_name: Optional[str] = None
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
    username: Optional[str] = None
