from datetime import datetime

from pydantic import BaseModel


class MentionedDate(BaseModel):
    text_mention: str
    parsed_date: datetime | None = None
