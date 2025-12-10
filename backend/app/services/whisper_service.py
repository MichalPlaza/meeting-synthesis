import logging
import asyncio
import os
from dataclasses import dataclass
from faster_whisper import WhisperModel

from ..models.segment import Segment

logger = logging.getLogger(__name__)

# Load model once at module import
logger.info("Loading Whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")
logger.info("Whisper model loaded.")


@dataclass
class TranscriptionResult:
    """Result of transcription with full text and segments."""
    full_text: str
    segments: list[Segment]


def _transcribe_with_segments(file_path: str) -> TranscriptionResult:
    """
    Synchronous function to transcribe audio and return segments with timestamps.
    Run this in a thread using asyncio.to_thread.
    """
    raw_segments, info = model.transcribe(file_path, beam_size=5)
    logger.info(f"Processing audio with duration: {getattr(info, 'duration_after_vad', None)}s")

    segments = []
    text_parts = []

    try:
        for seg in raw_segments:
            segments.append(Segment(
                start_time=seg.start,
                end_time=seg.end,
                text=seg.text,
                speaker_label=None  # Will be filled by diarization if enabled
            ))
            text_parts.append(seg.text)
    except Exception as e:
        logger.error(f"Failed while processing transcription segments: {e}", exc_info=True)
        raise

    full_text = "".join(text_parts)
    if not full_text.strip():
        logger.warning("Transcription output is empty.")

    return TranscriptionResult(full_text=full_text, segments=segments)


def _transcribe_and_join(file_path: str) -> str:
    """
    Synchronous function to transcribe audio and join the segments.
    Run this in a thread using asyncio.to_thread.
    Legacy function for backward compatibility.
    """
    result = _transcribe_with_segments(file_path)
    return result.full_text


async def transcribe_audio(file_path: str) -> str:
    """Transcribe audio and return full text only (legacy)."""
    logger.info(f"Starting audio transcription for file: {file_path}")

    if not os.path.exists(file_path):
        logger.error(f"File not found for transcription: {file_path}")
        raise FileNotFoundError(f"Plik nie istnieje: {file_path}")

    try:
        transcription_text = await asyncio.to_thread(_transcribe_and_join, file_path)
        logger.info(f"Audio transcription completed for file: {file_path}")
        return transcription_text

    except Exception as e:
        logger.error(f"Transcription failed for file: {file_path}: {e}", exc_info=True)
        raise RuntimeError(f"Transkrypcja nie powiodła się: {e}")


async def transcribe_audio_with_segments(file_path: str) -> TranscriptionResult:
    """Transcribe audio and return full text with segment timestamps."""
    logger.info(f"Starting audio transcription with segments for file: {file_path}")

    if not os.path.exists(file_path):
        logger.error(f"File not found for transcription: {file_path}")
        raise FileNotFoundError(f"Plik nie istnieje: {file_path}")

    try:
        result = await asyncio.to_thread(_transcribe_with_segments, file_path)
        logger.info(f"Audio transcription completed with {len(result.segments)} segments for file: {file_path}")
        return result

    except Exception as e:
        logger.error(f"Transcription failed for file: {file_path}: {e}", exc_info=True)
        raise RuntimeError(f"Transkrypcja nie powiodła się: {e}")
