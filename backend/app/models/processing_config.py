from pydantic import BaseModel

from .enums.proccessing_mode import ProcessingMode


class ProcessingConfig(BaseModel):
    language: str = "pl"
    processing_mode_selected: ProcessingMode = ProcessingMode.LOCAL
