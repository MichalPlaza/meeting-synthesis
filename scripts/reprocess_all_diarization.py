#!/usr/bin/env python3
"""Re-process all meetings with speaker diarization.

This script queues all meetings that don't have speaker labels for re-processing.
Run from the backend directory: poetry run python ../scripts/reprocess_all_diarization.py
"""

import sys
sys.path.insert(0, ".")

from app.worker.tasks import process_meeting_audio

# All meeting IDs without speaker labels
MEETING_IDS = [
    "6926ffe51a5e186d80351016",
    "6926ffe51a5e186d80351017",
    "6926ffe51a5e186d80351018",
    "6926ffe51a5e186d80351019",
    "6926ffe51a5e186d8035101a",
    "6926ffe51a5e186d8035101b",
    "6926ffe51a5e186d8035101c",
    "6926ffe51a5e186d8035101d",
    "6926ffe51a5e186d8035101e",
    "6926ffe51a5e186d8035101f",
    "6938845fd651b0a4b9e1ff88",
    "69388460d651b0a4b9e1ff89",
    "69388460d651b0a4b9e1ff8a",
    "69388460d651b0a4b9e1ff8b",
    "69388461d651b0a4b9e1ff8c",
    "69388461d651b0a4b9e1ff8d",
    "69388461d651b0a4b9e1ff8e",
    "69388461d651b0a4b9e1ff8f",
    "69388461d651b0a4b9e1ff90",
    "69388461d651b0a4b9e1ff91",
    "69388461d651b0a4b9e1ff92",
    "69388462d651b0a4b9e1ff93",
    "69388462d651b0a4b9e1ff94",
    "69388462d651b0a4b9e1ff95",
    "69388462d651b0a4b9e1ff96",
    "69388463d651b0a4b9e1ff97",
    "69388463d651b0a4b9e1ff98",
    "69388463d651b0a4b9e1ff99",
    "69388463d651b0a4b9e1ff9a",
    "69388464d651b0a4b9e1ff9b",
    "69388464d651b0a4b9e1ff9c",
    "69388464d651b0a4b9e1ff9d",
    # Skip 69388464d651b0a4b9e1ff9e - MediaSmarts 2p (already has labels)
    "69388464d651b0a4b9e1ff9f",
    "69388464d651b0a4b9e1ffa0",
    "69388465d651b0a4b9e1ffa1",
    "69388465d651b0a4b9e1ffa2",
    "69388465d651b0a4b9e1ffa3",
    "69388465d651b0a4b9e1ffa4",
    "69388466d651b0a4b9e1ffa5",
    "69388466d651b0a4b9e1ffa6",
    "69388466d651b0a4b9e1ffa7",
    "69388466d651b0a4b9e1ffa8",
    "69388466d651b0a4b9e1ffa9",
    "69388466d651b0a4b9e1ffaa",
]

def main():
    print(f"Queuing {len(MEETING_IDS)} meetings for re-processing with diarization...")
    print("Using MPS (Apple Silicon GPU) for faster processing.\n")

    for i, meeting_id in enumerate(MEETING_IDS, 1):
        result = process_meeting_audio.delay(meeting_id)
        print(f"[{i}/{len(MEETING_IDS)}] Queued meeting {meeting_id} - Task: {result.id}")

    print(f"\nAll {len(MEETING_IDS)} meetings queued!")
    print("Monitor progress with: tail -f logs/celery_worker.log | grep -E '(Meeting ID|MPS|completed|error)'")

if __name__ == "__main__":
    main()
