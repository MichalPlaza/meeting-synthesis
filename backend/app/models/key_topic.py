from typing import Optional

from pydantic import BaseModel


class KeyTopic(BaseModel):
    topic: str
    details: Optional[str] = None