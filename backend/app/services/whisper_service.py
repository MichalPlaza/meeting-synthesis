import logging
from faster_whisper import WhisperModel
import os

logger = logging.getLogger(__name__)

logger.info("Loading Whisper model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
logger.info("Whisper model loaded.")


import asyncio
import logging
from faster_whisper import WhisperModel
import os

logger = logging.getLogger(__name__)

logger.info("Loading Whisper model...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")
logger.info("Whisper model loaded.")


def _transcribe_and_join(file_path: str) -> str:
    """
    Synchronous function to transcribe audio and join the segments.
    This is a blocking function and should be run in a thread.
    """
    segments, info = model.transcribe(file_path, beam_size=5)
    logger.info(f"Processing audio with duration {info.duration_after_vad:.3f}s")
    transcription_text = "".join([segment.text for segment in segments])
    return transcription_text


async def transcribe_audio(file_path: str) -> str:
    logger.info(f"Starting audio transcription for file: {file_path}")
    if not os.path.exists(file_path):
        logger.error(f"File not found for transcription: {file_path}")
        raise FileNotFoundError(f"Plik nie istnieje: {file_path}")

    try:
        transcription_text = await asyncio.to_thread(_transcribe_and_join, file_path)
        logger.info(f"Audio transcription completed for file: {file_path}")
        return transcription_text
    except Exception as e:
        logger.error(f"Transcription failed for file {file_path}: {e}", exc_info=True)
        raise RuntimeError(f"Transkrypcja nie powiodła się: {e}")