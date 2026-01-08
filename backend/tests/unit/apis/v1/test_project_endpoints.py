"""Unit tests for project endpoints with access control."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException, status
from datetime import datetime
from bson import ObjectId

from app.apis.v1.endpoints_project import (
    create_project,
    get_project,
    list_projects,
    read_projects,
    update_project,
    delete_project,
    projects_by_owner,
    projects_by_member,
)
from app.schemas.project_schema import ProjectCreate, ProjectUpdate, ProjectResponse
from app.models.py_object_id import PyObjectId


def create_mock_user(role: str = "developer", user_id: str = None) -> MagicMock:
    """Create a mock user."""
    user = MagicMock()
    user.id = ObjectId(user_id) if user_id else ObjectId()
    user.role = role
    user.username = f"test_{role}"
    return user


def create_mock_project(project_id: str = None, owner_id: str = None, members_ids: list = None) -> MagicMock:
    """Create a mock project."""
    project = MagicMock()
    project.id = ObjectId(project_id) if project_id else ObjectId()
    project.owner_id = ObjectId(owner_id) if owner_id else ObjectId()
    project.members_ids = members_ids or []
    project.name = "Test Project"
    project.description = "Test description"
    project.created_at = datetime.now()
    project.updated_at = datetime.now()
    return project


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


@pytest.mark.asyncio
class TestListProjects:
    """Tests for list_projects endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.project_service.get_projects_filtered")
    async def test_admin_sees_all_projects(self, mock_get_filtered):
        """Admin users should see all projects."""
        admin = create_mock_user(role="admin")

        proj1 = create_mock_project()
        proj2 = create_mock_project()
        mock_get_filtered.return_value = [proj1, proj2]

        result = await list_projects(
            query=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=admin,
        )

        assert len(result) == 2
        mock_get_filtered.assert_awaited_once_with(self.mock_db, q=None, sort_by="newest")

    @patch("app.apis.v1.endpoints_project.crud_projects.get_projects_by_member")
    async def test_regular_user_sees_only_member_projects(self, mock_get_by_member):
        """Regular users should only see projects they are members of."""
        user = create_mock_user(role="developer")

        proj = create_mock_project()
        mock_get_by_member.return_value = [proj]

        result = await list_projects(
            query=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 1
        mock_get_by_member.assert_awaited_once_with(self.mock_db, str(user.id))

    @patch("app.apis.v1.endpoints_project.crud_projects.get_projects_by_member")
    async def test_user_with_no_projects_empty(self, mock_get_by_member):
        """Users with no projects should get empty list."""
        user = create_mock_user(role="developer")
        mock_get_by_member.return_value = []

        result = await list_projects(
            query=None,
            sort_by="newest",
            database=self.mock_db,
            current_user=user,
        )

        assert result == []


@pytest.mark.asyncio
class TestGetProject:
    """Tests for get_project endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.user_can_access_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_member_can_access_project(self, mock_get_project, mock_access):
        """Members should be able to access their projects."""
        user = create_mock_user()
        project = create_mock_project()
        project_id = str(project.id)

        mock_get_project.return_value = project
        mock_access.return_value = True

        result = await get_project(
            project_id=project_id,
            database=self.mock_db,
            current_user=user,
        )

        assert result == project
        mock_access.assert_awaited_once()

    @patch("app.apis.v1.endpoints_project.user_can_access_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_non_member_forbidden(self, mock_get_project, mock_access):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        project = create_mock_project()
        project_id = str(project.id)

        mock_get_project.return_value = project
        mock_access.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await get_project(
                project_id=project_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "access" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_project_not_found(self, mock_get_project):
        """Should return 404 if project doesn't exist."""
        user = create_mock_user()
        project_id = str(ObjectId())

        mock_get_project.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await get_project(
                project_id=project_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestProjectsByOwner:
    """Tests for projects_by_owner endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.project_service.get_projects_owned_by_user")
    async def test_owner_can_view_own_projects(self, mock_get_owned):
        """Owners can view their own projects."""
        user_id = str(ObjectId())
        user = create_mock_user(user_id=user_id)
        proj = create_mock_project()
        mock_get_owned.return_value = [proj]

        result = await projects_by_owner(
            owner_id=user_id,
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 1
        mock_get_owned.assert_awaited_once_with(self.mock_db, user_id)

    async def test_non_owner_forbidden(self):
        """Non-owners should get 403 forbidden."""
        user = create_mock_user()
        other_owner_id = str(ObjectId())

        with pytest.raises(HTTPException) as exc_info:
            await projects_by_owner(
                owner_id=other_owner_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "your own" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_project.project_service.get_projects_owned_by_user")
    async def test_admin_can_view_any_owner(self, mock_get_owned):
        """Admins can view any owner's projects."""
        admin = create_mock_user(role="admin")
        other_owner_id = str(ObjectId())
        proj = create_mock_project()
        mock_get_owned.return_value = [proj]

        result = await projects_by_owner(
            owner_id=other_owner_id,
            database=self.mock_db,
            current_user=admin,
        )

        assert len(result) == 1
        mock_get_owned.assert_awaited_once_with(self.mock_db, other_owner_id)


@pytest.mark.asyncio
class TestProjectsByMember:
    """Tests for projects_by_member endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.project_service.get_projects_with_member")
    async def test_member_can_view_own_projects(self, mock_get_member):
        """Members can view their own projects."""
        user_id = str(ObjectId())
        user = create_mock_user(user_id=user_id)
        proj = create_mock_project()
        mock_get_member.return_value = [proj]

        result = await projects_by_member(
            member_id=user_id,
            database=self.mock_db,
            current_user=user,
        )

        assert len(result) == 1
        mock_get_member.assert_awaited_once_with(self.mock_db, user_id)

    async def test_non_member_forbidden(self):
        """Non-members should get 403 forbidden."""
        user = create_mock_user()
        other_member_id = str(ObjectId())

        with pytest.raises(HTTPException) as exc_info:
            await projects_by_member(
                member_id=other_member_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "your own" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_project.project_service.get_projects_with_member")
    async def test_admin_can_view_any_member(self, mock_get_member):
        """Admins can view any member's projects."""
        admin = create_mock_user(role="admin")
        other_member_id = str(ObjectId())
        proj = create_mock_project()
        mock_get_member.return_value = [proj]

        result = await projects_by_member(
            member_id=other_member_id,
            database=self.mock_db,
            current_user=admin,
        )

        assert len(result) == 1
        mock_get_member.assert_awaited_once_with(self.mock_db, other_member_id)


@pytest.mark.asyncio
class TestUpdateProject:
    """Tests for update_project endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.project_service.update_existing_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_owner_can_update(self, mock_get_project, mock_update):
        """Owners can update their projects."""
        user_id = str(ObjectId())
        user = create_mock_user(user_id=user_id)
        project = create_mock_project(owner_id=user_id)
        project_id = str(project.id)

        mock_get_project.return_value = project
        updated_project = create_mock_project(owner_id=user_id)
        updated_project.description = "Updated description"
        mock_update.return_value = updated_project

        update_data = ProjectUpdate(description="Updated description")
        result = await update_project(
            project_id=project_id,
            project_in=update_data,
            database=self.mock_db,
            current_user=user,
        )

        assert result.description == "Updated description"
        mock_update.assert_awaited_once()

    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_non_owner_forbidden(self, mock_get_project):
        """Non-owners should get 403 forbidden."""
        user = create_mock_user()
        other_owner_id = str(ObjectId())
        project = create_mock_project(owner_id=other_owner_id)
        project_id = str(project.id)

        mock_get_project.return_value = project

        update_data = ProjectUpdate(description="Hacked")

        with pytest.raises(HTTPException) as exc_info:
            await update_project(
                project_id=project_id,
                project_in=update_data,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "owner" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_project.project_service.update_existing_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_admin_can_update_any(self, mock_get_project, mock_update):
        """Admins can update any project."""
        admin = create_mock_user(role="admin")
        other_owner_id = str(ObjectId())
        project = create_mock_project(owner_id=other_owner_id)
        project_id = str(project.id)

        mock_get_project.return_value = project
        mock_update.return_value = project

        update_data = ProjectUpdate(description="Admin update")
        await update_project(
            project_id=project_id,
            project_in=update_data,
            database=self.mock_db,
            current_user=admin,
        )

        mock_update.assert_awaited_once()

    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_update_not_found(self, mock_get_project):
        """Should return 404 if project doesn't exist."""
        user = create_mock_user()
        project_id = str(ObjectId())

        mock_get_project.return_value = None

        update_data = ProjectUpdate(description="Nothing")

        with pytest.raises(HTTPException) as exc_info:
            await update_project(
                project_id=project_id,
                project_in=update_data,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
class TestDeleteProject:
    """Tests for delete_project endpoint with access control."""

    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_db = AsyncMock()

    @patch("app.apis.v1.endpoints_project.project_service.delete_existing_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_owner_can_delete(self, mock_get_project, mock_delete):
        """Owners can delete their projects."""
        user_id = str(ObjectId())
        user = create_mock_user(user_id=user_id)
        project = create_mock_project(owner_id=user_id)
        project_id = str(project.id)

        mock_get_project.return_value = project
        mock_delete.return_value = True

        await delete_project(
            project_id=project_id,
            database=self.mock_db,
            current_user=user,
        )

        mock_delete.assert_awaited_once_with(self.mock_db, project_id)

    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_non_owner_forbidden(self, mock_get_project):
        """Non-owners should get 403 forbidden."""
        user = create_mock_user()
        other_owner_id = str(ObjectId())
        project = create_mock_project(owner_id=other_owner_id)
        project_id = str(project.id)

        mock_get_project.return_value = project

        with pytest.raises(HTTPException) as exc_info:
            await delete_project(
                project_id=project_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 403
        assert "owner" in exc_info.value.detail.lower()

    @patch("app.apis.v1.endpoints_project.project_service.delete_existing_project")
    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_admin_can_delete_any(self, mock_get_project, mock_delete):
        """Admins can delete any project."""
        admin = create_mock_user(role="admin")
        other_owner_id = str(ObjectId())
        project = create_mock_project(owner_id=other_owner_id)
        project_id = str(project.id)

        mock_get_project.return_value = project
        mock_delete.return_value = True

        await delete_project(
            project_id=project_id,
            database=self.mock_db,
            current_user=admin,
        )

        mock_delete.assert_awaited_once_with(self.mock_db, project_id)

    @patch("app.apis.v1.endpoints_project.project_service.get_project")
    async def test_delete_not_found(self, mock_get_project):
        """Should return 404 if project doesn't exist."""
        user = create_mock_user()
        project_id = str(ObjectId())

        mock_get_project.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            await delete_project(
                project_id=project_id,
                database=self.mock_db,
                current_user=user,
            )

        assert exc_info.value.status_code == 404
