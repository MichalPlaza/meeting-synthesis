
from pydantic import BaseModel


class KeyTopic(BaseModel):
    topic: str
    details: str | None = None
