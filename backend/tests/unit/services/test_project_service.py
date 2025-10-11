import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from bson import ObjectId

from app.services import project_service
from app.schemas.project_schema import ProjectCreate, ProjectUpdate
from app.models.project import Project


@pytest.mark.asyncio
class TestProjectService:

    async def test_create_new_project_calls_crud(self):
        db_mock = AsyncMock()
        data = ProjectCreate(
            name="Test Project",
            description="Desc",
            owner_id=ObjectId(),
            members_ids=[],
            meeting_datetime="2025-01-01T12:00:00"
        )
        with patch("app.services.project_service.crud_projects.create_project", new=AsyncMock()) as mock_create:
            await project_service.create_new_project(db_mock, data)
            mock_create.assert_awaited_once_with(db_mock, data)

    async def test_get_project_calls_crud(self):
        db_mock = AsyncMock()
        project_id = str(ObjectId())
        with patch("app.services.project_service.crud_projects.get_project_by_id",
                   new=AsyncMock(return_value=MagicMock())) as mock_get:
            result = await project_service.get_project(db_mock, project_id)
            mock_get.assert_awaited_once_with(db_mock, project_id)
            assert result is not None

    async def test_get_projects_filtered_calls_crud(self):
        db_mock = AsyncMock()
        with patch("app.services.project_service.crud_projects.get_projects_filtered",
                   new=AsyncMock(return_value=[])) as mock_filter:
            result = await project_service.get_projects_filtered(db_mock, "query", "name")
            mock_filter.assert_awaited_once_with(db_mock, q="query", sort_by="name")
            assert result == []

    async def test_update_existing_project_calls_crud(self):
        db_mock = AsyncMock()
        project_id = str(ObjectId())
        data = ProjectUpdate(name="Updated")
        with patch("app.services.project_service.crud_projects.update_project",
                   new=AsyncMock(return_value=MagicMock())) as mock_update:
            result = await project_service.update_existing_project(db_mock, project_id, data)
            mock_update.assert_awaited_once_with(db_mock, project_id, data)
            assert result is not None

    async def test_delete_existing_project_calls_crud(self):
        db_mock = AsyncMock()
        project_id = str(ObjectId())
        with patch("app.services.project_service.crud_projects.delete_project",
                   new=AsyncMock(return_value=True)) as mock_delete:
            result = await project_service.delete_existing_project(db_mock, project_id)
            mock_delete.assert_awaited_once_with(db_mock, project_id)
            assert result is True

    async def test_get_projects_owned_by_user_calls_crud(self):
        db_mock = AsyncMock()
        owner_id = str(ObjectId())
        with patch("app.services.project_service.crud_projects.get_projects_by_owner",
                   new=AsyncMock(return_value=[])) as mock_owner:
            result = await project_service.get_projects_owned_by_user(db_mock, owner_id)
            mock_owner.assert_awaited_once_with(db_mock, owner_id)
            assert result == []

    async def test_get_projects_by_member_calls_crud(self):
        db_mock = AsyncMock()
        member_id = str(ObjectId())
        with patch("app.services.project_service.crud_projects.get_projects_by_member",
                   new=AsyncMock(return_value=[])) as mock_member:
            result = await project_service.get_projects_with_member(db_mock, member_id)
            mock_member.assert_awaited_once_with(db_mock, member_id)
            assert result == []
