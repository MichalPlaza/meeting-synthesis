import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timezone
from bson import ObjectId
from app.models.enums.proccessing_mode import ProcessingMode

from app.crud import crud_meetings
from app.models.meeting import Meeting
from app.schemas.meeting_schema import MeetingCreate, MeetingUpdate
from app.models.py_object_id import PyObjectId
from app.models.audio_file import AudioFile
from app.models.processing_config import ProcessingConfig


class TestMeetingCRUD:

    def setup_method(self):
        self.mock_db = AsyncMock()
        self.mock_collection = self.mock_db["meetings"]
        self.meeting_id = str(ObjectId())
        self.audio_file = AudioFile(
            original_filename="test.mp3",
            storage_path_or_url="/tmp/test.mp3",
            mimetype="audio/mpeg"
        )

        self.processing_config = ProcessingConfig(
            language="en",
            processing_mode_selected=ProcessingMode.LOCAL
        )

        self.meeting_data = MeetingCreate(
            title="Test Meeting",
            project_id=PyObjectId(),
            meeting_datetime=datetime.now(timezone.utc),
            duration_seconds=3600,
            tags=["tag1", "tag2"],
            uploader_id=PyObjectId(),
            audio_file=self.audio_file,
            processing_config=self.processing_config
        )

        self.meeting_doc = Meeting(
            **self.meeting_data.model_dump(by_alias=True, exclude={"processing_config"}),
            processing_config=self.meeting_data.processing_config or ProcessingConfig(),
            id=PyObjectId(),
            uploaded_at=datetime.now(timezone.utc),
            last_updated_at=datetime.now(timezone.utc)
        )

        self.mock_collection.find_one = AsyncMock(return_value=self.meeting_doc.model_dump(by_alias=True))
        self.mock_collection.find.return_value.__aiter__.return_value = [
            self.meeting_doc.model_dump(by_alias=True)
        ]
        insert_mock = AsyncMock()
        insert_mock.inserted_id = ObjectId()
        self.mock_collection.insert_one = AsyncMock(return_value=insert_mock)
        update_mock = AsyncMock()
        update_mock.modified_count = 1
        self.mock_collection.update_one = AsyncMock(return_value=update_mock)
        delete_mock = AsyncMock()
        delete_mock.deleted_count = 1
        self.mock_collection.delete_one = AsyncMock(return_value=delete_mock)

    @pytest.mark.asyncio
    async def test_get_meeting_by_id_success(self):
        result = await crud_meetings.get_meeting_by_id(self.mock_db, self.meeting_id)
        assert result.title == self.meeting_data.title
        assert result.audio_file.original_filename == self.audio_file.original_filename

    @pytest.mark.asyncio
    async def test_get_all_meetings_success(self):
        result = await crud_meetings.get_all_meetings(self.mock_db)
        assert len(result) == 1
        assert result[0].title == self.meeting_data.title

    @pytest.mark.asyncio
    async def test_create_meeting_success(self):
        result = await crud_meetings.create_meeting(self.mock_db, self.meeting_data)
        assert result.title == self.meeting_data.title
        assert result.audio_file.original_filename == self.audio_file.original_filename

    @pytest.mark.asyncio
    async def test_update_meeting_success(self):
        update_data = MeetingUpdate(title="Updated Meeting")
        self.mock_collection.find_one.return_value = {**self.meeting_doc.model_dump(by_alias=True),
                                                      "title": "Updated Meeting"}
        result = await crud_meetings.update_meeting(self.mock_db, self.meeting_id, update_data)
        assert result.title == "Updated Meeting"

    @pytest.mark.asyncio
    async def test_delete_meeting_success(self):
        result = await crud_meetings.delete_meeting(self.mock_db, self.meeting_id)
        assert result is True

    @pytest.mark.asyncio
    async def test_get_meeting_by_id_not_found(self):
        result = await crud_meetings.get_meeting_by_id(self.mock_db, "invalidid")
        assert result is None

        self.mock_collection.find_one.return_value = None
        result = await crud_meetings.get_meeting_by_id(self.mock_db, str(ObjectId()))
        assert result is None

    @pytest.mark.asyncio
    async def test_create_meeting_failure(self):
        self.mock_collection.insert_one.side_effect = Exception("DB error")
        with pytest.raises(Exception) as exc:
            await crud_meetings.create_meeting(self.mock_db, self.meeting_data)
        assert str(exc.value) == "DB error"

    @pytest.mark.asyncio
    async def test_update_meeting_failure(self):
        update_data = MeetingUpdate(title="Fail")
        result = await crud_meetings.update_meeting(self.mock_db, "invalidid", update_data)
        assert result is None

        self.mock_collection.update_one.return_value.modified_count = 0
        self.mock_collection.find_one.return_value = None
        result = await crud_meetings.update_meeting(self.mock_db, self.meeting_id, update_data)
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_meeting_failure(self):
        result = await crud_meetings.delete_meeting(self.mock_db, "invalidid")
        assert result is False

        self.mock_collection.delete_one.return_value.deleted_count = 0
        result = await crud_meetings.delete_meeting(self.mock_db, self.meeting_id)
        assert result is False
