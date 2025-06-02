from dataclasses import Field
from typing import List, Optional

from bson import ObjectId
from pydantic import BaseModel, field_validator

from backend.app.models.py_object_id import PyObjectId


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