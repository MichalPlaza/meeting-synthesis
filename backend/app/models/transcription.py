
from pydantic import BaseModel

from .segment import Segment


class Transcription(BaseModel):
    full_text: str | None = None
    #segments: list[Segment] | None = []
