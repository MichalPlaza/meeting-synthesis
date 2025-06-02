from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from .enums.processing_stage import ProcessingStage


class ProcessingStatus(BaseModel):
    current_stage: ProcessingStage = ProcessingStage.UPLOADED
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None