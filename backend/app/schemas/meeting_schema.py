from datetime import datetime

from pydantic import BaseModel, Field

from ..models.ai_analysis import AIAnalysis
from ..models.audio_file import AudioFile
from ..models.processing_config import ProcessingConfig
from ..models.processing_status import ProcessingStatus
from ..models.py_object_id import PyObjectId
from ..models.transcrpion import Transcription


class MeetingBase(BaseModel):
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId


class MeetingCreate(MeetingBase):
    audio_file: AudioFile
    processing_config: ProcessingConfig | None = (
        None  # można pominąć — zostanie ustawione domyślnie w modelu
    )


class MeetingUpdate(BaseModel):
    title: str | None = None
    meeting_datetime: datetime | None = None
    audio_file: AudioFile | None = None
    processing_config: ProcessingConfig | None = None
    processing_status: ProcessingStatus | None = None
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None


class MeetingResponse(MeetingBase):
    id: PyObjectId = Field(..., alias="_id")
    audio_file: AudioFile
    processing_config: ProcessingConfig
    processing_status: ProcessingStatus
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    uploaded_at: datetime
    last_updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        arbitrary_types_allowed = True
