from typing import Any
from pydantic import BaseModel
from datetime import datetime, UTC


class MeetingHistory(BaseModel):
    meeting_id: str
    field: str
    old_value: Any = None
    new_value: Any = None
    user_id: str
    username: str
    changed_at: datetime = datetime.now(UTC)


def serialize_value(v):
    try:
        return v.model_dump()
    except:
        return v
