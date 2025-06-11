from datetime import datetime

from fastapi import Form
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

class MeetingCreateForm:
    def __init__(
        self,
        title: str = Form(...),
        meeting_datetime: datetime = Form(...),
        project_id: str = Form(...),
        uploader_id: str = Form(...),
    ):
        self.title = title
        self.meeting_datetime = meeting_datetime
        self.project_id = PyObjectId(project_id)
        self.uploader_id = PyObjectId(uploader_id)

    def to_meeting_create(self, audio_file: AudioFile, config: ProcessingConfig | None = None):

        return MeetingCreate(
            title=self.title,
            meeting_datetime=self.meeting_datetime,
            project_id=self.project_id,
            uploader_id=self.uploader_id,
            audio_file=audio_file,
            processing_config=config or ProcessingConfig(),
        )