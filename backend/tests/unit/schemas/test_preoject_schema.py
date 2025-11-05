import pytest
from datetime import datetime, UTC
from pydantic import ValidationError
from bson import ObjectId

from app.schemas import project_schema
from app.models.py_object_id import PyObjectId


class TestProjectModels:

    @pytest.fixture
    def valid_ids(self):
        return str(ObjectId()), str(ObjectId())

    @pytest.fixture
    def members_ids(self):
        return [str(ObjectId()) for _ in range(3)]

    def test_project_create_happy(self, valid_ids, members_ids):
        owner_id, _ = valid_ids
        project = project_schema.ProjectCreate(
            name="Awesome Project",
            description="Test description",
            owner_id=PyObjectId(owner_id),
            members_ids=[PyObjectId(mid) for mid in members_ids],
            meeting_datetime=datetime.now(UTC)
        )
        assert project.name == "Awesome Project"
        assert len(project.members_ids) == 3

    def test_project_create_optional_description(self, valid_ids):
        owner_id, _ = valid_ids
        project = project_schema.ProjectCreate(
            name="No Desc Project",
            owner_id=PyObjectId(owner_id),
            members_ids=[],
            meeting_datetime=datetime.now(UTC)
        )
        assert project.description is None
        assert project.name == "No Desc Project"

    def test_project_create_invalid_owner_id(self):
        with pytest.raises(ValidationError):
            project_schema.ProjectCreate(
                name="Bad Project",
                owner_id="not-a-valid-id",
                members_ids=[],
                meeting_datetime=datetime.now(UTC)
            )

    def test_project_update_partial(self, valid_ids):
        project_update = project_schema.ProjectUpdate(
            name="Updated Name"
        )
        assert project_update.name == "Updated Name"
        assert project_update.description is None
        assert project_update.members_ids is None

    def test_project_response_happy(self, valid_ids, members_ids):
        owner_id, _ = valid_ids
        project_resp = project_schema.ProjectResponse(
            _id=PyObjectId(),
            name="Full Project",
            description="Complete description",
            owner_id=PyObjectId(owner_id),
            members_ids=[PyObjectId(mid) for mid in members_ids],
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            meeting_datetime=datetime.now(UTC)
        )
        assert project_resp.name == "Full Project"
        assert len(project_resp.members_ids) == 3

    def test_project_response_missing_required(self):
        with pytest.raises(ValidationError):
            project_schema.ProjectResponse(
                name="Missing ID",
                description="Desc",
                owner_id=PyObjectId(),
                members_ids=[],
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
                meeting_datetime=datetime.now(UTC)
            )

    def test_project_update_invalid_members_ids(self):
        with pytest.raises(ValidationError):
            project_schema.ProjectUpdate(
                members_ids=["not-an-objectid"]
            )
