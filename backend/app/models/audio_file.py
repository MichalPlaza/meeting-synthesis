from pydantic import BaseModel


class AudioFile(BaseModel):
    original_filename: str
    storage_path_or_url: str
    mimetype: str