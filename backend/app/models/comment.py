from datetime import UTC, datetime
from pydantic import BaseModel, Field
from ..models.py_object_id import PyObjectId


class Comment(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    meeting_id: PyObjectId
    author_id: PyObjectId
    author_name: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        from_attributes = True
        arbitrary_types_allowed = True
