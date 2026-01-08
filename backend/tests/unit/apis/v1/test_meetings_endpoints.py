"""Unit tests for meeting endpoints with access control."""

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
    meetings_by_project,
    partial_update_meeting,
    merge_speakers,
)
from app.models.audio_file import AudioFile
from app.schemas.meeting_schema import (
    MeetingCreate,
    MeetingResponse,
    MeetingUpdate,
    MeetingPartialUpdate,
    MergeSpeakersRequest,
)


def create_mock_user(role: str = "developer", user_id: str = None) -> MagicMock:
    """Create a mock user."""
    user = MagicMock()
    user.id = ObjectId(user_id) if user_id else ObjectId()
    user.role = role
    user.username = f"test_{role}"
    return user


def create_mock_meeting(project_id: str = None, meeting_id: str = None) -> MagicMock:
    """Create a mock meeting."""
    meeting = MagicMock()
    meeting.id = ObjectId(meeting_id) if meeting_id else ObjectId()
    meeting.project_id = ObjectId(project_id) if project_id else ObjectId()
    meeting.title = "Test Meeting"
    meeting.meeting_datetime = datetime(2025, 1, 1)
    meeting.uploader_id = ObjectId()
    meeting.tags = []
    meeting.audio_file = MagicMock()
    meeting.audio_file.storage_path_or_url = "/tmp/audio.mp3"
    meeting.audio_file.original_filename = "audio.mp3"
    meeting.processing_config = {"language": "en", "processing_mode_selected": "local"}
    meeting.processing_status = {}
    meeting.uploaded_at = datetime.now()
    meeting.last_updated_at = datetime.now()
    return meeting


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
            processing_config={"language": "en", "processing_mode_selected": "local"},
            processing_status={},
            uploaded_at=datetime.now(),
            last_updated_at=datetime.now()
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.create_new_meeting", new=self.mock_meeting_service), \
             patch("app.apis.v1.endpoints_meetings.user_can_access_project", new_callable=AsyncMock) as mock_access:
            mock_access.return_value = True
            self.mock_meeting_service.return_value = fake_response
            user = create_mock_user()
            result = await create_meeting(meeting_data, database=self.mock_db, current_user=user)
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
        with patch("app.apis.v1.endpoints_meetings.meeting_service.create_new_meeting", new=self.mock_meeting_service), \
             patch("app.apis.v1.endpoints_meetings.user_can_access_project", new_callable=AsyncMock) as mock_access:
            mock_access.return_value = True
            self.mock_meeting_service.side_effect = HTTPException(status_code=422, detail="Invalid data")
            user = create_mock_user()
            with pytest.raises(HTTPException) as exc:
                await create_meeting(meeting_data, database=self.mock_db, current_user=user)
            assert exc.value.status_code == 422


