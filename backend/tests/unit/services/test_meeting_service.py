import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, UTC
from bson import ObjectId

from app.services import meeting_service
from app.schemas.meeting_schema import MeetingCreateForm, MeetingResponse


@pytest.mark.asyncio
class TestMeetingService:

    async def test_estimate_processing_time_none(self):
        assert meeting_service.estimate_processing_time(None) is None

    async def test_estimate_processing_time_value(self):
        duration = 60
        expected = int(10 + duration * 0.5 + 20)
        assert meeting_service.estimate_processing_time(duration) == expected

    async def test_get_audio_duration_mp3(self, tmp_path):
        file_path = tmp_path / "test.mp3"
        file_path.write_bytes(b"ID3")  # minimal content to avoid errors
        duration = meeting_service.get_audio_duration(str(file_path), "audio/mp3")
        # minimal content won't give real duration
        assert duration is None or isinstance(duration, int)

    async def test_get_audio_duration_invalid_type(self):
        duration = meeting_service.get_audio_duration("somefile.txt", "text/plain")
        assert duration is None

    async def test_create_new_meeting_calls_crud(self):
        db_mock = AsyncMock()
        data_mock = MagicMock()
        with patch("app.services.meeting_service.crud_meetings.create_meeting", new=AsyncMock()) as mock_create:
            await meeting_service.create_new_meeting(db_mock, data_mock)
            mock_create.assert_awaited_once_with(db_mock, data_mock)

    async def test_get_meeting_returns_none_if_not_found(self):
        db_mock = AsyncMock()
        with patch("app.services.meeting_service.crud_meetings.get_meeting_by_id", new=AsyncMock(return_value=None)):
            result = await meeting_service.get_meeting(db_mock, ObjectId())
            assert result is None

    async def test_get_meeting_returns_response_with_estimated_time(self):
        db_mock = AsyncMock()
        mock_meeting = MagicMock()
        mock_meeting.duration_seconds = 60
        mock_meeting.model_dump.return_value = {
            "_id": ObjectId(),
            "title": "Test",
            "meeting_datetime": datetime.now(UTC),
            "project_id": ObjectId(),
            "uploader_id": ObjectId(),
            "audio_file": {"original_filename": "file.mp3", "storage_path_or_url": "/media/file.mp3",
                           "mimetype": "audio/mp3"},
            "processing_config": {"language": "en", "processing_mode_selected": "local"},
            "processing_status": {},
            "uploaded_at": datetime.now(UTC),
            "last_updated_at": datetime.now(UTC)
        }

        with patch("app.services.meeting_service.crud_meetings.get_meeting_by_id",
                   new=AsyncMock(return_value=mock_meeting)):
            result = await meeting_service.get_meeting(db_mock, ObjectId())
            assert isinstance(result, MeetingResponse)
            assert result.estimated_processing_time_seconds == meeting_service.estimate_processing_time(60)

    async def test_handle_meeting_upload_creates_meeting(self, tmp_path):
        db_mock = AsyncMock()
        file_content = b"audio content"
        audio_file = MagicMock()
        audio_file.filename = "test.mp3"
        audio_file.content_type = "audio/mp3"
        audio_file.file = io.BytesIO(file_content)

        project_id = ObjectId()
        uploader_id = ObjectId()
        form_data = MeetingCreateForm(
            title="Meeting",
            meeting_datetime=datetime(2025, 1, 1, 12, 0, 0),
            project_id=project_id,
            uploader_id=uploader_id,
            tags="tag1,tag2",
            processing_mode_selected="local",
            language="en"
        )

        mock_meeting = MagicMock()
        mock_meeting.id = ObjectId()
        mock_meeting.model_dump.return_value = {
            "_id": mock_meeting.id,
            "title": "Meeting",
            "meeting_datetime": datetime(2025, 1, 1, 12, 0, 0),
            "project_id": project_id,
            "uploader_id": uploader_id,
            "audio_file": {"original_filename": "test.mp3", "storage_path_or_url": "/media/test.mp3",
                           "mimetype": "audio/mp3"},
            "processing_config": {"language": "en", "processing_mode_selected": "local"},
            "processing_status": {},
            "uploaded_at": datetime.now(UTC),
            "last_updated_at": datetime.now(UTC),
            "duration_seconds": 0
        }

        with patch("app.services.meeting_service.crud_meetings.create_meeting",
                   new=AsyncMock(return_value=mock_meeting)), \
                patch("app.services.meeting_service.process_meeting_audio.delay") as mock_task:
            result = await meeting_service.handle_meeting_upload(db_mock, form_data, audio_file)

            assert isinstance(result, MeetingResponse)
            mock_task.assert_called_once_with(str(mock_meeting.id))
            assert result.title == "Meeting"
