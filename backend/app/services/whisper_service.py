import whisper
import os

model = whisper.load_model("base")  # Możesz też użyć: "tiny", "small", "medium", "large"


async def transcribe_audio(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Plik nie istnieje: {file_path}")

    try:
        result = model.transcribe(file_path)
        return result.get("text", "").strip()
    except Exception as e:
        raise RuntimeError(f"Transkrypcja nie powiodła się: {e}")
