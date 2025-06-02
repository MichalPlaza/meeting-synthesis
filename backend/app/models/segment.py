from typing import Optional

from pydantic import BaseModel


class Segment(BaseModel):
    start_time: float
    end_time: float
    text: str
    speaker_label: Optional[str] = None
