from datetime import UTC, datetime

from bson import ObjectId
from pydantic import BaseModel, Field, ConfigDict

from .ai_analysis import AIAnalysis
from .audio_file import AudioFile
from .processing_config import ProcessingConfig
from .processing_status import ProcessingStatus
from .py_object_id import PyObjectId
from .transcrpion import Transcription


class Meeting(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        from_attributes=True
    )

    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    audio_file: AudioFile
    processing_config: ProcessingConfig
    processing_status: ProcessingStatus = Field(default_factory=ProcessingStatus)
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    last_updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC)
    )
    
    duration_seconds: int | None = None
    tags: list[str] = []