from datetime import datetime
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

from .enums.action_items_status import ActionItemStatus


class ActionItem(BaseModel):
    item_id: UUID = Field(default_factory=uuid4)
    description: str
    assigned_to_raw: str | None = None
    due_date_raw: str | None = None
    due_date_parsed: datetime | None = None
    status: ActionItemStatus = ActionItemStatus.TODO
    jira_ticket_id: str | None = None
    user_comment: str | None = None
