from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from .enums.action_items_status import ActionItemStatus


class ActionItem(BaseModel):
    description: str
    assigned_to: str | None = None
    due_date: datetime | None = None
    user_comment: str | None = None
