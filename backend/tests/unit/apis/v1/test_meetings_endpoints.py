from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from bson import ObjectId
from fastapi import HTTPException, UploadFile

from app.apis.v1.endpoints_meetings import (
    create_meeting,
    upload_meeting_with_file,
    get_meeting,
    update_meeting,
    list_meetings,
    delete_meeting,
    download_meeting_audio,
)
from app.models.audio_file import AudioFile
from app.schemas.meeting_schema import (
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
)


@pytest.mark.asyncio
class TestMeetingsEndpoints:

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_meeting_service = AsyncMock()
        self.mock_db = AsyncMock()

    async def test_create_meeting_success(self):
        audio_file = AudioFile(
            original_filename="dummy.mp3",
            storage_path_or_url="/tmp/dummy.mp3",
            mimetype="audio/mpeg"
        )
        meeting_data = MeetingCreate(
            title="Kickoff",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=str(ObjectId()),
            uploader_id=str(ObjectId()),
            audio_file=audio_file
        )
        fake_response = MeetingResponse(
            _id=str(ObjectId()),
            title="Kickoff",
            meeting_datetime=meeting_data.meeting_datetime,
            project_id=meeting_data.project_id,
            uploader_id=meeting_data.uploader_id,
            tags=[],
            audio_file=audio_file,
            processing_config={},
            processing_status={},
            uploaded_at=datetime.now(),
            last_updated_at=datetime.now()
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.create_new_meeting", new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = fake_response
            result = await create_meeting(meeting_data, database=self.mock_db)
            assert result.title == "Kickoff"
            self.mock_meeting_service.assert_awaited_once_with(self.mock_db, meeting_data)

    async def test_create_meeting_failure(self):
        audio_file = AudioFile(
            original_filename="dummy.mp3",
            storage_path_or_url="/tmp/dummy.mp3",
            mimetype="audio/mpeg"
        )
        meeting_data = MeetingCreate(
            title="",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=str(ObjectId()),
            uploader_id=str(ObjectId()),
            audio_file=audio_file
        )
        with patch("app.apis.v1.endpoints_meetings.meeting_service.create_new_meeting", new=self.mock_meeting_service):
            self.mock_meeting_service.side_effect = HTTPException(status_code=422, detail="Invalid data")
            with pytest.raises(HTTPException) as exc:
                await create_meeting(meeting_data, database=self.mock_db)
            assert exc.value.status_code == 422

    async def test_list_meetings_with_filters(self):
        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )
        fake_meetings = [
            MeetingResponse(
                _id=str(ObjectId()),
                title="A",
                meeting_datetime=datetime(2025, 1, 1),
                project_id=str(ObjectId()),
                uploader_id=str(ObjectId()),
                tags=[],
                audio_file=audio_file,
                processing_config={},
                processing_status={},
                uploaded_at=datetime.now(),
                last_updated_at=datetime.now()
            ),
            MeetingResponse(
                _id=str(ObjectId()),
                title="B",
                meeting_datetime=datetime(2025, 1, 2),
                project_id=str(ObjectId()),
                uploader_id=str(ObjectId()),
                tags=[],
                audio_file=audio_file,
                processing_config={},
                processing_status={},
                uploaded_at=datetime.now(),
                last_updated_at=datetime.now()
            ),
        ]
        with patch("app.apis.v1.endpoints_meetings.meeting_service.get_meetings_with_filters",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = fake_meetings
            result = await list_meetings(database=self.mock_db, query="A", project_ids=[], tags=[], sort_by="newest")
            assert len(result) == 2
            self.mock_meeting_service.assert_awaited_once()

    async def test_upload_meeting_with_file_success(self):
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "audio.mp3"

        title = "Test"
        meeting_datetime = datetime(2025, 1, 1)
        project_id = str(ObjectId())
        uploader_id = str(ObjectId())
        tags = ""

        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/media/audio.mp3",
            mimetype="audio/mpeg"
        )
        fake_response = MeetingResponse(
            _id=str(ObjectId()),
            title=title,
            meeting_datetime=meeting_datetime,
            project_id=project_id,
            uploader_id=uploader_id,
            tags=[],
            audio_file=audio_file,
            processing_config={},
            processing_status={},
            uploaded_at=datetime.now(),
            last_updated_at=datetime.now()
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.handle_meeting_upload",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = fake_response
            result = await upload_meeting_with_file(
                title=title,
                meeting_datetime=meeting_datetime,
                project_id=project_id,
                uploader_id=uploader_id,
                tags=tags,
                file=mock_file,
                database=self.mock_db
            )
            assert result.title == "Test"

    async def test_upload_meeting_with_file_invalid_file(self):
        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "invalid.txt"

        title = "Test"
        meeting_datetime = datetime(2025, 1, 1)
        project_id = str(ObjectId())
        uploader_id = str(ObjectId())
        tags = ""

        with patch("app.apis.v1.endpoints_meetings.meeting_service.handle_meeting_upload",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.side_effect = HTTPException(status_code=415, detail="Invalid file")
            with pytest.raises(HTTPException) as exc:
                await upload_meeting_with_file(
                    title=title,
                    meeting_datetime=meeting_datetime,
                    project_id=project_id,
                    uploader_id=uploader_id,
                    tags=tags,
                    file=mock_file,
                    database=self.mock_db
                )
            assert exc.value.status_code == 415

    async def test_get_meeting_success(self):
        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )
        fake_meeting = MeetingResponse(
            _id=str(ObjectId()),
            title="Test",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=str(ObjectId()),
            uploader_id=str(ObjectId()),
            tags=[],
            audio_file=audio_file,
            processing_config={},
            processing_status={},
            uploaded_at=datetime.now(),
            last_updated_at=datetime.now()
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.get_meeting", new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = fake_meeting
            result = await get_meeting(str(ObjectId()), database=self.mock_db)
            assert result.title == "Test"

    async def test_get_meeting_not_found(self):
        with patch("app.apis.v1.endpoints_meetings.meeting_service.get_meeting", new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = None
            with pytest.raises(HTTPException) as exc:
                await get_meeting(str(ObjectId()), database=self.mock_db)
            assert exc.value.status_code == 404

    async def test_update_meeting_success(self):
        update_data = MeetingUpdate(title="Updated")
        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )
        fake_meeting = MeetingResponse(
            _id=str(ObjectId()),
            title="Updated",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=str(ObjectId()),
            uploader_id=str(ObjectId()),
            tags=[],
            audio_file=audio_file,
            processing_config={},
            processing_status={},
            uploaded_at=datetime.now(),
            last_updated_at=datetime.now()
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.update_existing_meeting",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = fake_meeting
            result = await update_meeting(str(ObjectId()), update_data, database=self.mock_db)
            assert result.title == "Updated"

    async def test_update_meeting_not_found(self):
        with patch("app.apis.v1.endpoints_meetings.meeting_service.update_existing_meeting",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = None
            with pytest.raises(HTTPException) as exc:
                await update_meeting(str(ObjectId()), MeetingUpdate(title="X"), database=self.mock_db)
            assert exc.value.status_code == 404

    async def test_delete_meeting_success(self):
        with patch("app.apis.v1.endpoints_meetings.meeting_service.delete_existing_meeting",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = True
            result = await delete_meeting(str(ObjectId()), database=self.mock_db)
            assert result is None

    async def test_delete_meeting_not_found(self):
        with patch("app.apis.v1.endpoints_meetings.meeting_service.delete_existing_meeting",
                   new=self.mock_meeting_service):
            self.mock_meeting_service.return_value = False
            with pytest.raises(HTTPException) as exc:
                await delete_meeting(str(ObjectId()), database=self.mock_db)
            assert exc.value.status_code == 404

    async def test_download_meeting_audio_success(self, tmp_path):
        file_path = tmp_path / "audio.mp3"
        file_path.write_text("dummy content")
        fake_meeting = MagicMock()
        fake_meeting.audio_file.storage_path_or_url = str(file_path)
        fake_meeting.audio_file.original_filename = "audio.mp3"
        fake_meeting.meeting_datetime = datetime(2025, 1, 1)
        fake_meeting.title = "Test Meeting"

        with patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id", return_value=fake_meeting), \
                patch("os.path.exists", return_value=True), \
                patch("app.apis.v1.endpoints_meetings.FileResponse") as mock_file_response:
            await download_meeting_audio(str(ObjectId()), database=self.mock_db)
            mock_file_response.assert_called_once()

    async def test_download_meeting_audio_not_found(self):
        with patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id", return_value=None):
            with pytest.raises(HTTPException) as exc:
                await download_meeting_audio(str(ObjectId()), database=self.mock_db)
            assert exc.value.status_code == 404
