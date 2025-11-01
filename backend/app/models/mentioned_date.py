from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MentionedDate(BaseModel):
    text_mention: Optional[str]
    parsed_date: datetime | None = None
