"""Unit tests for permission helper functions."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId

from app.core.permissions import (
    get_user_accessible_project_ids,
    user_can_access_project,
    user_can_access_meeting,
)


def create_mock_user(role: str = "developer", user_id: str = None) -> MagicMock:
    """Create a mock user with specified role."""
    user = MagicMock()
    user.id = ObjectId(user_id) if user_id else ObjectId()
    user.role = role
    user.username = f"test_{role}"
    return user


def create_mock_project(project_id: str = None, members_ids: list = None) -> MagicMock:
    """Create a mock project with specified members."""
    project = MagicMock()
    project.id = ObjectId(project_id) if project_id else ObjectId()
    project.members_ids = members_ids or []
    project.name = "Test Project"
    return project


def create_mock_meeting(project_id: str = None) -> MagicMock:
    """Create a mock meeting with specified project."""
    meeting = MagicMock()
    meeting.id = ObjectId()
    meeting.project_id = ObjectId(project_id) if project_id else ObjectId()
    meeting.title = "Test Meeting"
    return meeting


@pytest.mark.asyncio
class TestGetUserAccessibleProjectIds:
    """Tests for get_user_accessible_project_ids function."""

    @patch("app.crud.crud_projects.get_projects_filtered")
    async def test_admin_gets_all_projects(self, mock_get_filtered):
        """Admin users should get all projects."""
        mock_db = AsyncMock()
        admin_user = create_mock_user(role="admin")

        # Create mock projects
        proj1 = create_mock_project()
        proj2 = create_mock_project()
        proj3 = create_mock_project()
        mock_get_filtered.return_value = [proj1, proj2, proj3]

        result = await get_user_accessible_project_ids(mock_db, admin_user)

        assert len(result) == 3
        assert str(proj1.id) in result
        assert str(proj2.id) in result
        assert str(proj3.id) in result
        mock_get_filtered.assert_awaited_once_with(mock_db)

    @patch("app.crud.crud_projects.get_projects_by_member")
    async def test_regular_user_gets_only_member_projects(self, mock_get_by_member):
        """Regular users should only get projects they are members of."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")

        # Create mock projects the user is member of
        proj1 = create_mock_project()
        proj2 = create_mock_project()
        mock_get_by_member.return_value = [proj1, proj2]

        result = await get_user_accessible_project_ids(mock_db, user)

        assert len(result) == 2
        assert str(proj1.id) in result
        assert str(proj2.id) in result
        mock_get_by_member.assert_awaited_once_with(mock_db, str(user.id))

    @patch("app.crud.crud_projects.get_projects_by_member")
    async def test_user_with_no_projects_gets_empty_list(self, mock_get_by_member):
        """Users with no project memberships should get empty list."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")

        mock_get_by_member.return_value = []

        result = await get_user_accessible_project_ids(mock_db, user)

        assert result == []
        mock_get_by_member.assert_awaited_once_with(mock_db, str(user.id))

    @patch("app.crud.crud_projects.get_projects_filtered")
    @patch("app.crud.crud_projects.get_projects_by_member")
    async def test_project_manager_treated_as_regular_user(
        self, mock_get_by_member, mock_get_filtered
    ):
        """Project managers should be treated as regular users (not admin)."""
        mock_db = AsyncMock()
        user = create_mock_user(role="project_manager")

        proj = create_mock_project()
        mock_get_by_member.return_value = [proj]

        result = await get_user_accessible_project_ids(mock_db, user)

        assert len(result) == 1
        mock_get_by_member.assert_awaited_once()
        # Ensure get_projects_filtered (admin path) was not called
        mock_get_filtered.assert_not_called()


@pytest.mark.asyncio
class TestUserCanAccessProject:
    """Tests for user_can_access_project function."""

    @patch("app.crud.crud_projects.get_project_by_id")
    async def test_admin_can_access_any_project(self, mock_get_project):
        """Admin users should be able to access any project."""
        mock_db = AsyncMock()
        admin_user = create_mock_user(role="admin")
        project_id = str(ObjectId())

        result = await user_can_access_project(mock_db, admin_user, project_id)

        assert result is True
        # Admin path should not query the database
        mock_get_project.assert_not_called()

    @patch("app.crud.crud_projects.get_project_by_id")
    async def test_member_can_access_their_project(self, mock_get_project):
        """Users who are project members should have access."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")
        project_id = str(ObjectId())

        # User is in members_ids
        project = create_mock_project(
            project_id=project_id,
            members_ids=[user.id, ObjectId()]
        )
        mock_get_project.return_value = project

        result = await user_can_access_project(mock_db, user, project_id)

        assert result is True
        mock_get_project.assert_awaited_once_with(mock_db, project_id)

    @patch("app.crud.crud_projects.get_project_by_id")
    async def test_non_member_cannot_access_project(self, mock_get_project):
        """Users who are not project members should be denied access."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")
        project_id = str(ObjectId())

        # User is NOT in members_ids
        other_user_id = ObjectId()
        project = create_mock_project(
            project_id=project_id,
            members_ids=[other_user_id]
        )
        mock_get_project.return_value = project

        result = await user_can_access_project(mock_db, user, project_id)

        assert result is False

    @patch("app.crud.crud_projects.get_project_by_id")
    async def test_access_nonexistent_project_returns_false(self, mock_get_project):
        """Accessing a non-existent project should return False."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")
        project_id = str(ObjectId())

        mock_get_project.return_value = None

        result = await user_can_access_project(mock_db, user, project_id)

        assert result is False

    @patch("app.crud.crud_projects.get_project_by_id")
    async def test_member_with_string_id_can_access(self, mock_get_project):
        """Test that string user IDs are properly compared."""
        mock_db = AsyncMock()
        user_id = str(ObjectId())
        user = create_mock_user(role="developer", user_id=user_id)
        project_id = str(ObjectId())

        # Members stored as ObjectIds
        project = create_mock_project(
            project_id=project_id,
            members_ids=[ObjectId(user_id)]
        )
        mock_get_project.return_value = project

        result = await user_can_access_project(mock_db, user, project_id)

        assert result is True


