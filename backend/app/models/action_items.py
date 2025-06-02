from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from .enums.action_items_status import ActionItemStatus


class ActionItem(BaseModel):
    item_id: UUID = Field(default_factory=uuid4)
    description: str
    assigned_to_raw: Optional[str] = None
    due_date_raw: Optional[str] = None
    due_date_parsed: Optional[datetime] = None
    status: ActionItemStatus = ActionItemStatus.TODO
    jira_ticket_id: Optional[str] = None
    user_comment: Optional[str] = None