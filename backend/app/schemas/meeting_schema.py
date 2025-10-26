from datetime import datetime

from fastapi import Form
from pydantic import BaseModel, Field
from typing import Optional, List

from ..models.action_items import ActionItem
from ..models.ai_analysis import AIAnalysis
from ..models.audio_file import AudioFile
from ..models.decision_made import DecisionMade
from ..models.key_topic import KeyTopic
from ..models.mentioned_date import MentionedDate
from ..models.processing_config import ProcessingConfig
from ..models.processing_status import ProcessingStatus
from ..models.py_object_id import PyObjectId
from ..models.transcrpion import Transcription
from ..models.enums.proccessing_mode import ProcessingMode


class MeetingBase(BaseModel):
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId


class MeetingCreate(MeetingBase):
    audio_file: AudioFile
    processing_config: ProcessingConfig | None = None
    duration_seconds: int | None = None
    tags: list[str] = []


class MeetingUpdate(BaseModel):
    title: str | None = None
    meeting_datetime: datetime | None = None
    audio_file: AudioFile | None = None
    processing_config: ProcessingConfig | None = None
    processing_status: ProcessingStatus | None = None
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    duration_seconds: int | None = None
    tags: list[str] | None = None


class MeetingResponse(MeetingBase):
    id: PyObjectId = Field(..., alias="_id")
    audio_file: AudioFile
    processing_config: ProcessingConfig
    processing_status: ProcessingStatus
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    uploaded_at: datetime
    last_updated_at: datetime
    duration_seconds: int | None = None
    tags: list[str] = []
    estimated_processing_time_seconds: int | None = None

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
            tags: str = Form(""),

            processing_mode_selected: str = Form("local"),  # or remote
            language: str = Form("pl"),  # or en
    ):
        self.title = title
        self.meeting_datetime = meeting_datetime
        self.project_id = PyObjectId(project_id)
        self.uploader_id = PyObjectId(uploader_id)
        self.tags = [tag.strip() for tag in tags.split(",") if tag.strip()]

        self.processing_mode_selected = ProcessingMode(processing_mode_selected)
        self.language = language

    def to_meeting_create(
            self,
            audio_file: AudioFile,
            duration: int | None,
    ):
        return MeetingCreate(
            title=self.title,
            meeting_datetime=self.meeting_datetime,
            project_id=self.project_id,
            uploader_id=self.uploader_id,
            audio_file=audio_file,
            processing_config=ProcessingConfig(
                language=self.language,
                processing_mode_selected=self.processing_mode_selected
            ),
            duration_seconds=duration,
            tags=self.tags
        )


class TranscriptionUpdate(BaseModel):
    full_text: Optional[str] = None


class AiAnalysisUpdate(BaseModel):
    summary: Optional[str] = None
    key_topics: Optional[List[KeyTopic]] = None
    action_items: Optional[List[ActionItem]] = None
    decisions_made: Optional[List[DecisionMade]] = None
    mentioned_dates: Optional[List[MentionedDate]] = None


class MeetingPartialUpdate(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    transcription: Optional[TranscriptionUpdate] = None
    ai_analysis: Optional[AiAnalysisUpdate] = None
