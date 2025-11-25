from pydantic import BaseModel

from .enums.processing_mode import ProcessingMode


class ProcessingConfig(BaseModel):
    language: str
    processing_mode_selected: ProcessingMode
