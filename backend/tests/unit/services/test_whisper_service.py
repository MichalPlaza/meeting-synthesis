import pytest
import os
from unittest.mock import patch, MagicMock

from app.services import whisper_service


@pytest.mark.asyncio
class TestWhisperService:

    async def test_transcribe_audio_file_not_found(self):
        fake_path = "non_existent_file.mp3"
        with pytest.raises(FileNotFoundError) as exc_info:
            await whisper_service.transcribe_audio(fake_path)
        assert "Plik nie istnieje" in str(exc_info.value)

    async def test_transcribe_audio_success(self):
        fake_path = "test_file.mp3"
        with open(fake_path, "w") as f:
            f.write("dummy content")

        fake_text = "Transkrypcja testowa"
        
        # Mock segments as iterable with text attribute
        mock_segment = MagicMock()
        mock_segment.text = fake_text
        mock_segments = [mock_segment]
        
        # Mock info object
        mock_info = MagicMock()
        mock_info.duration_after_vad = 120.0

        with patch("app.services.whisper_service.model") as mock_model:
            # Return tuple (segments, info) as faster-whisper does
            mock_model.transcribe.return_value = (mock_segments, mock_info)

            result = await whisper_service.transcribe_audio(fake_path)
            assert result == fake_text

        os.remove(fake_path)

    async def test_transcribe_audio_model_raises_exception(self):
        fake_path = "test_file.mp3"
        with open(fake_path, "w") as f:
            f.write("dummy content")

        with patch("app.services.whisper_service.model") as mock_model:
            mock_model.transcribe.side_effect = Exception("Błąd modelu")

            with pytest.raises(RuntimeError) as exc_info:
                await whisper_service.transcribe_audio(fake_path)

            assert "Transkrypcja nie powiodła się" in str(exc_info.value)

        os.remove(fake_path)
