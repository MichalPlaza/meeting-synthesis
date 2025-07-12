from enum import Enum


class ProcessingStage(str, Enum):
    UPLOADED = "uploaded"
    QUEUED = "queued" # Dodajemy status "w kolejce"
    TRANSCRIBING = "transcribing" # Nowy, szczegółowy status
    ANALYZING = "analyzing" # Nowy, szczegółowy status
    PROCESSING = "processing" # Pozostawiamy dla ogólnej kompatybilności
    COMPLETED = "completed"
    FAILED = "failed"