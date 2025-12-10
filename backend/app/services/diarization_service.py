"""Speaker diarization service using pyannote.audio.

This service adds speaker labels to transcription segments.
Requires DIARIZATION_ENABLED=true and HUGGINGFACE_TOKEN to be set.
"""

import logging
import asyncio
from typing import Optional

from ..core.config import DIARIZATION_ENABLED, HUGGINGFACE_TOKEN
from ..models.segment import Segment

logger = logging.getLogger(__name__)

# Lazy load diarization pipeline to avoid import errors when disabled
_diarization_pipeline = None


def _get_diarization_pipeline():
    """Lazily initialize the diarization pipeline."""
    global _diarization_pipeline

    if _diarization_pipeline is not None:
        return _diarization_pipeline

    if not DIARIZATION_ENABLED:
        logger.info("Diarization is disabled. Set DIARIZATION_ENABLED=true to enable.")
        return None

    if not HUGGINGFACE_TOKEN:
        logger.warning("HUGGINGFACE_TOKEN not set. Diarization requires a Hugging Face token.")
        return None

    try:
        # Fix for PyTorch 2.6+ pickle security
        # Pyannote models from HuggingFace are trusted, so we allow weights_only=False
        import torch
        _original_torch_load = torch.load

        def _patched_torch_load(*args, **kwargs):
            # Force weights_only=False for pyannote model loading
            kwargs["weights_only"] = False
            return _original_torch_load(*args, **kwargs)

        torch.load = _patched_torch_load

        from pyannote.audio import Pipeline

        logger.info("Loading pyannote diarization pipeline...")
        _diarization_pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=HUGGINGFACE_TOKEN
        )

        # Use MPS (Apple Silicon GPU) if available, otherwise CPU
        if torch.backends.mps.is_available():
            logger.info("Using MPS (Apple Silicon GPU) for diarization")
            _diarization_pipeline.to(torch.device("mps"))
        else:
            logger.info("MPS not available, using CPU for diarization")

        logger.info("Diarization pipeline loaded successfully.")
        return _diarization_pipeline
    except ImportError:
        logger.warning("pyannote.audio not installed. Install with: pip install pyannote.audio")
        return None
    except Exception as e:
        logger.error(f"Failed to load diarization pipeline: {e}", exc_info=True)
        return None


def _run_diarization(file_path: str) -> dict:
    """
    Run speaker diarization on audio file.
    Returns a dict mapping time ranges to speaker labels.
    """
    pipeline = _get_diarization_pipeline()
    if pipeline is None:
        return {}

    try:
        logger.info(f"Running diarization on: {file_path}")
        diarization = pipeline(file_path)

        # Build a list of (start, end, speaker) tuples
        speaker_segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            speaker_segments.append({
                "start": turn.start,
                "end": turn.end,
                "speaker": speaker
            })

        logger.info(f"Diarization found {len(set(s['speaker'] for s in speaker_segments))} speakers")
        return {"segments": speaker_segments}

    except Exception as e:
        logger.error(f"Diarization failed: {e}", exc_info=True)
        return {}


def _assign_speakers_to_segments(
    transcription_segments: list[Segment],
    diarization_result: dict
) -> list[Segment]:
    """
    Assign speaker labels to transcription segments based on diarization results.
    Uses overlap-based matching.
    """
    if not diarization_result or "segments" not in diarization_result:
        return transcription_segments

    diarization_segments = diarization_result["segments"]
    if not diarization_segments:
        return transcription_segments

    updated_segments = []
    for seg in transcription_segments:
        # Find the diarization segment with the most overlap
        best_speaker = None
        best_overlap = 0

        for dseg in diarization_segments:
            # Calculate overlap
            overlap_start = max(seg.start_time, dseg["start"])
            overlap_end = min(seg.end_time, dseg["end"])
            overlap = max(0, overlap_end - overlap_start)

            if overlap > best_overlap:
                best_overlap = overlap
                best_speaker = dseg["speaker"]

        updated_segments.append(Segment(
            start_time=seg.start_time,
            end_time=seg.end_time,
            text=seg.text,
            speaker_label=best_speaker
        ))

    return updated_segments


async def add_speaker_labels(
    file_path: str,
    segments: list[Segment]
) -> list[Segment]:
    """
    Add speaker labels to transcription segments using diarization.

    Args:
        file_path: Path to the audio file.
        segments: List of transcription segments without speaker labels.

    Returns:
        List of segments with speaker labels (or original segments if diarization disabled/failed).
    """
    if not DIARIZATION_ENABLED:
        logger.debug("Diarization disabled, returning segments without speaker labels.")
        return segments

    try:
        diarization_result = await asyncio.to_thread(_run_diarization, file_path)
        if diarization_result:
            return _assign_speakers_to_segments(segments, diarization_result)
        return segments
    except Exception as e:
        logger.error(f"Failed to add speaker labels: {e}", exc_info=True)
        return segments


def is_diarization_available() -> bool:
    """Check if diarization is enabled and available."""
    return DIARIZATION_ENABLED and bool(HUGGINGFACE_TOKEN)
