import pytest
from unittest.mock import AsyncMock
from datetime import datetime, timezone
from bson import ObjectId

from app.crud import crud_projects
from app.models.project import Project
from app.schemas.project_schema import ProjectCreate, ProjectUpdate
from app.models.py_object_id import PyObjectId


class TestProjectCRUD:

    def setup_method(self):
        self.mock_db = AsyncMock()
        self.mock_collection = self.mock_db["projects"]
        self.project_id = str(ObjectId())

        self.project_data = ProjectCreate(
            name="Test Project",
            description="A sample project",
            owner_id=PyObjectId(),
            members_ids=[PyObjectId()],
            meeting_datetime=datetime.now(timezone.utc),
        )

        self.project_doc = Project(
            **self.project_data.model_dump(by_alias=True),
            id=PyObjectId(),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.project_dict = self.project_doc.model_dump(by_alias=True)

        self.mock_collection.find_one = AsyncMock(return_value=self.project_dict)

        insert_mock = AsyncMock()
        insert_mock.inserted_id = ObjectId()
        self.mock_collection.insert_one = AsyncMock(return_value=insert_mock)

        update_mock = AsyncMock()
        update_mock.modified_count = 1
        self.mock_collection.update_one = AsyncMock(return_value=update_mock)

        delete_mock = AsyncMock()
        delete_mock.deleted_count = 1
        self.mock_collection.delete_one = AsyncMock(return_value=delete_mock)

        self.mock_collection.find = AsyncMock()

    @pytest.mark.asyncio
    async def test_get_project_by_id_success(self):
        result = await crud_projects.get_project_by_id(self.mock_db, self.project_id)
        assert result.id is not None
        assert result.name == self.project_data.name

    @pytest.mark.asyncio
    async def test_create_project_success(self):
        result = await crud_projects.create_project(self.mock_db, self.project_data)
        assert result.name == self.project_data.name
        assert isinstance(result.id, ObjectId)

    @pytest.mark.asyncio
    async def test_update_project_success(self):
        update_data = ProjectUpdate(name="Updated Project")
        self.mock_collection.find_one.return_value = {
            **self.project_dict,
            "name": "Updated Project",
        }
        result = await crud_projects.update_project(
            self.mock_db, self.project_id, update_data
        )
        assert result.name == "Updated Project"

    @pytest.mark.asyncio
    async def test_delete_project_success(self):
        result = await crud_projects.delete_project(self.mock_db, self.project_id)
        assert result is True

    @pytest.mark.asyncio
    async def test_get_project_by_id_invalid_id(self):
        result = await crud_projects.get_project_by_id(self.mock_db, "invalid_id")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_projects_by_owner_invalid_id(self):
        result = await crud_projects.get_projects_by_owner(self.mock_db, "invalid_id")
        assert result == []

    @pytest.mark.asyncio
    async def test_get_projects_by_member_invalid_id(self):
        result = await crud_projects.get_projects_by_member(self.mock_db, "invalid_id")
        assert result == []

    @pytest.mark.asyncio
    async def test_create_project_failure(self):
        self.mock_collection.insert_one.side_effect = Exception("DB error")
        with pytest.raises(Exception):
            await crud_projects.create_project(self.mock_db, self.project_data)

    @pytest.mark.asyncio
    async def test_update_project_failure(self):
        self.mock_collection.update_one.return_value.modified_count = 0
        result = await crud_projects.update_project(
            self.mock_db, self.project_id, ProjectUpdate(name="Fail")
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_delete_project_failure(self):
        self.mock_collection.delete_one.return_value.deleted_count = 0
        result = await crud_projects.delete_project(self.mock_db, self.project_id)
        assert result is False
