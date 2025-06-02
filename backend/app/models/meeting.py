from dataclasses import Field
from datetime import datetime

from bson import ObjectId
from pydantic import BaseModel


class Meeting(BaseModel): # Odpowiada MeetingInDB
    id: ObjectId = Field(default_factory=ObjectId, alias="_id")
    title: str
    meeting_datetime: datetime
    project_id: PyObjectId
    uploader_id: PyObjectId
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    audio_file: AudioFile
    processing_config: ProcessingConfig = Field(default_factory=ProcessingConfig)
    processing_status: ProcessingStatus = Field(default_factory=ProcessingStatus)
    transcription: Optional[Transcription] = None
    ai_analysis: Optional[AIAnalysis] = None
    last_updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True

class GlobalConfig(BaseModel):
    id: str = Field(alias="_id", default="global_config")
    available_languages: List[str] = ["pl", "en"]
    default_llm_model_name: str = "gpt-3.5-turbo"
    max_audio_file_size_mb: int = 100
    maintenance_mode_active: bool = False
    maintenance_message: Optional[str] = None

    @field_validator('id') # Pydantic v2 field_validator
    @classmethod
    def id_must_be_global_config(cls, v):
        if v != "global_config":
            raise ValueError('id must be "global_config"')
        return v

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, PyObjectId: str}
        arbitrary_types_allowed = True