from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict

from ..models.py_object_id import PyObjectId


class ProjectBase(BaseModel):
    name: str
    description: str | None = None


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    owner_id: PyObjectId
    members_ids: list[PyObjectId] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    members_ids: list[PyObjectId] | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={ObjectId: str, PyObjectId: str},
        arbitrary_types_allowed=True
    )

    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: str
    owner_id: PyObjectId
    members_ids: list[PyObjectId]
    created_at: datetime
    updated_at: datetime


# Schema Project has basic information of Users
class UserInfo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={ObjectId: str, PyObjectId: str},
        arbitrary_types_allowed=True
    )
    
    id: PyObjectId = Field(..., alias="_id")
    username: str


class ProjectResponsePopulated(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={ObjectId: str, PyObjectId: str},
        arbitrary_types_allowed=True
    )
    
    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: str
    owner: UserInfo  
    members: list[UserInfo] = [] 
    created_at: datetime
    updated_at: datetime

# Schema Project has basic information of Users
class UserInfo(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    username: str

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True

class ProjectResponsePopulated(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    name: str
    description: str
    owner: UserInfo  
    members: list[UserInfo] = [] 
    created_at: datetime
    updated_at: datetime