@pytest.mark.asyncio
class TestCreateMeetingAccessControl:
    """Tests for create_meeting endpoint access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_member_can_create_meeting(self, mock_access):
        """Members should be able to create meetings in their projects."""
        user = create_mock_user()
        project_id = str(ObjectId())
        mock_access.return_value = True

        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )
        meeting_data = MeetingCreate(
            title="Test",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=project_id,
            uploader_id=str(user.id),
            audio_file=audio_file
        )

        with patch("app.apis.v1.endpoints_meetings.meeting_service.create_new_meeting", new_callable=AsyncMock) as mock_create:
            mock_response = MagicMock()
            mock_response.title = "Test"
            mock_response.id = ObjectId()
            mock_create.return_value = mock_response

            result = await create_meeting(meeting_data, database=self.mock_db, current_user=user)

            assert result.title == "Test"
            mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_non_member_forbidden(self, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        mock_access.return_value = False

        audio_file = AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )
        meeting_data = MeetingCreate(
            title="Test",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=str(ObjectId()),
            uploader_id=str(user.id),
            audio_file=audio_file
        )

        with pytest.raises(HTTPException) as exc_info:
            await create_meeting(meeting_data, database=self.mock_db, current_user=user)

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()


@pytest.mark.asyncio
class TestListMeetings:
    """Tests for list_meetings endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meetings_with_filters")
    @patch("app.apis.v1.endpoints_meetings.get_user_accessible_project_ids")
    async def test_filters_by_accessible_projects(self, mock_get_accessible, mock_get_meetings):
        """Should filter meetings by user's accessible projects."""
        user = create_mock_user()
        proj_id = str(ObjectId())
        mock_get_accessible.return_value = [proj_id]

        meeting = create_mock_meeting(project_id=proj_id)
        mock_get_meetings.return_value = [meeting]

        result = await list_meetings(
            query=None,
            project_ids=None,
            tags=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 1
        mock_get_meetings.assert_awaited_once()
        # Verify it was called with user's accessible project_ids
        call_args = mock_get_meetings.call_args
        assert call_args.kwargs["project_ids"] == [proj_id]

    @patch("app.apis.v1.endpoints_meetings.get_user_accessible_project_ids")
    async def test_user_with_no_projects_empty(self, mock_get_accessible):
        """Users with no projects should get empty list."""
        user = create_mock_user()
        mock_get_accessible.return_value = []

        result = await list_meetings(
            query=None,
            project_ids=None,
            tags=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        assert result == []

    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meetings_with_filters")
    @patch("app.apis.v1.endpoints_meetings.get_user_accessible_project_ids")
    async def test_project_filter_intersects_accessible(self, mock_get_accessible, mock_get_meetings):
        """Project filter should intersect with accessible projects."""
        user = create_mock_user()
        proj1 = str(ObjectId())
        proj2 = str(ObjectId())
        mock_get_accessible.return_value = [proj1, proj2]
        mock_get_meetings.return_value = []

        # User filters by proj1 only
        await list_meetings(
            query=None,
            project_ids=[proj1],
            tags=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        call_args = mock_get_meetings.call_args
        assert call_args.kwargs["project_ids"] == [proj1]

    @patch("app.apis.v1.endpoints_meetings.get_user_accessible_project_ids")
    async def test_inaccessible_project_filter_empty(self, mock_get_accessible):
        """Filtering by inaccessible projects should return empty."""
        user = create_mock_user()
        accessible_proj = str(ObjectId())
        inaccessible_proj = str(ObjectId())
        mock_get_accessible.return_value = [accessible_proj]

        result = await list_meetings(
            query=None,
            project_ids=[inaccessible_proj],
            tags=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        assert result == []


@pytest.mark.asyncio
class TestGetMeeting:
    """Tests for get_meeting endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meeting")
    async def test_member_can_access(self, mock_get_meeting, mock_access):
        """Members should be able to access meetings."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get_meeting.return_value = meeting
        mock_access.return_value = True

        result = await get_meeting(
            meeting_id=meeting_id,
            database=self.mock_db,
            current_user=user,
        )

        assert result == meeting
        mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meeting")
    async def test_non_member_forbidden(self, mock_get_meeting, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get_meeting.return_value = meeting
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await get_meeting(
                meeting_id=meeting_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meeting")
    async def test_meeting_not_found(self, mock_get_meeting):
        """Should return 404 if meeting doesn't exist."""
        user = create_mock_user()
        meeting_id = str(ObjectId())

        mock_get_meeting.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await get_meeting(
                meeting_id=meeting_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestMeetingsByProject:
    """Tests for meetings_by_project endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.get_meetings_for_project")
    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_member_can_access(self, mock_access, mock_get_meetings):
        """Members should be able to access project meetings."""
        user = create_mock_user()
        project_id = str(ObjectId())
        mock_access.return_value = True
        mock_get_meetings.return_value = [create_mock_meeting()]

        result = await meetings_by_project(
            project_id=project_id,
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 1
        mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_non_member_forbidden(self, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        project_id = str(ObjectId())
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await meetings_by_project(
                project_id=project_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()


@pytest.mark.asyncio
class TestUpdateMeeting:
    """Tests for update_meeting endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.update_existing_meeting")
    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_member_can_update(self, mock_get, mock_access, mock_update):
        """Members should be able to update meetings."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get.return_value = meeting
        mock_access.return_value = True
        mock_update.return_value = meeting

        update_data = MeetingUpdate(title="Updated")
        result = await update_meeting(
            meeting_id=meeting_id,
            update_data=update_data,
            database=self.mock_db,
            current_user=user,
        )

        assert result is not None
        mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_non_member_forbidden(self, mock_get, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get.return_value = meeting
        mock_access.return_value = False

        update_data = MeetingUpdate(title="Updated")
        with pytest.raises(HTTPException) as exc_info:
            await update_meeting(
                meeting_id=meeting_id,
                update_data=update_data,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
class TestDeleteMeeting:
    """Tests for delete_meeting endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.delete_existing_meeting")
    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_member_can_delete(self, mock_get, mock_access, mock_delete):
        """Members should be able to delete meetings."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get.return_value = meeting
        mock_access.return_value = True
        mock_delete.return_value = True

        await delete_meeting(
            meeting_id=meeting_id,
            database=self.mock_db,
            current_user=user,
        )

        mock_delete.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_non_member_forbidden(self, mock_get, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get.return_value = meeting
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await delete_meeting(
                meeting_id=meeting_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
class TestUploadMeetingAccessControl:
    """Tests for upload_meeting_with_file endpoint access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.meeting_service.handle_meeting_upload")
    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_member_can_upload(self, mock_access, mock_upload):
        """Members should be able to upload meetings to their projects."""
        user = create_mock_user()
        project_id = str(ObjectId())
        mock_access.return_value = True
        mock_upload.return_value = create_mock_meeting()

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "audio.mp3"

        result = await upload_meeting_with_file(
            title="Test",
            meeting_datetime=datetime(2025, 1, 1),
            project_id=project_id,
            uploader_id=str(user.id),
            tags="",
            file=mock_file,
            processing_mode_selected="local",
            language="en",
            database=self.mock_db,
            current_user=user,
        )

        assert result is not None
        mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_project")
    async def test_non_member_forbidden(self, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        project_id = str(ObjectId())
        mock_access.return_value = False

        mock_file = MagicMock(spec=UploadFile)
        mock_file.filename = "audio.mp3"

        with pytest.raises(HTTPException) as exc_info:
            await upload_meeting_with_file(
                title="Test",
                meeting_datetime=datetime(2025, 1, 1),
                project_id=project_id,
                uploader_id=str(user.id),
                tags="",
                file=mock_file,
                processing_mode_selected="local",
                language="en",
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()


@pytest.mark.asyncio
class TestDownloadMeetingAudio:
    """Tests for download_meeting_audio endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    async def test_download_meeting_audio_success(self, tmp_path):
        file_path = tmp_path / "audio.mp3"
        file_path.write_text("dummy content")
        fake_meeting = MagicMock()
        fake_meeting.audio_file.storage_path_or_url = str(file_path)
        fake_meeting.audio_file.original_filename = "audio.mp3"
        fake_meeting.meeting_datetime = datetime(2025, 1, 1)
        fake_meeting.title = "Test Meeting"
        fake_meeting.project_id = ObjectId()

        mock_user = create_mock_user()

        with patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id", new_callable=AsyncMock) as mock_get, \
                patch("app.apis.v1.endpoints_meetings.user_can_access_meeting", new_callable=AsyncMock) as mock_access, \
                patch("app.apis.v1.endpoints_meetings.safe_file_path") as mock_safe_path, \
                patch("app.apis.v1.endpoints_meetings.sanitize_filename", return_value="Test_Meeting"), \
                patch("app.apis.v1.endpoints_meetings.FileResponse") as mock_file_response:
            mock_get.return_value = fake_meeting
            mock_access.return_value = True
            mock_safe_path.return_value = file_path
            await download_meeting_audio(str(ObjectId()), database=self.mock_db, current_user=mock_user)
            mock_file_response.assert_called_once()

    async def test_download_meeting_audio_not_found(self):
        mock_user = create_mock_user()

        with patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            with pytest.raises(HTTPException) as exc:
                await download_meeting_audio(str(ObjectId()), database=self.mock_db, current_user=mock_user)
            assert exc.value.status_code == 404

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_download_non_member_forbidden(self, mock_get, mock_access):
        """Non-members should get 403 forbidden."""
        mock_user = create_mock_user()
        meeting = create_mock_meeting()

        mock_get.return_value = meeting
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await download_meeting_audio(
                str(meeting.id),
                database=self.mock_db,
                current_user=mock_user
            )

        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
class TestMergeSpeakersAccessControl:
    """Tests for merge_speakers endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_meetings.user_can_access_meeting")
    @patch("app.apis.v1.endpoints_meetings.crud_meetings.get_meeting_by_id")
    async def test_non_member_forbidden(self, mock_get, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        meeting = create_mock_meeting()
        meeting_id = str(meeting.id)

        mock_get.return_value = meeting
        mock_access.return_value = False

        merge_request = MergeSpeakersRequest(
            source_speaker="SPEAKER_00",
            target_speaker="SPEAKER_01"
        )

        with pytest.raises(HTTPException) as exc_info:
            await merge_speakers(
                meeting_id=meeting_id,
                merge_request=merge_request,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
