from datetime import datetime

from pydantic import BaseModel

from .enums.processing_stage import ProcessingStage


class ProcessingStatus(BaseModel):
    current_stage: ProcessingStage = ProcessingStage.UPLOADED
    completed_at: datetime | None = None
    error_message: str | None = None
