from datetime import datetime
from pydantic import BaseModel, Field
from ..models.py_object_id import PyObjectId


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    id: PyObjectId = Field(..., alias="_id")
    meeting_id: PyObjectId
    author_id: PyObjectId
    author_name: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {PyObjectId: str}


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)
