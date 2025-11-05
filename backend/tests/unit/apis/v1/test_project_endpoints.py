import pytest
from unittest.mock import AsyncMock, patch
from fastapi import HTTPException, status
from datetime import datetime
from bson import ObjectId

from app.apis.v1.endpoints_project import (
    create_project,
    get_project,
    update_project,
    delete_project
)
from app.schemas.project_schema import ProjectCreate, ProjectUpdate, ProjectResponse
from app.models.py_object_id import PyObjectId


@pytest.mark.asyncio
class TestProjectEndpoints:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_project_service = AsyncMock()
        self.mock_db = AsyncMock()

    async def test_create_project_success(self):
        project_data = ProjectCreate(
            name="New Project",
            description="Test project",
            owner_id=PyObjectId(),
            members_ids=[]
        )

        mock_project = ProjectResponse(
            _id=PyObjectId(),
            name=project_data.name,
            description=project_data.description,
            owner_id=project_data.owner_id,
            members_ids=project_data.members_ids,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        with patch(
            "app.apis.v1.endpoints_project.project_service.create_new_project",
            self.mock_project_service.create_new_project
        ):
            self.mock_project_service.create_new_project.return_value = mock_project

            result = await create_project(project_data, self.mock_db)

            assert result.name == "New Project"
            self.mock_project_service.create_new_project.assert_awaited_once_with(self.mock_db, project_data)

    async def test_create_project_duplicate_name(self):
        project_data = ProjectCreate(
            name="Existing Project",
            description="Conflict",
            owner_id=PyObjectId(),
            members_ids=[],
            meeting_datetime=datetime(2025, 1, 1)
        )

        with patch(
            "app.apis.v1.endpoints_project.project_service.create_new_project",
            self.mock_project_service.create_new_project
        ):
            self.mock_project_service.create_new_project.side_effect = HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Project name already exists"
            )

            with pytest.raises(HTTPException) as exc:
                await create_project(project_data, self.mock_db)

            assert exc.value.status_code == status.HTTP_409_CONFLICT

    async def test_get_project_success(self):
        mock_project = ProjectResponse(
            _id=PyObjectId(),
            name="Test Project",
            description="Desc",
            owner_id=PyObjectId(),
            members_ids=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            meeting_datetime=datetime(2025, 1, 1)
        )

        with patch(
            "app.apis.v1.endpoints_project.project_service.get_project",
            self.mock_project_service.get_project
        ):
            self.mock_project_service.get_project.return_value = mock_project

            result = await get_project(str(mock_project.id), self.mock_db)

            assert result == mock_project
            self.mock_project_service.get_project.assert_awaited_once_with(self.mock_db, str(mock_project.id))

    async def test_get_project_not_found(self):
        with patch(
            "app.apis.v1.endpoints_project.project_service.get_project",
            self.mock_project_service.get_project
        ):
            self.mock_project_service.get_project.return_value = None

            with pytest.raises(HTTPException) as exc:
                await get_project("nonexistent", self.mock_db)

            assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    async def test_update_project_success(self):
        update_data = ProjectUpdate(description="Updated description")
        mock_project = ProjectResponse(
            _id=PyObjectId(),
            name="Project",
            description="Updated description",
            owner_id=PyObjectId(),
            members_ids=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            meeting_datetime=datetime(2025, 1, 1)
        )

        with patch(
            "app.apis.v1.endpoints_project.project_service.update_existing_project",
            self.mock_project_service.update_existing_project
        ):
            self.mock_project_service.update_existing_project.return_value = mock_project

            result = await update_project(str(mock_project.id), update_data, self.mock_db)

            assert result.description == "Updated description"
            self.mock_project_service.update_existing_project.assert_awaited_once_with(
                self.mock_db, str(mock_project.id), update_data
            )

    async def test_update_project_not_found(self):
        update_data = ProjectUpdate(description="Nothing")
        with patch(
            "app.apis.v1.endpoints_project.project_service.update_existing_project",
            self.mock_project_service.update_existing_project
        ):
            self.mock_project_service.update_existing_project.return_value = None

            with pytest.raises(HTTPException) as exc:
                await update_project("nonexistent", update_data, self.mock_db)

            assert exc.value.status_code == status.HTTP_404_NOT_FOUND

    async def test_delete_project_success(self):
        with patch(
            "app.apis.v1.endpoints_project.project_service.delete_existing_project",
            self.mock_project_service.delete_existing_project
        ):
            self.mock_project_service.delete_existing_project.return_value = True

            result = await delete_project("123", self.mock_db)
            assert result is None
            self.mock_project_service.delete_existing_project.assert_awaited_once_with(self.mock_db, "123")

    async def test_delete_project_not_found(self):
        with patch(
            "app.apis.v1.endpoints_project.project_service.delete_existing_project",
            self.mock_project_service.delete_existing_project
        ):
            self.mock_project_service.delete_existing_project.return_value = False

            with pytest.raises(HTTPException) as exc:
                await delete_project("999", self.mock_db)

            assert exc.value.status_code == status.HTTP_404_NOT_FOUND