@pytest.mark.asyncio
class TestUserCanAccessMeeting:
    """Tests for user_can_access_meeting function."""

    @patch("app.core.permissions.user_can_access_project")
    async def test_admin_can_access_any_meeting(self, mock_project_access):
        """Admin users should be able to access any meeting."""
        mock_db = AsyncMock()
        admin_user = create_mock_user(role="admin")
        meeting = create_mock_meeting()

        result = await user_can_access_meeting(mock_db, admin_user, meeting)

        assert result is True
        # Admin path should not check project access
        mock_project_access.assert_not_called()

    @patch("app.core.permissions.user_can_access_project")
    async def test_member_can_access_meeting_in_their_project(self, mock_project_access):
        """Users with project access should be able to access meetings in that project."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")
        project_id = str(ObjectId())
        meeting = create_mock_meeting(project_id=project_id)

        mock_project_access.return_value = True

        result = await user_can_access_meeting(mock_db, user, meeting)

        assert result is True
        mock_project_access.assert_awaited_once_with(mock_db, user, project_id)

    @patch("app.core.permissions.user_can_access_project")
    async def test_non_member_cannot_access_meeting(self, mock_project_access):
        """Users without project access should be denied meeting access."""
        mock_db = AsyncMock()
        user = create_mock_user(role="developer")
        project_id = str(ObjectId())
        meeting = create_mock_meeting(project_id=project_id)

        mock_project_access.return_value = False

        result = await user_can_access_meeting(mock_db, user, meeting)

        assert result is False
        mock_project_access.assert_awaited_once_with(mock_db, user, project_id)

    @patch("app.core.permissions.user_can_access_project")
    async def test_meeting_access_delegates_to_project_access(self, mock_project_access):
        """Meeting access check should delegate to project access check."""
        mock_db = AsyncMock()
        user = create_mock_user(role="project_manager")
        project_id = str(ObjectId())
        meeting = create_mock_meeting(project_id=project_id)

        mock_project_access.return_value = True

        await user_can_access_meeting(mock_db, user, meeting)

        # Verify it called user_can_access_project with correct args
        mock_project_access.assert_awaited_once_with(mock_db, user, project_id)
