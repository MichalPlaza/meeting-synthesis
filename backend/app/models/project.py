from dataclasses import Field
from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from pydantic import BaseModel


class Project(BaseModel): # Odpowiada ProjectInDB
    id: ObjectId = Field(default_factory=ObjectId)
    name: str
    description: Optional[str] = None
    owner_id: ObjectId
    members_ids: List[ObjectId] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))