
from pydantic import BaseModel

from .segment import Segment

class TranscriptionSegment(BaseModel):
    start: float
    end: float
    speaker: str
    text: str

class Transcription(BaseModel):
    full_text: str | None = None
    segments: List[TranscriptionSegment] = []