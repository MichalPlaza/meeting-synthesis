from datetime import UTC, datetime

from bson import ObjectId
from pydantic import BaseModel, Field

from .ai_analysis import AIAnalysis
from .audio_file import AudioFile
from .processing_config import ProcessingConfig
from .processing_status import ProcessingStatus
from .py_object_id import PyObjectId
from .transcrpion import Transcription


class Meeting(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    audio_file: AudioFile
    processing_config: ProcessingConfig = Field(default_factory=ProcessingConfig)
    processing_status: ProcessingStatus = Field(default_factory=ProcessingStatus)
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True
        from_attributes = True
