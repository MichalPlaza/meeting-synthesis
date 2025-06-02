from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from ..models.py_object_id import PyObjectId
from ..models.audio_file import AudioFile
from ..models.processing_config import ProcessingConfig
from ..models.processing_status import ProcessingStatus
from ..models.transcrpion import Transcription
from ..models.ai_analysis import AIAnalysis


class MeetingBase(BaseModel):
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId


class MeetingCreate(MeetingBase):
    audio_file: AudioFile
    processing_config: Optional[ProcessingConfig] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    meeting_datetime: Optional[datetime] = None
    audio_file: Optional[AudioFile] = None
    processing_config: Optional[ProcessingConfig] = None
    processing_status: Optional[ProcessingStatus] = None
    transcription: Optional[Transcription] = None
    ai_analysis: Optional[AIAnalysis] = None


class MeetingResponse(MeetingBase):
    id: PyObjectId
    audio_file: AudioFile
    processing_config: ProcessingConfig
    processing_status: ProcessingStatus
    transcription: Optional[Transcription] = None
    ai_analysis: Optional[AIAnalysis] = None
    uploaded_at: datetime
    last_updated_at: datetime

    class Config:
        json_encoders = {PyObjectId: str}
        from_attributes = True
