from datetime import datetime

from fastapi import Form
from pydantic import BaseModel, Field, ConfigDict
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
from ..models.transcription import Transcription
from ..models.enums.processing_mode import ProcessingMode


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
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_encoders={PyObjectId: str},
        arbitrary_types_allowed=True
    )

    id: PyObjectId = Field(..., alias="_id")
    audio_file: AudioFile
    processing_config: ProcessingConfig
    processing_status: ProcessingStatus
    transcription: Transcription | None = None
    ai_analysis: AIAnalysis | None = None
    uploaded_at: datetime | None = None
    last_updated_at: datetime
    duration_seconds: int | None = None
    tags: list[str] = []
    speaker_mappings: dict[str, str] = {}
    estimated_processing_time_seconds: int | None = None


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


class SegmentUpdate(BaseModel):
    """Schema for updating individual transcript segments."""
    start_time: float
    end_time: float
    text: str
    speaker_label: Optional[str] = None


class TranscriptionUpdate(BaseModel):
    full_text: Optional[str] = None
    segments: Optional[List["SegmentUpdate"]] = None


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
    speaker_mappings: Optional[dict[str, str]] = None  # Maps SPEAKER_00 -> "John Doe"

class MergeSpeakersRequest(BaseModel):
    """Request to merge two speakers into one."""
    source_speaker: str  # Speaker to merge FROM (will be removed)
    target_speaker: str  # Speaker to merge INTO (will remain)


class PopulatedInfo(BaseModel):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    name: Optional[str] = None      
    username: Optional[str] = None  
    full_name: Optional[str] = None 

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        arbitrary_types_allowed = True


class MeetingResponsePopulated(MeetingResponse): 
    project: PopulatedInfo
    uploader: PopulatedInfo

    class Config:
        from_attributes = True
        populate_by_name = True
        json_encoders = {PyObjectId: str}
        arbitrary_types_allowed = True