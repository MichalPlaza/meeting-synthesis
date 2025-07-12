import whisper
import os

# --- POCZĄTEK ZMIANY ---
# Zmieniamy model "base" na "tiny". Jest znacznie szybszy i zużywa
# o wiele mniej pamięci RAM, co zapobiegnie awariom w kontenerze Docker.
model = whisper.load_model("tiny")
# --- KONIEC ZMIANY ---


async def transcribe_audio(file_path: str) -> str:
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Plik nie istnieje: {file_path}")

    try:
        # Logika transkrypcji pozostaje bez zmian
        result = model.transcribe(file_path)
        return result.get("text", "").strip()
    except Exception as e:
        raise RuntimeError(f"Transkrypcja nie powiodła się: {e}")