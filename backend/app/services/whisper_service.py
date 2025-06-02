import httpx
import os

from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions"

headers = {
    "Authorization": f"Bearer {OPENAI_API_KEY}",
}


# api
async def transcribe_audio(file_path: str, model: str = "whisper-1") -> str:
    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as audio_file:
            files = {
                "file": (file_path, audio_file, "audio/mpeg"),
                "model": (None, model),
            }
            response = await client.post(OPENAI_WHISPER_URL, headers=headers, files=files)
            response.raise_for_status()
            data = response.json()
            return data.get("text", "")
