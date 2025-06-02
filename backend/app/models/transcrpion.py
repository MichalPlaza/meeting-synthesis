from typing import Optional, List

from pydantic import BaseModel

from segment import Segment


class Transcription(BaseModel):
    full_text: Optional[str] = None
    segments: Optional[List[Segment]] = []