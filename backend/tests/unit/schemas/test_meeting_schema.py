from datetime import datetime, UTC

import pytest
from bson import ObjectId
from pydantic import ValidationError

from app.models.audio_file import AudioFile
from app.models.processing_config import ProcessingConfig
from app.models.processing_status import ProcessingStatus
from app.models.py_object_id import PyObjectId
from app.schemas.meeting_schema import (
    MeetingCreate,
    MeetingUpdate,
    MeetingResponse,
    MeetingCreateForm,
)


class TestMeetingSchema:

    @pytest.fixture
    def audio_file(self):
        return AudioFile(
            original_filename="audio.mp3",
            storage_path_or_url="/tmp/audio.mp3",
            mimetype="audio/mpeg"
        )

    @pytest.fixture
    def processing_config(self):
        from app.models.enums.processing_mode import ProcessingMode
        return ProcessingConfig(
            language="en",
            processing_mode_selected=ProcessingMode.LOCAL
        )

    @pytest.fixture
    def valid_ids(self):
        return str(ObjectId()), str(ObjectId())

    def test_meeting_create_happy(self, audio_file, processing_config, valid_ids):
        project_id, uploader_id = valid_ids
        meeting = MeetingCreate(
            title="Team Sync",
            meeting_datetime=datetime.now(UTC),
            project_id=PyObjectId(project_id),
            uploader_id=PyObjectId(uploader_id),
            audio_file=audio_file,
            processing_config=processing_config,
            duration_seconds=3600,
            tags=["tag1", "tag2"]
        )

        assert meeting.title == "Team Sync"
        assert meeting.audio_file == audio_file
        assert meeting.duration_seconds == 3600
        assert meeting.tags == ["tag1", "tag2"]
        assert isinstance(meeting.project_id, PyObjectId)
        assert isinstance(meeting.uploader_id, PyObjectId)

    def test_meeting_response_happy(self, audio_file, processing_config, valid_ids):
        project_id, uploader_id = valid_ids
        meeting_resp = MeetingResponse(
            _id=PyObjectId(),
            title="Sprint Planning",
            meeting_datetime=datetime.now(UTC),
            project_id=PyObjectId(project_id),
            uploader_id=PyObjectId(uploader_id),
            audio_file=audio_file,
            processing_config=processing_config,
            processing_status=ProcessingStatus(),
            uploaded_at=datetime.now(UTC),
            last_updated_at=datetime.now(UTC),
            tags=["planning"]
        )

        assert meeting_resp.tags == ["planning"]
        assert meeting_resp.audio_file == audio_file
        assert hasattr(meeting_resp, "id")
        assert str(meeting_resp.id) != ""

    def test_meeting_update_partial(self, audio_file, processing_config):
        update = MeetingUpdate(
            title="Updated Title",
            audio_file=audio_file,
            duration_seconds=1800
        )
        assert update.title == "Updated Title"
        assert update.audio_file == audio_file
        assert update.duration_seconds == 1800
        assert update.meeting_datetime is None  # optional field

    def test_meeting_create_form_to_meeting_create(self, audio_file, valid_ids):
        project_id, uploader_id = valid_ids
        form = MeetingCreateForm(
            title="Demo Meeting",
            meeting_datetime=datetime.now(UTC),
            project_id=project_id,
            uploader_id=uploader_id,
            tags="tag1, tag2,tag3",
            processing_mode_selected="local",
            language="en"
        )

        meeting_create = form.to_meeting_create(audio_file=audio_file, duration=2000)

        assert meeting_create.title == "Demo Meeting"
        assert meeting_create.audio_file == audio_file
        assert meeting_create.duration_seconds == 2000
        assert meeting_create.tags == ["tag1", "tag2", "tag3"]

    def test_meeting_create_invalid_duration(self, audio_file, processing_config, valid_ids):
        project_id, uploader_id = valid_ids
        with pytest.raises(ValidationError):
            MeetingCreate(
                title="Invalid",
                meeting_datetime=datetime.now(UTC),
                project_id=PyObjectId(project_id),
                uploader_id=PyObjectId(uploader_id),
                audio_file=audio_file,
                processing_config=processing_config,
                duration_seconds="not-an-int",
                tags=[]
            )

    def test_meeting_create_form_invalid_project_id(self, audio_file):
        with pytest.raises(Exception):
            MeetingCreateForm(
                title="Demo",
                meeting_datetime=datetime.now(UTC),
                project_id="invalid-id",
                uploader_id=str(PyObjectId()),
                tags="tag1, tag2"
            )

    def test_meeting_update_invalid_tags(self):
        with pytest.raises(ValidationError):
            MeetingUpdate(tags="not-a-list")

    def test_meeting_response_missing_required(self, audio_file, processing_config, valid_ids):
        project_id, uploader_id = valid_ids
        with pytest.raises(ValidationError):
            MeetingResponse(
                title="Missing _id",
                meeting_datetime=datetime.now(UTC),
                project_id=PyObjectId(project_id),
                uploader_id=PyObjectId(uploader_id),
                audio_file=audio_file,
                processing_config=processing_config,
                processing_status=ProcessingStatus(),
                uploaded_at=datetime.now(UTC),
                last_updated_at=datetime.now(UTC),
            )
