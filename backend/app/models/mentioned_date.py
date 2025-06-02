from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MentionedDate(BaseModel):
    text_mention: str
    parsed_date: Optional[datetime] = None