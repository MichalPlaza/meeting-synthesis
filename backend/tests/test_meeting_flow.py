import pytest
from httpx import AsyncClient
from datetime import datetime
from bson import ObjectId

from app.models.ai_analysis import AIAnalysis

# Oznaczamy cały plik jako testy asynchroniczne
pytestmark = pytest.mark.asyncio


async def test_upload_and_process_flow(client: AsyncClient, mocker, tmp_path):
    """
    Testuje cały proces: od uploadu pliku, przez wykonanie zadania Celery,
    aż do weryfikacji finalnego stanu w bazie danych.
    """
    # 1. ARRANGE (Przygotowanie)

    # Ustawiamy Celery w tryb "eager" na czas trwania tego testu.
    # Oznacza to, że zadania .delay() będą wykonywane natychmiast,
    # a nie wysyłane do brokera.
    mocker.patch("celery.app.task.Task.delay", new=lambda self, *args, **kwargs: self.apply(args, kwargs))

    # Mockujemy (udajemy) wolne funkcje, aby test był szybki
    mocked_transcribe = mocker.patch(
        "app.services.whisper_service.transcribe_audio",
        return_value="This is a test transcript."
    )
    mocked_analyze = mocker.patch(
        "app.services.ai_analysis_service.analyze_transcription",
        return_value=AIAnalysis(summary="Test summary.")
    )

    # Tworzymy tymczasowy, fałszywy plik audio
    fake_audio_content = b"fake audio data"
    audio_file = tmp_path / "test.mp3"
    audio_file.write_bytes(fake_audio_content)
    
    # Dane, które normalnie przyszłyby z formularza
    form_data = {
        "title": "Test Meeting",
        "meeting_datetime": datetime.utcnow().isoformat(),
        "project_id": str(ObjectId()),
        "uploader_id": str(ObjectId()),
        "tags": "test,important"
    }

    # 2. ACT (Wykonanie)
    
    # Wysyłamy żądanie POST do endpointu uploadu
    with open(audio_file, "rb") as f:
        response = await client.post(
            "/meetings/upload",
            data=form_data,
            files={"file": ("test.mp3", f, "audio/mpeg")}
        )

    # 3. ASSERT (Weryfikacja)
    
    # A. Sprawdzenie odpowiedzi z API
    assert response.status_code == 201, f"API returned error: {response.text}"
    response_data = response.json()
    assert response_data["title"] == "Test Meeting"
    # Po wykonaniu zadania synchronicznie, status powinien być "completed"
    assert response_data["processing_status"]["current_stage"] == "completed"

    # B. Sprawdzenie, czy mocki zostały wywołane
    mocked_transcribe.assert_called_once()
    mocked_analyze.assert_called_once()
    
    # C. Sprawdzenie finalnego stanu w bazie danych
    db = client._transport.app.dependency_overrides[get_database]()
    meeting_id = response_data["_id"]
    
    final_meeting_doc = await db["meetings"].find_one({"_id": ObjectId(meeting_id)})
    
    assert final_meeting_doc is not None
    assert final_meeting_doc["processing_status"]["current_stage"] == "completed"
    assert final_meeting_doc["transcription"]["full_text"] == "This is a test transcript."
    assert final_meeting_doc["ai_analysis"]["summary"] == "Test summary."

    print("\n✅ Test upload and processing flow passed successfully!")